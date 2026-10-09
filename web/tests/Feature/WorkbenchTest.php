<?php

namespace Tests\Feature;

use App\Models\Production;
use App\Models\ProductionDataset;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class WorkbenchTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.ml_api.url' => 'http://ml.test', 'services.ml_api.token' => 'test-token']);
    }

    public function test_workbench_requires_authentication(): void
    {
        $this->get('/dashboard')->assertRedirect('/login');
        $this->get('/upload')->assertRedirect('/login');
        $this->postJson('/workbench/productions', [])->assertUnauthorized();
    }

    public function test_dataset_upload_and_owner_boundary(): void
    {
        Http::fake(['ml.test/api/v1/datasets' => Http::response([
            'dataset_id' => '20f38614-bf99-4f41-b45b-861e3c30403a', 'filename' => 'films.csv',
            'row_count' => 12, 'column_count' => 3, 'status' => 'uploaded', 'version' => 1,
        ], 201)]);
        $owner = User::factory()->create();
        $production = Production::create(['user_id' => $owner->id, 'name' => 'Film A', 'base_features' => ['budget' => 1000, 'genre' => 'Drama']]);
        $this->actingAs($owner)->postJson("/workbench/productions/{$production->id}/datasets", [
            'file' => UploadedFile::fake()->createWithContent('films.csv', "budget,genre,revenue\n1000,Drama,2000\n"),
        ])->assertCreated();
        $dataset = ProductionDataset::firstOrFail();
        $this->assertSame($production->id, $dataset->production_id);
        Http::assertSent(fn ($request) => $request->hasHeader('X-Service-Token', 'test-token'));

        $other = User::factory()->create();
        $this->actingAs($other)->getJson("/workbench/datasets/{$dataset->id}")->assertNotFound();
        $this->actingAs($other)->postJson("/workbench/productions/{$production->id}/scenarios", [])->assertNotFound();
    }

    public function test_comparison_saves_two_real_predictions_and_model_version(): void
    {
        Http::fake(function ($request) {
            if (str_ends_with($request->url(), '/models/active')) {
                return Http::response(['id' => 'version-1', 'manifest' => ['feature_columns' => ['budget', 'genre']]]);
            }
            if (str_ends_with($request->url(), '/predictions/revenue')) {
                return Http::response(['model_version' => 'version-1', 'prediction_type' => 'point', 'predicted_revenue' => $request['budget'] * 2, 'currency' => null]);
            }
            return Http::response([], 404);
        });
        $user = User::factory()->create();
        $production = Production::create(['user_id' => $user->id, 'name' => 'Film B', 'base_features' => ['budget' => 1000, 'genre' => 'Drama']]);
        $this->actingAs($user)->postJson("/workbench/productions/{$production->id}/scenarios", [
            'name' => 'Higher budget', 'changed_features' => ['budget' => 1500, 'genre' => 'Drama'],
        ])->assertCreated()->assertJsonPath('base_prediction.predicted_revenue', 2000)
            ->assertJsonPath('changed_prediction.predicted_revenue', 3000)
            ->assertJsonPath('base_prediction.model_version', 'version-1');
        $this->assertCount(1, $production->scenarios);
        Http::assertSentCount(3);
    }

    public function test_failed_mapping_save_keeps_current_validated_version(): void
    {
        Http::fake(['ml.test/api/v1/datasets/*/mapping' => Http::response(['detail' => 'Invalid mapping'], 422)]);
        $user = User::factory()->create();
        $production = Production::create(['user_id' => $user->id, 'name' => 'Film C', 'base_features' => ['budget' => 1000, 'genre' => 'Drama']]);
        $dataset = $production->datasets()->create([
            'api_id' => '20f38614-bf99-4f41-b45b-861e3c30403a', 'filename' => 'films.csv',
            'size_bytes' => 100, 'row_count' => 12, 'column_count' => 3,
            'standardized_version_id' => '89a78f72-3297-4b64-b22c-91e3aca148ea',
        ]);
        $this->actingAs($user)->putJson("/workbench/datasets/{$dataset->id}/mapping", [
            'mappings' => [['source_column' => 'budget', 'target_column' => 'budget', 'transformation' => 'numeric']],
        ])->assertStatus(422);
        $this->assertNotNull($dataset->fresh()->standardized_version_id);
    }

    public function test_approved_dataset_can_validate_train_and_report_job_status(): void
    {
        Http::fake(function ($request) {
            $path = parse_url($request->url(), PHP_URL_PATH);
            return match (true) {
                str_ends_with($path, '/mapping') && $request->method() === 'PUT' => Http::response(['revision' => 1, 'approved' => false, 'mappings' => $request['mappings']]),
                str_ends_with($path, '/mapping/approve') => Http::response(['revision' => 1, 'approved' => true]),
                str_ends_with($path, '/validate') => Http::response(['standardized_version_id' => '89a78f72-3297-4b64-b22c-91e3aca148ea', 'valid_rows' => 12, 'invalid_rows' => 0, 'validation_status' => 'passed']),
                str_ends_with($path, '/training/jobs') => Http::response(['job_id' => '9437179d-ceaa-4a1d-8b3d-713c99ce9e85', 'status' => 'queued'], 202),
                str_ends_with($path, '/training/jobs/9437179d-ceaa-4a1d-8b3d-713c99ce9e85') => Http::response(['job_id' => '9437179d-ceaa-4a1d-8b3d-713c99ce9e85', 'status' => 'completed', 'model_version_id' => '44d4b475-16fd-4f33-b67b-2d3d97b0ff5c', 'metrics' => ['mae' => 42, 'rmse' => 57], 'error' => null]),
                default => Http::response([], 404),
            };
        });
        $user = User::factory()->create();
        $production = Production::create(['user_id' => $user->id, 'name' => 'Film D', 'base_features' => ['budget' => 1000, 'genre' => 'Drama']]);
        $dataset = $production->datasets()->create(['api_id' => '20f38614-bf99-4f41-b45b-861e3c30403a', 'filename' => 'films.csv', 'size_bytes' => 100, 'row_count' => 12, 'column_count' => 3]);
        $this->actingAs($user)->putJson("/workbench/datasets/{$dataset->id}/mapping", [
            'mappings' => [['source_column' => 'budget', 'target_column' => 'budget', 'transformation' => 'numeric']],
        ])->assertOk();
        $this->actingAs($user)->postJson("/workbench/datasets/{$dataset->id}/train")->assertUnprocessable();
        $this->actingAs($user)->postJson("/workbench/datasets/{$dataset->id}/approve")->assertOk();
        $this->actingAs($user)->postJson("/workbench/datasets/{$dataset->id}/validate")->assertOk();
        $this->actingAs($user)->postJson("/workbench/datasets/{$dataset->id}/train")->assertStatus(202);
        $job = $dataset->jobs()->firstOrFail();
        $this->actingAs($user)->getJson("/workbench/jobs/{$job->id}")->assertOk()->assertJsonPath('status', 'completed')->assertJsonPath('metrics.mae', 42);
        $this->assertSame('completed', $job->fresh()->last_status);
    }

    public function test_signed_in_user_can_explicitly_promote_model(): void
    {
        Http::fake(['ml.test/api/v1/models/*/promote' => Http::response(['id' => '44d4b475-16fd-4f33-b67b-2d3d97b0ff5c', 'status' => 'active'])]);
        $user = User::factory()->create();
        $this->actingAs($user)->postJson('/workbench/models/44d4b475-16fd-4f33-b67b-2d3d97b0ff5c/promote', ['approved' => true])
            ->assertOk()->assertJsonPath('status', 'active');
        Http::assertSent(fn ($request) => $request['approved'] === true && str_contains($request['approved_by'], $user->email));
    }
}
