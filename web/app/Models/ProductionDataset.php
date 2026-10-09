<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductionDataset extends Model
{
    protected $fillable = ['production_id', 'api_id', 'filename', 'size_bytes', 'row_count', 'column_count', 'standardized_version_id', 'validation_report'];

    protected function casts(): array
    {
        return ['validation_report' => 'array'];
    }

    public function production()
    {
        return $this->belongsTo(Production::class);
    }

    public function jobs()
    {
        return $this->hasMany(ProductionTrainingJob::class);
    }
}
