<?php

namespace App\Services;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;

class MlApi
{
    private function client(int $timeout = 60): PendingRequest
    {
        $token = config('services.ml_api.token');
        if (! is_string($token) || $token === '') {
            throw new HttpResponseException(response()->json(['message' => 'ML_API_SERVICE_TOKEN is not configured.'], 503));
        }

        return Http::baseUrl(rtrim(config('services.ml_api.url'), '/'))
            ->withHeader('X-Service-Token', $token)
            ->acceptJson()->connectTimeout(5)->timeout($timeout);
    }

    public function request(string $method, string $path, array $data = [], int $timeout = 60): array
    {
        try {
            $response = $this->client($timeout)->send($method, '/api/v1/'.$path, ['json' => $data]);
        } catch (ConnectionException $e) {
            throw new HttpResponseException(response()->json(['message' => 'The ML service is unavailable.'], 503));
        }

        return $this->result($response);
    }

    public function upload(UploadedFile $file, string $domain = 'movie'): array
    {
        $stream = fopen($file->getRealPath(), 'rb');
        try {
            $response = $this->client()->attach('file', $stream, $file->getClientOriginalName())
                ->timeout(300)->post('/api/v1/datasets', ['domain' => $domain]);
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
            $message = $this->errorMessage($detail) ?? 'The ML service rejected the request.';
            $status = in_array($response->status(), [404, 409, 413, 422, 503], true) ? $response->status() : 502;
            $payload = ['message' => $message, 'detail' => $detail, 'service_status' => $response->status()];
            if (is_array($detail)) {
                foreach (['code', 'tool_execution', 'needs_input'] as $key) {
                    if (array_key_exists($key, $detail)) {
                        $payload[$key] = $detail[$key];
                    }
                }
            }
            throw new HttpResponseException(response()->json($payload, $status));
        }

        $body = $response->json();
        if (! is_array($body)) {
            throw new HttpResponseException(response()->json(['message' => 'Invalid ML service response.'], 502));
        }

        return $body;
    }

    private function errorMessage(mixed $detail): ?string
    {
        if (is_string($detail) && trim($detail) !== '') {
            return trim($detail);
        }
        if (is_array($detail)) {
            if (is_string($detail['message'] ?? null) && trim($detail['message']) !== '') {
                return trim($detail['message']);
            }
            if (array_is_list($detail)) {
                $messages = array_filter(array_map(function ($issue) {
                    if (! is_array($issue) || ! is_string($issue['msg'] ?? null)) {
                        return null;
                    }
                    $path = implode('.', array_filter($issue['loc'] ?? [], 'is_string'));

                    return ($path !== '' ? $path.': ' : '').$issue['msg'];
                }, $detail));
                if ($messages) {
                    return implode(' ', $messages);
                }
            }
        }

        return null;
    }
}
