<?php

namespace App\EventListener;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Event\ExceptionEvent;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

class GlobalExceptionListener
{
    public function __construct(private readonly string $environment) {}

    public function onKernelException(ExceptionEvent $event): void
    {
        $exception = $event->getThrowable();

        $status  = $exception instanceof HttpExceptionInterface ? $exception->getStatusCode() : 500;
        $message = $exception instanceof HttpExceptionInterface || $this->environment === 'dev'
            ? $exception->getMessage()
            : 'An unexpected error occurred.';

        $body = [
            'error' => [
                'code'    => 'ERROR_' . $status,
                'message' => $message,
            ],
        ];

        if ($this->environment === 'dev') {
            $body['error']['trace'] = $exception->getTraceAsString();
        }

        $response = new JsonResponse($body, $status);

        if ($exception instanceof HttpExceptionInterface) {
            $response->headers->replace($exception->getHeaders());
        }

        $event->setResponse($response);
    }
}
