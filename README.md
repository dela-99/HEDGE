# fintech-secure-app

fintech-secure-app is a professional fintech monorepo for secure application delivery, shared platform code, and operational docs.

## Structure

- `apps/` — deployable applications and services
- `apps/auth-service` — authentication and identity service
- `apps/user-service` — user profile and account services
- `apps/payment-service` — payment processing surface
- `apps/mobile-app` — mobile client
- `packages/` — shared libraries, configs, and utilities
- `docs/` — architecture, security, onboarding, and compliance documentation
- `infrastructure/` — deployment, runtime, and platform assets

## Getting Started

Review `docs/architecture/overall-design.md` and `docs/architecture/auth-system.md` before changing auth flows.

## Principles

- Keep services isolated and reusable.
- Prefer shared packages for cross-cutting concerns.
- Keep documentation current with architecture changes.
- Treat security and compliance as first-class concerns.
