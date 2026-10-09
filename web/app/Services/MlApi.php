<?php

namespace App\Services;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;

class MlApi
{
    private function client(): PendingRequest
    {
        $token = config('services.ml_api.token');
        if (! is_string($token) || $token === '') {
            throw new HttpResponseException(response()->json(['message' => 'ML_API_SERVICE_TOKEN is not configured.'], 503));
        }

        return Http::baseUrl(rtrim(config('services.ml_api.url'), '/'))
            ->withHeader('X-Service-Token', $token)
            ->acceptJson()->connectTimeout(5)->timeout(60);
    }

    public function request(string $method, string $path, array $data = []): array
    {
        try {
            $response = $this->client()->send($method, '/api/v1/'.$path, ['json' => $data]);
        } catch (ConnectionException $e) {
            throw new HttpResponseException(response()->json(['message' => 'The ML service is unavailable.'], 503));
        }

        return $this->result($response);
    }

    public function upload(UploadedFile $file): array
    {
        $stream = fopen($file->getRealPath(), 'rb');
        try {
            $response = $this->client()->attach('file', $stream, $file->getClientOriginalName())
                ->timeout(300)->post('/api/v1/datasets');
        } catch (ConnectionException $e) {
            throw new HttpResponseException(response()->json(['message' => 'The ML service is unavailable.'], 503));
        } finally {
            fclose($stream);
        }

        return $this->result($response);
    }

    private function result($response): array
    {
        if ($response->failed()) {
            $detail = $response->json('detail');
            $message = is_string($detail) ? $detail : 'The ML service rejected the request.';
            $status = in_array($response->status(), [404, 409, 413, 422, 503], true) ? $response->status() : 502;
            throw new HttpResponseException(response()->json(['message' => $message, 'detail' => $detail], $status));
        }

        $body = $response->json();
        if (! is_array($body)) {
            throw new HttpResponseException(response()->json(['message' => 'Invalid ML service response.'], 502));
        }

        return $body;
    }
}
