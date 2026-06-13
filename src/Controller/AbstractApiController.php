<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;

abstract class AbstractApiController extends AbstractController
{
    protected function success(mixed $data, int $status = 200): JsonResponse
    {
        return $this->json(['data' => $data], $status);
    }

    protected function created(mixed $data): JsonResponse
    {
        return $this->success($data, 201);
    }

    protected function noContent(): JsonResponse
    {
        return new JsonResponse(null, 204);
    }

    protected function error(string $message, int $status = 400, ?string $code = null): JsonResponse
    {
        return $this->json([
            'error' => [
                'code'    => $code ?? 'ERROR_' . $status,
                'message' => $message,
            ],
        ], $status);
    }
}
