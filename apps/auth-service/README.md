# auth-service

NestJS authentication service for HEDGE.

## Stack

- NestJS
- Prisma ORM
- PostgreSQL
- Redis
- JWT + Passport
- Argon2
- Docker

## Structure

- `src/auth`
- `src/users`
- `src/sessions`
- `src/audit`
- `src/common`
- `src/config`
- `src/database`
- `src/prisma`

## Commands

- `npm run start:dev`
- `npm run build`
- `npm run prisma:generate`

## Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

## Environment

Copy `.env.example` to `.env` and provide the required runtime variables before starting the service.
