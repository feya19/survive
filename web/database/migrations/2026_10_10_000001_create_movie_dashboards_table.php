<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('movie_dashboards', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name', 160);
            $table->uuid('dataset_api_id')->nullable();
            $table->json('spec');
            $table->json('sources');
            $table->json('provenance')->nullable();
            $table->timestamp('saved_at')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'saved_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('movie_dashboards');
    }
};
