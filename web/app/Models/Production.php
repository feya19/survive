<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Production extends Model
{
    protected $fillable = ['user_id', 'name', 'base_features'];

    protected function casts(): array
    {
        return ['base_features' => 'array'];
    }

    public function datasets()
    {
        return $this->hasMany(ProductionDataset::class);
    }

    public function scenarios()
    {
        return $this->hasMany(ProductionScenario::class);
    }
}
