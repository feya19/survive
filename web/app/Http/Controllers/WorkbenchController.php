<?php

namespace App\Http\Controllers;

use App\Models\Production;
use App\Models\ProductionDataset;
use App\Models\ProductionTrainingJob;
use App\Services\MlApi;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class WorkbenchController extends Controller
{
    private const DOMAIN_CONFIG = [
        'movie' => [
            'features' => ['budget', 'genre'],
            'fields' => ['budget', 'genre', 'release_date', 'revenue', 'audience'],
            'numeric_fields' => ['budget', 'revenue', 'audience'],
            'date_fields' => ['release_date'],
            'categorical_fields' => ['genre'],
            'required_base_fields' => ['budget', 'genre'],
            'model_type' => 'lgbm_revenue',
            'label' => 'Movie',
            'plan_label' => 'Production',
        ],
        'advertising' => [
            'features' => ['ad_spend', 'date', 'platform', 'campaign_type', 'industry', 'country'],
            'fields' => ['ad_spend', 'date', 'platform', 'campaign_type', 'industry', 'country', 'revenue'],
            'numeric_fields' => ['ad_spend', 'revenue'],
            'date_fields' => ['date'],
            'categorical_fields' => ['platform', 'campaign_type', 'industry', 'country'],
            'required_base_fields' => ['ad_spend', 'date', 'platform', 'campaign_type', 'industry', 'country'],
            'model_type' => 'lgbm_advertising_revenue',
            'label' => 'Advertising',
            'plan_label' => 'Campaign',
        ],
    ];
    private const OPERATIONS = ['none', 'numeric', 'date', 'categorical', 'exclude'];

    public function index(Request $request, MlApi $api)
    {
        $domain = $request->query('domain', 'advertising') === 'movie' ? 'movie' : 'advertising';
        $productions = Production::where('user_id', $request->user()->id)->where('domain', $domain)
            ->with('datasets.jobs')->latest()->get();
        $selected = $productions->firstWhere('id', (int) $request->query('production')) ?? $productions->first();
        $active = null;
        $models = [];
        $apiError = null;
        $fieldOptions = [];
        try {
            $models = $api->request('GET', 'models?domain='.$domain);
            $active = collect($models)->firstWhere('status', 'active');
        } catch (\Throwable $e) {
            $apiError = 'The ML service is unavailable or not configured.';
        }
        try {
            $metadataPath = $domain === 'advertising' ? 'advertising/models/active/features' : 'models/active/features';
            $metadata = $api->request('GET', $metadataPath);
            if ($domain === 'movie') {
                $fieldOptions['genre'] = $metadata['features']['genres']['options'] ?? [];
            } else {
                foreach (self::DOMAIN_CONFIG[$domain]['categorical_fields'] as $field) {
                    $fieldOptions[$field] = $metadata['features'][$field]['options'] ?? [];
                }
            }
        } catch (\Throwable $e) {
            $apiError ??= 'The active model vocabulary is unavailable.';
        }
        $domainConfig = self::DOMAIN_CONFIG[$domain];
        $domainConfig['field_options'] = $fieldOptions;

        return Inertia::render('Workbench', [
            'productions' => $productions,
            'selectedProductionId' => $selected?->id,
            'models' => $models,
            'activeModel' => $active,
            'apiError' => $apiError,
            'maxUploadMb' => config('services.ml_api.max_upload_mb'),
            'domain' => $domain,
            'domainConfig' => $domainConfig,
        ]);
    }

    private function production(Request $request, int $id): Production
    {
        return Production::where('user_id', $request->user()->id)->findOrFail($id);
    }

    private function dataset(Request $request, int $id): ProductionDataset
    {
        return ProductionDataset::whereHas('production', fn ($q) => $q->where('user_id', $request->user()->id))->findOrFail($id);
    }

    private function features(array $input, array $required, string $domain): array
    {
        $config = self::DOMAIN_CONFIG[$domain];
        $values = [];
        foreach ($required as $field) {
            if (! in_array($field, $config['features'], true)) {
                throw ValidationException::withMessages(['features' => 'The active model uses an unsupported feature: '.$field]);
            }
            $value = $input[$field] ?? null;
            if (in_array($field, $config['numeric_fields'], true)) {
                if (! is_numeric($value) || (float) $value < 0) {
                    throw ValidationException::withMessages([$field => ucfirst(str_replace('_', ' ', $field)).' must be a nonnegative number.']);
                }
                $values[$field] = (float) $value;
            } elseif (in_array($field, $config['date_fields'], true)) {
                $date = is_string($value) ? \DateTimeImmutable::createFromFormat('!Y-m-d', $value) : false;
                if (! $date || $date->format('Y-m-d') !== $value) {
                    throw ValidationException::withMessages([$field => ucfirst(str_replace('_', ' ', $field)).' must use YYYY-MM-DD.']);
                }
                $values[$field] = $value;
            } else {
                if (! is_string($value) || trim($value) === '') {
                    throw ValidationException::withMessages([$field => ucfirst(str_replace('_', ' ', $field)).' is required.']);
                }
                $values[$field] = trim($value);
            }
        }

        return $values;
    }

    public function storeProduction(Request $request)
    {
        $data = $request->validate([
            'domain' => ['required', Rule::in(array_keys(self::DOMAIN_CONFIG))],
            'name' => ['required', 'string', 'max:255'],
            'base_features' => ['required', 'array'],
        ]);
        $config = self::DOMAIN_CONFIG[$data['domain']];
        $provided = array_keys(array_filter($data['base_features'], fn ($value) => $value !== null && $value !== ''));
        $required = array_values(array_unique([...$config['required_base_fields'], ...$provided]));
        $production = Production::create([
            'user_id' => $request->user()->id,
            'domain' => $data['domain'],
            'name' => $data['name'],
            'base_features' => $this->features($data['base_features'], $required, $data['domain']),
        ]);

        return response()->json($production, 201);
    }

    public function updateProduction(Request $request, int $id)
    {
        $production = $this->production($request, $id);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'base_features' => ['required', 'array'],
        ]);
        $config = self::DOMAIN_CONFIG[$production->domain];
        $provided = array_keys(array_filter($data['base_features'], fn ($value) => $value !== null && $value !== ''));
        $required = array_values(array_unique([...$config['required_base_fields'], ...$provided]));
        $production->update([
            'name' => $data['name'],
            'base_features' => $this->features($data['base_features'], $required, $production->domain),
        ]);

        return response()->json($production);
    }

    public function upload(Request $request, int $id, MlApi $api)
    {
        $production = $this->production($request, $id);
        $max = max(200, (int) (config('services.ml_api.max_upload_mb') ?: 200));
        $request->validate(
            ['file' => ['required', 'file', 'extensions:csv,xlsx', 'max:'.($max * 1024)]],
            ['file.max' => "Choose a CSV or XLSX file no larger than {$max} MB."]
        );
        $file = $request->file('file');
        $uploaded = $api->upload($file, $production->domain);
        $dataset = $production->datasets()->create([
            'api_id' => $uploaded['dataset_id'],
            'filename' => $uploaded['filename'],
            'size_bytes' => $file->getSize(),
            'row_count' => $uploaded['row_count'],
            'column_count' => $uploaded['column_count'],
        ]);

        return response()->json($dataset, 201);
    }

    public function datasetDetails(Request $request, int $id, MlApi $api)
    {
        $dataset = $this->dataset($request, $id);
        $prefix = 'datasets/'.$dataset->api_id;
        $profile = $api->request('GET', $prefix.'/profile');
        try {
            $mapping = $api->request('GET', $prefix.'/mapping');
        } catch (\Illuminate\Http\Exceptions\HttpResponseException $e) {
            if ($e->getResponse()->getStatusCode() !== 404) {
                throw $e;
            }
            $mapping = null;
        }
        return response()->json(['dataset' => $dataset, 'profile' => $profile, 'mapping' => $mapping]);
    }

    public function suggest(Request $request, int $id, MlApi $api)
    {
        $dataset = $this->dataset($request, $id);
        return response()->json($api->request('POST', 'datasets/'.$dataset->api_id.'/mapping/suggest'));
    }

    public function saveMapping(Request $request, int $id, MlApi $api)
    {
        $dataset = $this->dataset($request, $id);
        $config = self::DOMAIN_CONFIG[$dataset->production->domain];
        $data = $request->validate([
            'mappings' => ['required', 'array'],
            'mappings.*.source_column' => ['required', 'string'],
            'mappings.*.target_column' => ['required', 'string', Rule::in($config['fields'])],
            'mappings.*.transformation' => ['required', 'string', 'in:'.implode(',', self::OPERATIONS)],
        ]);
        $result = $api->request('PUT', 'datasets/'.$dataset->api_id.'/mapping', $data);
        $dataset->update(['standardized_version_id' => null, 'validation_report' => null]);
        return response()->json($result);
    }

    public function validateDataset(Request $request, int $id, MlApi $api)
    {
        $dataset = $this->dataset($request, $id);
        $result = $api->request('POST', 'datasets/'.$dataset->api_id.'/validate');
        $dataset->update(['standardized_version_id' => $result['standardized_version_id'], 'validation_report' => $result]);
        return response()->json($result);
    }

    public function train(Request $request, int $id, MlApi $api)
    {
        $dataset = $this->dataset($request, $id);
        if (! $dataset->standardized_version_id) {
            throw ValidationException::withMessages(['dataset' => 'Validate the dataset first.']);
        }
        $result = $api->request('POST', 'training/jobs', [
            'dataset_version_id' => $dataset->standardized_version_id,
            'model_type' => self::DOMAIN_CONFIG[$dataset->production->domain]['model_type'],
            'target' => 'revenue',
        ]);
        $job = $dataset->jobs()->create(['api_id' => $result['job_id'], 'last_status' => $result['status']]);
        return response()->json($job, 202);
    }

    public function job(Request $request, int $id, MlApi $api)
    {
        $job = ProductionTrainingJob::whereHas('dataset.production', fn ($q) => $q->where('user_id', $request->user()->id))->findOrFail($id);
        $result = $api->request('GET', 'training/jobs/'.$job->api_id);
        $job->update(['last_status' => $result['status']]);
        return response()->json($result);
    }

    public function deploy(Request $request, string $id, string $action, MlApi $api)
    {
        abort_unless(Str::isUuid($id) && in_array($action, ['promote', 'rollback'], true), 404);
        $request->validate(['approved' => ['required', 'accepted']]);
        return response()->json($api->request('POST', 'models/'.$id.'/'.$action, [
            'approved' => true,
            'approved_by' => $request->user()->name.' <'.$request->user()->email.'>',
        ]));
    }

}
