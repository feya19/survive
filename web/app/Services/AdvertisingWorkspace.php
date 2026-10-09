<?php

namespace App\Services;

class AdvertisingWorkspace
{
    public function __construct(private readonly MlApi $api)
    {
    }

    public function props(): array
    {
        $model = null;
        $modelError = null;

        try {
            $model = $this->api->request('GET', 'advertising/models/active/features');
        } catch (\Throwable $e) {
            $modelError = 'The advertising model is unavailable.';
        }

        return [
            'activeModel' => $model,
            'modelError' => $modelError,
        ];
    }
}
