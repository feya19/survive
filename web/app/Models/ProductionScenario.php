<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductionScenario extends Model
{
    protected $fillable = ['production_id', 'name', 'base_features', 'changed_features', 'base_prediction', 'changed_prediction'];

    protected function casts(): array
    {
        return ['base_features' => 'array', 'changed_features' => 'array', 'base_prediction' => 'array', 'changed_prediction' => 'array'];
    }
}
