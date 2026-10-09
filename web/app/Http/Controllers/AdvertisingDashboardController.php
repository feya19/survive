<?php

namespace App\Http\Controllers;

use App\Models\ProductionDataset;
use App\Services\MlApi;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AdvertisingDashboardController extends Controller
{
    public function predict(Request $request, MlApi $api)
    {
        $payload = $this->validatedCampaign($request, $api);

        return response()->json($api->request('POST', 'predictions/advertising/revenue', $payload));
    }

    public function scenario(Request $request, MlApi $api)
    {
        $payload = $this->validatedCampaign($request, $api);
        $change = $request->validate([
            'spend_change_percent' => ['required', 'numeric', 'between:-100,1000'],
        ]);

        return response()->json($api->request('POST', 'scenarios/advertising/spend', [
            ...$payload,
            'spend_change_percent' => (float) $change['spend_change_percent'],
        ]));
    }

    public function generate(Request $request, MlApi $api)
    {
        $data = $request->validate([
            'template_id' => ['required', Rule::in(['executive', 'channel_mix', 'industry'])],
            'dataset_id' => ['required', 'integer'],
            'perspective' => ['sometimes', Rule::in(['business', 'technical'])],
        ]);
        $perspective = $data['perspective'] ?? 'business';
        $dataset = ProductionDataset::whereHas('production', fn ($query) => $query
            ->where('user_id', $request->user()->id)
            ->where('domain', 'advertising'))
            ->whereNotNull('standardized_version_id')
            ->findOrFail($data['dataset_id']);
        $templates = [
            'executive' => [
                'title' => 'Executive overview',
                'description' => 'Channel, industry, and spend overview.',
                'operations' => ['average_revenue_by_platform', 'average_revenue_by_industry', 'spend_revenue_scatter'],
            ],
            'channel_mix' => [
                'title' => 'Channel mix',
                'description' => 'Platform and campaign type comparison.',
                'operations' => ['average_revenue_by_platform', 'average_revenue_by_campaign_type', 'spend_revenue_scatter'],
            ],
            'industry' => [
                'title' => 'Industry benchmark',
                'description' => 'Industry revenue with channel context.',
                'operations' => ['average_revenue_by_industry', 'average_revenue_by_platform', 'spend_revenue_scatter'],
            ],
        ];
        $template = $templates[$data['template_id']];
        $sources = [];
        foreach ($template['operations'] as $operation) {
            $sources[$operation] = $api->request('POST', 'analytics/advertising/query', [
                'operation' => $operation,
                'dataset_id' => $dataset->api_id,
            ]);
        }
        $first = reset($sources);

        return response()->json([
            'dashboard' => [
                'id' => (string) Str::uuid(),
                'domain' => 'advertising',
                'title' => $template['title'],
                'description' => $template['description'],
                'template_id' => $data['template_id'],
                'perspective' => $perspective,
                'insight' => $this->dashboardInsight($sources, $perspective),
                'operations' => $template['operations'],
                'sources' => $sources,
                'provenance' => [
                    'dataset_version_id' => $first['dataset_version_id'] ?? null,
                    'record_count' => $first['row_count'] ?? null,
                    'currency' => $first['currency'] ?? null,
                ],
                'generated_at' => now()->toIso8601String(),
            ],
        ], 201);
    }

    private function dashboardInsight(array $sources, string $perspective): string
    {
        $first = reset($sources) ?: [];
        $recordCount = (int) ($first['row_count'] ?? 0);
        $datasetVersion = $first['dataset_version_id'] ?? 'unavailable';

        if ($perspective === 'technical') {
            $groupCounts = [];
            foreach ($sources as $operation => $source) {
                if ($operation !== 'spend_revenue_scatter') {
                    $groupCounts[] = count($source['rows'] ?? []).' '.str_replace('average_revenue_by_', '', $operation).' groups';
                }
            }
            $scatterCount = count($sources['spend_revenue_scatter']['rows'] ?? []);

            return 'Analytics processed '.$recordCount.' usable campaign records from dataset version '.$datasetVersion.'. '
                .'Grouped result sizes: '.implode('; ', $groupCounts).'. The spend and revenue scatter uses '.$scatterCount.' sampled records.';
        }

        $dimensions = [
            'average_revenue_by_platform' => 'platform',
            'average_revenue_by_campaign_type' => 'campaign type',
            'average_revenue_by_industry' => 'industry',
        ];
        $findings = [];
        foreach ($dimensions as $operation => $label) {
            $rows = $sources[$operation]['rows'] ?? [];
            if (! $rows) {
                continue;
            }
            $leader = collect($rows)->sortByDesc('average_revenue')->first();
            if (! is_array($leader) || ! is_numeric($leader['average_revenue'] ?? null)) {
                continue;
            }
            $category = match ($operation) {
                'average_revenue_by_platform' => 'platform',
                'average_revenue_by_campaign_type' => 'campaign_type',
                default => 'industry',
            };
            $findings[] = 'highest average revenue by '.$label.' was '.$leader[$category]
                .' ($'.number_format((float) $leader['average_revenue'], 0).' across '
                .number_format((int) ($leader['campaign_count'] ?? 0)).' campaigns)';
        }

        if (! $findings) {
            return 'The validated dataset returned '.$recordCount.' usable campaign records, but no grouped revenue rows were available for a business summary.';
        }

        return 'Across '.$recordCount.' usable historical campaign records, '.implode('; ', $findings)
            .'. These are historical averages and do not estimate the causal effect of changing spend.';
    }

    private function validatedCampaign(Request $request, MlApi $api): array
    {
        $metadata = $api->request('GET', 'advertising/models/active/features');
        $features = $metadata['features'] ?? [];
        $rules = [
            'ad_spend' => ['required', 'numeric', 'min:0'],
            'campaign_date' => ['required', 'date_format:Y-m-d'],
        ];
        foreach (['platform', 'campaign_type', 'industry', 'country'] as $field) {
            $options = $features[$field]['options'] ?? [];
            $rules[$field] = ['required', 'string', Rule::in($options)];
        }
        $data = $request->validate($rules);

        return [
            'ad_spend' => (float) $data['ad_spend'],
            'campaign_date' => $data['campaign_date'],
            'platform' => $data['platform'],
            'campaign_type' => $data['campaign_type'],
            'industry' => $data['industry'],
            'country' => $data['country'],
            'currency' => 'USD',
        ];
    }
}
