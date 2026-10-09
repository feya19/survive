<?php

namespace Tests\Feature;

use App\Models\MovieDashboard;
use App\Models\Production;
use App\Models\ProductionDataset;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class MovieDashboardTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.ml_api.url' => 'http://ml.test', 'services.ml_api.token' => 'test-token']);
    }

    private function modelMetadata(): array
    {
        return [
            'model_version' => 'model-v7',
            'domain' => 'movie',
            'model_type' => 'lgbm_revenue',
            'currency' => 'USD',
            'prediction_targets' => ['revenue'],
            'prediction_type' => 'point',
            'features' => [
                'budget' => ['type' => 'number', 'required' => true, 'currency' => 'USD'],
                'genres' => ['type' => 'multi_categorical', 'required' => true, 'multiple' => true, 'options' => ['Action', 'Comedy']],
            ],
            'evaluation_metrics' => ['mae' => 1250000],
            'limitations' => ['Revenue is a model estimate.'],
        ];
    }

    public function test_movie_dashboard_and_production_workbench_are_separate_authenticated_pages(): void
    {
        Http::fake(['ml.test/api/v1/models/active/features' => Http::response($this->modelMetadata())]);
        $this->get('/dashboard')->assertRedirect('/login');
        $user = User::factory()->create();
        $this->actingAs($user)->get('/dashboard')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('MovieDashboard')->has('activeModel')->has('datasets')->has('savedDashboards')->has('dashboardTemplates'));
        $this->actingAs($user)->get('/workbench')->assertInertia(fn (Assert $page) => $page->component('Workbench'));
        $this->get('/scenario-lab')->assertInertia(fn (Assert $page) => $page->component('MovieDashboard'));
    }

    public function test_prediction_uses_the_active_model_and_usd_multi_genre_contract(): void
    {
        Http::fake(function ($request) {
            if (str_ends_with($request->url(), '/models/active/features')) {
                return Http::response($this->modelMetadata());
            }
            if (str_ends_with($request->url(), '/predictions/movie/revenue')) {
                return Http::response([
                    'model_version' => 'model-v7',
                    'model_type' => 'lgbm_revenue',
                    'inputs' => ['budget' => 2000000, 'genres' => ['Action', 'Comedy'], 'currency' => 'USD'],
                    'prediction' => ['revenue' => 4250000],
                    'currency' => 'USD',
                ]);
            }
            return Http::response([], 404);
        });
        $user = User::factory()->create();

        $this->actingAs($user)->postJson('/movie/predictions', [
            'budget' => 2000000,
            'genres' => ['Action', 'Comedy'],
        ])->assertOk()->assertJsonPath('prediction.revenue', 4250000)->assertJsonPath('model_version', 'model-v7');

        Http::assertSent(fn ($request) => str_ends_with($request->url(), '/predictions/movie/revenue')
            && $request->hasHeader('X-Service-Token', 'test-token')
            && (float) $request['budget'] === 2000000.0
            && $request['genres'] === ['Action', 'Comedy']
            && $request['currency'] === 'USD');
    }

    public function test_dashboard_generation_saves_verified_snapshot_and_owner_can_reopen_it(): void
    {
        $resultId = 'f191395b-66f7-4bb0-a733-ec3345af80d2';
        $datasetApiId = '20f38614-bf99-4f41-b45b-861e3c30403a';
        Http::fake([
            'ml.test/api/v1/dashboard/templates/budget_scenario_comparison' => Http::response([
                'id' => 'budget_scenario_comparison',
                'title' => 'Budget Scenario Comparison',
                'description' => 'Compare baseline and modified budget predictions.',
                'widgets' => [['type' => 'bar_chart', 'title' => 'Predicted revenue by scenario']],
            ]),
            'ml.test/api/v1/dashboard/generate' => Http::response([
                'answer' => 'Historical average revenue is available by genre.',
                'dashboard_spec' => [
                    'title' => 'Revenue by genre',
                    'domain' => 'movie',
                    'description' => 'Verified historical averages.',
                    'widgets' => [[
                        'id' => 'genre-revenue', 'type' => 'bar_chart', 'title' => 'Average revenue by genre',
                        'data_ref' => $resultId, 'x_field' => 'genre', 'y_field' => 'average_revenue',
                        'display_format' => 'currency', 'width' => 12, 'height' => 4, 'x' => 0, 'y' => 0,
                    ]],
                ],
                'tool_execution' => ['results' => [[
                    'ok' => true,
                    'tool' => 'query_movie_analytics',
                    'data' => [
                        'result_id' => $resultId,
                        'dataset_id' => $datasetApiId,
                        'dataset_version_id' => 'standardized-v3',
                        'currency' => 'USD',
                        'row_count' => 1,
                        'dashboard_data' => [
                            'fields' => ['genre', 'average_revenue'],
                            'rows' => [['genre' => 'Action', 'average_revenue' => 9000000]],
                        ],
                    ],
                ]]],
            ]),
        ]);
        $user = User::factory()->create();
        $production = Production::create(['user_id' => $user->id, 'name' => 'Movie A', 'base_features' => ['budget' => 2000000, 'genre' => 'Action']]);
        $dataset = $production->datasets()->create([
            'api_id' => $datasetApiId, 'filename' => 'movies.csv', 'size_bytes' => 100,
            'row_count' => 10, 'column_count' => 3, 'standardized_version_id' => '0f1ea0fc-a561-4ea2-bb61-5472555587ca',
        ]);

        $response = $this->actingAs($user)->postJson('/movie/dashboards/generate', [
            'message' => 'Compare average historical revenue by genre.',
            'dataset_id' => $dataset->id,
            'template_id' => 'budget_scenario_comparison',
        ])->assertCreated()->assertJsonPath('dashboard.spec.title', 'Revenue by genre');
        $dashboardId = $response->json('dashboard.id');
        $this->assertSame(1, MovieDashboard::count());
        $this->assertDatabaseHas('movie_dashboards', [
            'id' => $dashboardId,
            'template_id' => 'budget_scenario_comparison',
            'request_prompt' => 'Compare average historical revenue by genre.',
        ]);

        Http::assertSent(fn ($request) => str_ends_with($request->url(), '/dashboard/generate')
            && $request['dataset_id'] === $datasetApiId
            && str_contains($request['message'], 'Use this approved dashboard template'));

        $saved = $this->actingAs($user)->postJson('/movie/dashboards/'.$dashboardId.'/save', ['name' => 'Genre revenue'])->assertOk()
            ->assertJsonPath('sources.'.$resultId.'.rows.0.average_revenue', 9000000);
        $this->assertIsString($saved->json('saved_at'));
        $this->postJson('/movie/dashboards/'.$dashboardId.'/refresh')->assertOk()
            ->assertJsonPath('dashboard.id', $dashboardId)
            ->assertJsonPath('dashboard.saved_at', $saved->json('saved_at'))
            ->assertJsonPath('dashboard.sources.'.$resultId.'.metadata.dataset_version_id', 'standardized-v3');
        $this->getJson('/movie/dashboards/'.$dashboardId)->assertOk()->assertJsonPath('name', 'Genre revenue');

        $other = User::factory()->create();
        $this->actingAs($other)->getJson('/movie/dashboards/'.$dashboardId)->assertNotFound();
    }

    public function test_dashboard_generation_rejects_unvalidated_or_foreign_datasets(): void
    {
        Http::fake();
        $owner = User::factory()->create();
        $production = Production::create(['user_id' => $owner->id, 'name' => 'Movie B', 'base_features' => ['budget' => 1000, 'genre' => 'Drama']]);
        $dataset = $production->datasets()->create([
            'api_id' => '20f38614-bf99-4f41-b45b-861e3c30403a', 'filename' => 'raw.csv',
            'size_bytes' => 20, 'row_count' => 1, 'column_count' => 3,
        ]);
        $this->actingAs($owner)->postJson('/movie/dashboards/generate', ['message' => 'Make a chart', 'dataset_id' => $dataset->id])->assertUnprocessable();

        $other = User::factory()->create();
        $this->actingAs($other)->postJson('/movie/dashboards/generate', ['message' => 'Make a chart', 'dataset_id' => $dataset->id])->assertNotFound();
        Http::assertNothingSent();
    }

    public function test_chat_uses_owner_selected_dataset_and_server_validated_prediction_context(): void
    {
        $datasetApiId = '20f38614-bf99-4f41-b45b-861e3c30403a';
        Http::fake(['ml.test/api/v1/chat' => Http::response([
            'answer' => 'The active model returned a point estimate.',
            'tool_execution' => ['mode' => 'instructor_json', 'results' => []],
            'needs_input' => false,
            'dashboard_spec' => null,
            'dashboard_error' => null,
        ])]);
        $user = User::factory()->create();
        $production = Production::create(['user_id' => $user->id, 'name' => 'Movie C', 'base_features' => ['budget' => 2000000, 'genre' => 'Action']]);
        $dataset = $production->datasets()->create([
            'api_id' => $datasetApiId, 'filename' => 'history.csv', 'size_bytes' => 80,
            'row_count' => 4, 'column_count' => 3, 'standardized_version_id' => '0f1ea0fc-a561-4ea2-bb61-5472555587ca',
        ]);

        $this->actingAs($user)->postJson('/movie/chat', [
            'message' => 'What happens if this budget is reduced by 20 percent?',
            'conversation' => [['role' => 'user', 'content' => 'Show a forecast.']],
            'dataset_id' => $dataset->id,
            'scenario_context' => ['budget' => 2000000, 'genres' => ['Action', 'Comedy']],
        ])->assertOk()->assertJsonPath('answer', 'The active model returned a point estimate.');

        Http::assertSent(fn ($request) => str_ends_with($request->url(), '/chat')
            && $request->hasHeader('X-Service-Token', 'test-token')
            && $request['dataset_id'] === $datasetApiId
            && (float) $request['scenario_context']['budget'] === 2000000.0
            && $request['scenario_context']['currency'] === 'USD'
            && $request['conversation'][0]['role'] === 'user');
    }

    public function test_only_a_successful_matching_active_model_prediction_is_attached_to_ai_chat(): void
    {
        Http::fake(function ($request) {
            if (str_ends_with($request->url(), '/models/active/features')) {
                return Http::response($this->modelMetadata());
            }
            if (str_ends_with($request->url(), '/predictions/movie/revenue')) {
                return Http::response([
                    'model_version' => 'model-v7', 'model_type' => 'lgbm_revenue', 'currency' => 'USD',
                    'inputs' => ['budget' => 2000000, 'genres' => ['Action'], 'currency' => 'USD'],
                    'prediction' => ['revenue' => 4250000],
                ]);
            }
            if (str_ends_with($request->url(), '/chat')) {
                return Http::response(['answer' => 'Verified model estimate.', 'tool_execution' => ['results' => []]]);
            }

            return Http::response([], 404);
        });
        $user = User::factory()->create();
        $this->actingAs($user)->postJson('/movie/predictions', [
            'budget' => 2000000, 'genres' => ['Action'],
        ])->assertOk();

        $this->actingAs($user)->postJson('/movie/chat', [
            'message' => 'Explain this prediction.',
            'scenario_context' => ['budget' => 2000000, 'genres' => ['Action']],
        ])->assertOk();

        Http::assertSent(fn ($request) => str_ends_with($request->url(), '/chat')
            && $request['current_prediction']['model_version'] === 'model-v7'
            && $request['current_prediction']['predicted_revenue'] === 4250000.0
            && $request['current_prediction']['inputs']['budget'] === 2000000.0);

    }
}
