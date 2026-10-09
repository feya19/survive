<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MovieDashboard extends Model
{
    protected $table = 'movie_dashboards';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = ['id', 'user_id', 'name', 'dataset_api_id', 'spec', 'sources', 'provenance', 'request_prompt', 'scenario_context', 'template_id', 'saved_at'];

    protected function casts(): array
    {
        return [
            'spec' => 'array',
            'sources' => 'array',
            'provenance' => 'array',
            'scenario_context' => 'array',
            'saved_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
