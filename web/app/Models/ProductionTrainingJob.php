<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductionTrainingJob extends Model
{
    protected $fillable = ['production_dataset_id', 'api_id', 'last_status'];

    public function dataset()
    {
        return $this->belongsTo(ProductionDataset::class, 'production_dataset_id');
    }
}
