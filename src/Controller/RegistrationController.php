<?php

namespace App\Controller;

use App\DTO\RegistrationRequest;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Validator\Validator\ValidatorInterface;

class RegistrationController extends AbstractApiController
{
    #[Route('/register', name: 'api_register', methods: ['POST'])]
    public function register(
        Request $request,
        ValidatorInterface $validator,
        UserPasswordHasherInterface $hasher,
        EntityManagerInterface $em,
    ): JsonResponse {
        $data = json_decode($request->getContent(), true) ?? [];

        $dto = new RegistrationRequest();
        $dto->email    = $data['email'] ?? '';
        $dto->username = $data['username'] ?? '';
        $dto->password = $data['password'] ?? '';

        $violations = $validator->validate($dto);
        if (count($violations) > 0) {
            $errors = [];
            foreach ($violations as $v) {
                $errors[$v->getPropertyPath()] = $v->getMessage();
            }
            return $this->json(['error' => ['code' => 'VALIDATION_ERROR', 'message' => 'Validation failed.', 'details' => $errors]], 422);
        }

        $existing = $em->getRepository(User::class)->findOneBy(['email' => $dto->email])
            ?? $em->getRepository(User::class)->findOneBy(['username' => $dto->username]);

        if ($existing !== null) {
            return $this->json(['error' => ['code' => 'ERROR_409', 'message' => 'This account already exists.']], 409);
        }

        $user = new User();
        $user->setEmail($dto->email);
        $user->setUsername($dto->username);
        $user->setPassword($hasher->hashPassword($user, $dto->password));
        $user->setRoles([]);
        $user->setCreatedAt(new \DateTimeImmutable());

        $em->persist($user);
        $em->flush();

        return $this->created($this->normalizeUser($user));
    }

    private function normalizeUser(User $user): array
    {
        return [
            'id'        => $user->getId(),
            'email'     => $user->getEmail(),
            'username'  => $user->getUsername(),
            'createdAt' => $user->getCreatedAt()?->format(\DateTimeInterface::ATOM),
        ];
    }
}
