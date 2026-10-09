<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\MovieDashboardController;
use App\Http\Controllers\WorkbenchController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', [MovieDashboardController::class, 'index'])->name('dashboard');
    Route::get('/scenario-lab', function () {
        return Inertia::render('ScenarioDashboard');
    })->name('scenario-lab');
    Route::get('/workbench', [WorkbenchController::class, 'index'])->name('workbench');
    Route::get('/upload', [WorkbenchController::class, 'index'])->name('upload');
    Route::post('/movie/predictions', [MovieDashboardController::class, 'predict']);
    Route::post('/movie/chat', [MovieDashboardController::class, 'chat']);
    Route::post('/movie/dashboards/generate', [MovieDashboardController::class, 'generate']);
    Route::post('/movie/dashboards/{id}/refresh', [MovieDashboardController::class, 'refresh']);
    Route::post('/movie/dashboards/{id}/save', [MovieDashboardController::class, 'save']);
    Route::get('/movie/dashboards/{id}', [MovieDashboardController::class, 'show']);
    Route::delete('/movie/dashboards/{id}', [MovieDashboardController::class, 'destroy']);
    Route::post('/workbench/productions', [WorkbenchController::class, 'storeProduction']);
    Route::put('/workbench/productions/{id}', [WorkbenchController::class, 'updateProduction']);
    Route::post('/workbench/productions/{id}/datasets', [WorkbenchController::class, 'upload']);
    Route::post('/workbench/productions/{id}/scenarios', [WorkbenchController::class, 'compare']);
    Route::get('/workbench/datasets/{id}', [WorkbenchController::class, 'datasetDetails']);
    Route::post('/workbench/datasets/{id}/suggest', [WorkbenchController::class, 'suggest']);
    Route::put('/workbench/datasets/{id}/mapping', [WorkbenchController::class, 'saveMapping']);
    Route::post('/workbench/datasets/{id}/approve', [WorkbenchController::class, 'approve']);
    Route::post('/workbench/datasets/{id}/validate', [WorkbenchController::class, 'validateDataset']);
    Route::post('/workbench/datasets/{id}/train', [WorkbenchController::class, 'train']);
    Route::get('/workbench/jobs/{id}', [WorkbenchController::class, 'job']);
    Route::post('/workbench/models/{id}/{action}', [WorkbenchController::class, 'deploy']);
});

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
