<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('productions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->json('base_features');
            $table->timestamps();
        });

        Schema::create('production_datasets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('production_id')->constrained()->cascadeOnDelete();
            $table->uuid('api_id')->unique();
            $table->string('filename');
            $table->unsignedBigInteger('size_bytes');
            $table->unsignedBigInteger('row_count');
            $table->unsignedInteger('column_count');
            $table->uuid('standardized_version_id')->nullable();
            $table->json('validation_report')->nullable();
            $table->timestamps();
        });

        Schema::create('production_training_jobs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('production_dataset_id')->constrained()->cascadeOnDelete();
            $table->uuid('api_id')->unique();
            $table->string('last_status');
            $table->timestamps();
        });

        Schema::create('production_scenarios', function (Blueprint $table) {
            $table->id();
            $table->foreignId('production_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->json('base_features');
            $table->json('changed_features');
            $table->json('base_prediction');
            $table->json('changed_prediction');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('production_scenarios');
        Schema::dropIfExists('production_training_jobs');
        Schema::dropIfExists('production_datasets');
        Schema::dropIfExists('productions');
    }
};
