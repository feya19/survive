<?php

namespace App\Http\Controllers;

use App\Models\Production;
use App\Models\ProductionDataset;
use App\Models\ProductionTrainingJob;
use App\Services\MlApi;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class WorkbenchController extends Controller
{
    private const FEATURES = ['budget', 'genre', 'planned_duration', 'marketing_budget'];
    private const FIELDS = ['budget', 'genre', 'planned_duration', 'release_date', 'marketing_budget', 'revenue', 'audience'];
    private const OPERATIONS = ['none', 'numeric', 'date', 'categorical', 'exclude'];

    public function index(Request $request, MlApi $api)
    {
        $productions = Production::where('user_id', $request->user()->id)
            ->with(['datasets.jobs', 'scenarios'])->latest()->get();
        $selected = $productions->firstWhere('id', (int) $request->query('production')) ?? $productions->first();
        $active = null;
        $models = [];
        $apiError = null;
        try {
            $models = $api->request('GET', 'models');
            $active = collect($models)->firstWhere('status', 'active');
        } catch (\Throwable $e) {
            $apiError = 'The ML service is unavailable or not configured.';
        }

        return Inertia::render('Workbench', [
            'productions' => $productions,
            'selectedProductionId' => $selected?->id,
            'models' => $models,
            'activeModel' => $active,
            'apiError' => $apiError,
            'maxUploadMb' => config('services.ml_api.max_upload_mb'),
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

    private function features(array $input, array $required): array
    {
        $values = [];
        foreach ($required as $field) {
            if (! in_array($field, self::FEATURES, true)) {
                throw ValidationException::withMessages(['features' => 'The active model uses an unsupported feature: '.$field]);
            }
            $value = $input[$field] ?? null;
            if ($field === 'genre') {
                if (! is_string($value) || trim($value) === '') {
                    throw ValidationException::withMessages(['genre' => 'Genre is required.']);
                }
                $values[$field] = trim($value);
            } else {
                if (! is_numeric($value) || (float) $value < 0) {
                    throw ValidationException::withMessages([$field => ucfirst(str_replace('_', ' ', $field)).' must be a nonnegative number.']);
                }
                $values[$field] = (float) $value;
            }
        }

        return $values;
    }

    public function storeProduction(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'base_features' => ['required', 'array'],
            'base_features.budget' => ['required', 'numeric', 'min:0'],
            'base_features.genre' => ['required', 'string', 'max:255'],
            'base_features.planned_duration' => ['nullable', 'numeric', 'min:0'],
            'base_features.marketing_budget' => ['nullable', 'numeric', 'min:0'],
        ]);
        $production = Production::create([
            'user_id' => $request->user()->id,
            'name' => $data['name'],
            'base_features' => $this->features($data['base_features'], array_keys(array_filter($data['base_features'], fn ($v) => $v !== null && $v !== ''))),
        ]);

        return response()->json($production, 201);
    }

    public function updateProduction(Request $request, int $id)
    {
        $production = $this->production($request, $id);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'base_features' => ['required', 'array'],
            'base_features.budget' => ['required', 'numeric', 'min:0'],
            'base_features.genre' => ['required', 'string', 'max:255'],
            'base_features.planned_duration' => ['nullable', 'numeric', 'min:0'],
            'base_features.marketing_budget' => ['nullable', 'numeric', 'min:0'],
        ]);
        $production->update([
            'name' => $data['name'],
            'base_features' => $this->features($data['base_features'], array_keys(array_filter($data['base_features'], fn ($v) => $v !== null && $v !== ''))),
        ]);

        return response()->json($production);
    }

    public function upload(Request $request, int $id, MlApi $api)
    {
        $production = $this->production($request, $id);
        $max = (int) config('services.ml_api.max_upload_mb');
        $request->validate(['file' => ['required', 'file', 'extensions:csv,xlsx', 'max:'.($max * 1024)]]);
        $file = $request->file('file');
        $uploaded = $api->upload($file);
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
        $data = $request->validate([
            'mappings' => ['required', 'array'],
            'mappings.*.source_column' => ['required', 'string'],
            'mappings.*.target_column' => ['required', 'string', 'in:'.implode(',', self::FIELDS)],
            'mappings.*.transformation' => ['required', 'string', 'in:'.implode(',', self::OPERATIONS)],
        ]);
        $result = $api->request('PUT', 'datasets/'.$dataset->api_id.'/mapping', $data);
        $dataset->update(['standardized_version_id' => null, 'validation_report' => null]);
        return response()->json($result);
    }

    public function approve(Request $request, int $id, MlApi $api)
    {
        $dataset = $this->dataset($request, $id);
        return response()->json($api->request('POST', 'datasets/'.$dataset->api_id.'/mapping/approve'));
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
            throw ValidationException::withMessages(['dataset' => 'Approve and validate the dataset first.']);
        }
        $result = $api->request('POST', 'training/jobs', [
            'dataset_version_id' => $dataset->standardized_version_id,
            'model_type' => 'lgbm_revenue',
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

    public function compare(Request $request, int $id, MlApi $api)
    {
        $production = $this->production($request, $id);
        $data = $request->validate(['name' => ['required', 'string', 'max:255'], 'changed_features' => ['required', 'array']]);
        $active = $api->request('GET', 'models/active');
        $required = $active['manifest']['feature_columns'] ?? [];
        if (! is_array($required) || $required === []) {
            throw ValidationException::withMessages(['model' => 'The active model has no valid inference contract.']);
        }
        $base = $this->features($production->base_features, $required);
        $changed = $this->features($data['changed_features'], $required);
        $basePrediction = $api->request('POST', 'predictions/revenue', $base);
        $changedPrediction = $api->request('POST', 'predictions/revenue', $changed);
        if (($basePrediction['model_version'] ?? null) !== ($changedPrediction['model_version'] ?? null)) {
            throw ValidationException::withMessages(['model' => 'The active model changed during comparison. Please retry.']);
        }
        $scenario = $production->scenarios()->create([
            'name' => $data['name'],
            'base_features' => $base,
            'changed_features' => $changed,
            'base_prediction' => $basePrediction,
            'changed_prediction' => $changedPrediction,
        ]);
        return response()->json($scenario, 201);
    }
}
