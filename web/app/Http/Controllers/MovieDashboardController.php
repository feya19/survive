<?php

namespace App\Http\Controllers;

use App\Models\MovieDashboard;
use App\Models\ProductionDataset;
use App\Services\AdvertisingWorkspace;
use App\Services\MlApi;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class MovieDashboardController extends Controller
{
    public function index(Request $request, MlApi $api, AdvertisingWorkspace $advertising)
    {
        $defaultDomain = $request->routeIs('scenario-lab') ? 'movie' : 'advertising';
        $domain = $request->query('domain', $defaultDomain);
        if ($domain !== 'movie') {
            $datasets = ProductionDataset::whereHas('production', fn ($query) => $query
                ->where('user_id', $request->user()->id)
                ->where('domain', 'advertising'))
                ->with('production:id,name')->latest()->get()
                ->map(fn (ProductionDataset $dataset) => [
                    'id' => $dataset->id,
                    'filename' => $dataset->filename,
                    'production_name' => $dataset->production?->name,
                    'row_count' => $dataset->row_count,
                    'ready_for_analytics' => $dataset->standardized_version_id !== null,
                ])->values();
            return Inertia::render('AdvertisingWorkspace', [
                ...$advertising->props(),
                'datasets' => $datasets,
            ]);
        }

        $model = null;
        $modelError = null;
        try {
            $model = $api->request('GET', 'models/active/features');
        } catch (\Throwable $e) {
            $modelError = 'The active movie model is unavailable. Prediction and AI tools may need a trained model.';
        }

        try {
            $templates = $api->request('GET', 'dashboard/templates');
        } catch (\Throwable $e) {
            $templates = [];
        }

        $datasets = ProductionDataset::whereHas('production', fn ($query) => $query->where('user_id', $request->user()->id)->where('domain', 'movie'))
            ->with('production:id,name')->latest()->get()
            ->map(fn (ProductionDataset $dataset) => [
                'id' => $dataset->id,
                'filename' => $dataset->filename,
                'production_name' => $dataset->production?->name,
                'row_count' => $dataset->row_count,
                'ready_for_analytics' => $dataset->standardized_version_id !== null,
            ])->values();

        $savedDashboards = MovieDashboard::where('user_id', $request->user()->id)
            ->whereNotNull('saved_at')->latest('saved_at')->get()
            ->map(fn (MovieDashboard $dashboard) => [
                'id' => $dashboard->id,
                'name' => $dashboard->name,
                'title' => $dashboard->spec['title'] ?? $dashboard->name,
                'created_at' => $dashboard->created_at,
                'saved_at' => $dashboard->saved_at,
                'provenance' => $dashboard->provenance,
            ])->values();

        return Inertia::render('MovieDashboard', [
            'datasets' => $datasets,
            'savedDashboards' => $savedDashboards,
            'dashboardTemplates' => array_values(array_filter($templates, 'is_array')),
            'activeModel' => $model,
            'modelError' => $modelError,
        ]);
    }

    public function predict(Request $request, MlApi $api)
    {
        $data = $request->validate([
            'budget' => ['required', 'numeric', 'min:0'],
            'genres' => ['required', 'array', 'min:1', 'max:16'],
            'genres.*' => ['required', 'string', 'max:80'],
        ]);
        $genres = array_map(fn ($genre) => trim($genre), $data['genres']);
        if (in_array('', $genres, true) || count(array_unique(array_map('mb_strtolower', $genres))) !== count($genres)) {
            throw ValidationException::withMessages(['genres' => 'Choose one or more distinct genres.']);
        }

        $payload = [
            'budget' => (float) $data['budget'],
            'genres' => $genres,
            'currency' => 'USD',
        ];

        $result = $api->request('POST', 'predictions/movie/revenue', $payload);
        $revenue = $result['prediction']['revenue'] ?? $result['predicted_revenue'] ?? null;
        if (is_numeric($revenue) && is_string($result['model_version'] ?? null) && ($result['currency'] ?? null) === 'USD') {
            $request->session()->put('movie_dashboard.current_prediction', [
                'inputs' => $payload,
                'model_version' => $result['model_version'],
                'model_type' => $result['model_type'] ?? 'unknown',
                'prediction_type' => 'point',
                'currency' => 'USD',
                'predicted_revenue' => (float) $revenue,
            ]);
        } else {
            $request->session()->forget('movie_dashboard.current_prediction');
        }

        return response()->json($result);
    }

    public function scenario(Request $request, MlApi $api)
    {
        $data = $request->validate([
            'budget' => ['required', 'numeric', 'min:0'],
            'genres' => ['required', 'array', 'min:1', 'max:16'],
            'genres.*' => ['required', 'string', 'max:80'],
            'budget_change_percent' => ['required', 'numeric', 'between:-100,1000'],
        ]);
        $genres = array_map(fn ($genre) => trim($genre), $data['genres']);
        if (in_array('', $genres, true) || count(array_unique(array_map('mb_strtolower', $genres))) !== count($genres)) {
            throw ValidationException::withMessages(['genres' => 'Choose one or more distinct genres.']);
        }

        $result = $api->request('POST', 'scenarios/movie/budget', [
            'budget' => (float) $data['budget'],
            'genres' => $genres,
            'currency' => 'USD',
            'budget_change_percent' => (float) $data['budget_change_percent'],
        ]);

        return response()->json($result);
    }

    public function chat(Request $request, MlApi $api)
    {
        $data = $request->validate([
            'message' => ['required', 'string', 'min:1', 'max:4000'],
            'conversation' => ['sometimes', 'array', 'max:12'],
            'conversation.*.role' => ['required', 'in:user,assistant'],
            'conversation.*.content' => ['required', 'string', 'min:1', 'max:4000'],
            'dataset_id' => ['nullable', 'integer'],
            'scenario_context' => ['nullable', 'array'],
            'scenario_context.budget' => ['required_with:scenario_context', 'numeric', 'min:0'],
            'scenario_context.genres' => ['required_with:scenario_context', 'array', 'min:1', 'max:16'],
            'scenario_context.genres.*' => ['required', 'string', 'max:80'],
        ]);

        $dataset = isset($data['dataset_id']) ? $this->authorizedDataset($request, $data['dataset_id'], false) : null;
        $body = [
            'message' => $data['message'],
            'conversation' => $data['conversation'] ?? [],
            'scenario_context' => $this->scenarioContext($data['scenario_context'] ?? null),
            'dataset_id' => $dataset?->api_id,
            'current_prediction' => $this->verifiedPrediction($request, $api, $data['scenario_context'] ?? null),
        ];
        $result = $api->request('POST', 'chat', $body, 180);
        if (is_array($result['dashboard_spec'] ?? null)) {
            $result['dashboard'] = $this->storeDraft(
                $request,
                $result['dashboard_spec'],
                $result['tool_execution']['results'] ?? [],
                $dataset?->api_id,
                $data['message'],
                $data['scenario_context'] ?? null,
            );
        }

        return response()->json($result);
    }

    public function generate(Request $request, MlApi $api)
    {
        $data = $request->validate([
            'dataset_id' => ['required', 'integer'],
            'template_id' => ['required', 'string', 'max:80'],
            'perspective' => ['sometimes', 'in:business,technical'],
            'scenario_context' => ['nullable', 'array'],
            'scenario_context.budget' => ['required_with:scenario_context', 'numeric', 'min:0'],
            'scenario_context.genres' => ['required_with:scenario_context', 'array', 'min:1', 'max:16'],
            'scenario_context.genres.*' => ['required', 'string', 'max:80'],
        ]);
        $dataset = $this->authorizedDataset($request, $data['dataset_id'], true);
        $scenario = $data['scenario_context'] ?? null;
        $perspective = $data['perspective'] ?? 'business';
        $template = $this->dashboardTemplate($api, $data['template_id'] ?? null);
        $result = $api->request('POST', 'dashboard/generate', [
            'message' => $this->dashboardPrompt($template, $perspective),
            'dataset_id' => $dataset->api_id,
            'scenario_context' => $this->scenarioContext($scenario),
            'current_prediction' => $this->verifiedPrediction($request, $api, $scenario),
        ], 180);
        $dashboard = $this->storeDraft(
            $request,
            $result['dashboard_spec'] ?? null,
            $result['tool_execution']['results'] ?? [],
            $dataset->api_id,
            $template['description'] ?? $template['title'] ?? 'Movie dashboard template',
            $scenario,
            $template['id'] ?? null,
            null,
            $perspective,
            $result['answer'] ?? null,
        );

        return response()->json(['answer' => $result['answer'] ?? '', 'dashboard' => $dashboard], 201);
    }

    public function refresh(Request $request, MlApi $api, string $id)
    {
        $dashboard = MovieDashboard::where('user_id', $request->user()->id)->findOrFail($id);
        $dataset = ProductionDataset::where('api_id', $dashboard->dataset_api_id)
            ->whereHas('production', fn ($query) => $query->where('user_id', $request->user()->id))
            ->whereNotNull('standardized_version_id')->firstOrFail();
        $prompt = $dashboard->request_prompt ?: ($dashboard->spec['title'] ?? $dashboard->name);
        $scenario = $dashboard->scenario_context;
        $template = $this->dashboardTemplate($api, $dashboard->template_id);
        $result = $api->request('POST', 'dashboard/generate', [
            'message' => $this->dashboardPrompt($template, $dashboard->perspective ?? 'business'),
            'dataset_id' => $dataset->api_id,
            'scenario_context' => $this->scenarioContext($scenario),
            'current_prediction' => $this->verifiedPrediction($request, $api, $scenario),
        ], 180);
        $updated = $this->storeDraft(
            $request,
            $result['dashboard_spec'] ?? null,
            $result['tool_execution']['results'] ?? [],
            $dataset->api_id,
            $prompt,
            $scenario,
            $dashboard->template_id,
            $dashboard,
            $dashboard->perspective ?? 'business',
            $result['answer'] ?? null,
        );

        return response()->json(['answer' => $result['answer'] ?? '', 'dashboard' => $updated]);
    }

    public function save(Request $request, string $id)
    {
        $data = $request->validate(['name' => ['required', 'string', 'min:1', 'max:160']]);
        $dashboard = MovieDashboard::where('user_id', $request->user()->id)
            ->whereNull('saved_at')->findOrFail($id);
        $dashboard->update(['name' => trim($data['name']), 'saved_at' => now()]);

        return response()->json($dashboard->fresh());
    }

    public function show(Request $request, string $id)
    {
        return response()->json(MovieDashboard::where('user_id', $request->user()->id)
            ->whereNotNull('saved_at')->findOrFail($id));
    }

    public function destroy(Request $request, string $id)
    {
        $dashboard = MovieDashboard::where('user_id', $request->user()->id)
            ->whereNotNull('saved_at')->findOrFail($id);
        $dashboard->delete();

        return response()->noContent();
    }

    private function authorizedDataset(Request $request, int $id, bool $requireValidated): ProductionDataset
    {
        $dataset = ProductionDataset::whereHas('production', fn ($query) => $query->where('user_id', $request->user()->id))
            ->findOrFail($id);
        if ($requireValidated && ! $dataset->standardized_version_id) {
            throw ValidationException::withMessages(['dataset_id' => 'Select a dataset that has been validated in the production workbench.']);
        }

        return $dataset;
    }

    private function scenarioContext(?array $context): ?array
    {
        if ($context === null) {
            return null;
        }
        $result = [
            'budget' => (float) $context['budget'],
            'genres' => array_values($context['genres']),
            'currency' => 'USD',
        ];
        return $result;
    }

    private function verifiedPrediction(Request $request, MlApi $api, ?array $scenario): ?array
    {
        if (! $scenario) {
            return null;
        }
        $prediction = $request->session()->get('movie_dashboard.current_prediction');
        if (! is_array($prediction) || ! is_array($prediction['inputs'] ?? null)) {
            return null;
        }
        $normalize = function (array $inputs): array {
            $normalized = [
                'budget' => (float) ($inputs['budget'] ?? 0),
                'genres' => array_values($inputs['genres'] ?? []),
                'currency' => 'USD',
            ];
            return $normalized;
        };
        if ($normalize($prediction['inputs']) !== $normalize($scenario)) {
            return null;
        }

        try {
            $activeModel = $api->request('GET', 'models/active/features');
        } catch (\Throwable $e) {
            return null;
        }
        if (($activeModel['model_version'] ?? null) !== ($prediction['model_version'] ?? null)) {
            return null;
        }

        return [
            'model_version' => $prediction['model_version'],
            'model_type' => $prediction['model_type'],
            'prediction_type' => 'point',
            'currency' => 'USD',
            'inputs' => $normalize($prediction['inputs']),
            'predicted_revenue' => (float) $prediction['predicted_revenue'],
        ];
    }

    private function dashboardTemplate(MlApi $api, ?string $templateId): ?array
    {
        return $templateId ? $api->request('GET', 'dashboard/templates/'.rawurlencode($templateId)) : null;
    }

    private function dashboardPrompt(?array $template, string $perspective = 'business'): string
    {
        if (! $template) {
            abort(422, 'Select an available dashboard template.');
        }
        $widgets = array_map(fn ($widget) => [
            'type' => $widget['type'] ?? null,
            'title' => $widget['title'] ?? null,
        ], is_array($template['widgets'] ?? null) ? $template['widgets'] : []);

        $audience = $perspective === 'technical'
            ? 'Build for a technical audience. Prefer concise dataset and model provenance, source coverage, fields, operations, and accurately labeled analytical outputs. Avoid unsupported performance claims.'
            : 'Build for producers and business decision makers. Use plain language, surface the main historical revenue patterns, and make the insight useful for planning without technical jargon.';

        return $audience.' Use this dashboard template as layout guidance, while using only tools and fields available in verified results. Template: '
            .($template['title'] ?? 'Movie dashboard').'. Description: '.($template['description'] ?? '').'. Suggested widgets: '
            .json_encode($widgets, JSON_UNESCAPED_SLASHES);
    }

    private function storeDraft(
        Request $request,
        mixed $spec,
        array $toolResults,
        ?string $datasetId,
        string $requestPrompt,
        ?array $scenarioContext = null,
        ?string $templateId = null,
        ?MovieDashboard $existing = null,
        string $perspective = 'business',
        ?string $insight = null,
    ): array
    {
        if (! is_array($spec) || ($spec['domain'] ?? null) !== 'movie' || ! is_string($spec['title'] ?? null)
            || ! is_array($spec['widgets'] ?? null) || count($spec['widgets']) < 1 || count($spec['widgets']) > 12) {
            abort(502, 'The ML service returned an invalid dashboard specification.');
        }

        $sources = [];
        foreach ($toolResults as $result) {
            $data = $result['data'] ?? null;
            $view = is_array($data) ? ($data['dashboard_data'] ?? null) : null;
            $resultId = is_array($data) ? ($data['result_id'] ?? null) : null;
            if (($result['ok'] ?? false) !== true || ! is_array($view) || ! is_string($resultId) || ! Str::isUuid($resultId)) {
                continue;
            }
            $fields = $view['fields'] ?? null;
            $rows = $view['rows'] ?? null;
            if (! is_array($fields) || ! $fields || ! is_array($rows) || count($rows) > 500) {
                continue;
            }
            $fields = array_values(array_unique(array_filter($fields, 'is_string')));
            if (count($fields) !== count($view['fields'])) {
                continue;
            }
            $validRows = true;
            foreach ($rows as $row) {
                if (! is_array($row) || array_diff(array_keys($row), $fields) || array_diff($fields, array_keys($row))) {
                    $validRows = false;
                    break;
                }
            }
            if (! $validRows) {
                continue;
            }

            $metadata = [];
            foreach (['dataset_id', 'dataset_version_id', 'model_version', 'model_type', 'currency', 'operation', 'row_count', 'prediction_type'] as $key) {
                if (array_key_exists($key, $data)) {
                    $metadata[$key] = $data[$key];
                }
            }
            $sources[$resultId] = [
                'result_id' => $resultId,
                'tool' => is_string($result['tool'] ?? null) ? $result['tool'] : 'verified_result',
                'fields' => $fields,
                'rows' => $rows,
                'metadata' => $metadata,
            ];
        }

        foreach ($spec['widgets'] as $widget) {
            if (! is_array($widget) || ! is_string($widget['data_ref'] ?? null)
                || ! isset($sources[$widget['data_ref']]) || ! is_string($widget['type'] ?? null)) {
                abort(502, 'A dashboard widget referenced a result that was not produced by this request.');
            }
            $fields = $sources[$widget['data_ref']]['fields'];
            $references = array_filter([
                $widget['x_field'] ?? null,
                $widget['y_field'] ?? null,
                $widget['metric_field'] ?? null,
                ...($widget['series_fields'] ?? []),
                ...($widget['table_fields'] ?? []),
                ...array_map(fn ($filter) => is_array($filter) ? ($filter['field'] ?? null) : null, $widget['filters'] ?? []),
            ], 'is_string');
            if (array_diff($references, $fields)) {
                abort(502, 'A dashboard widget referenced a field that is not present in verified results.');
            }
        }

        if (! $sources) {
            abort(502, 'The ML service returned no renderable dashboard data.');
        }
        if (strlen(json_encode($sources, JSON_THROW_ON_ERROR)) > 2_000_000) {
            abort(413, 'The dashboard data snapshot is too large to save.');
        }

        $modelVersions = [];
        $datasetVersions = [];
        foreach ($sources as $source) {
            $modelVersion = $source['metadata']['model_version'] ?? null;
            $datasetVersion = $source['metadata']['dataset_version_id'] ?? null;
            if (is_string($modelVersion)) {
                $modelVersions[] = $modelVersion;
            }
            if (is_string($datasetVersion)) {
                $datasetVersions[] = $datasetVersion;
            }
        }
        $provenance = [
            'dataset_api_id' => $datasetId,
            'dataset_version_ids' => array_values(array_unique($datasetVersions)),
            'model_versions' => array_values(array_unique($modelVersions)),
        ];

        $attributes = [
            'user_id' => $request->user()->id,
            'name' => $existing?->name ?? mb_substr($spec['title'], 0, 160),
            'dataset_api_id' => $datasetId,
            'spec' => $spec,
            'sources' => $sources,
            'provenance' => $provenance,
            'request_prompt' => $requestPrompt,
            'scenario_context' => $this->scenarioContext($scenarioContext),
            'template_id' => $templateId,
            'perspective' => $perspective,
            'insight' => $insight,
        ];
        if ($existing) {
            $existing->update($attributes);
            $dashboard = $existing->fresh();
        } else {
            $dashboard = MovieDashboard::create([
                'id' => (string) Str::uuid(),
                ...$attributes,
            ]);
        }

        return $dashboard->toArray();
    }
}
