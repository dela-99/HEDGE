# HEDGE

HEDGE is a fintech monorepo organized around a secure auth service, shared packages, and service-specific documentation.

## Layout

- `apps/auth-service` — NestJS authentication and identity service
- `apps/user-service` — user profile and account services
- `apps/payment-service` — payment processing surface
- `apps/mobile-app` — mobile client
- `packages` — shared types, config, logging, security, and utilities
- `infrastructure` — deployment and platform assets
- `docs` — architecture, security, onboarding, and compliance docs
- `scripts` — repository automation helpers

Start with `docs/architecture/overall-design.md` and `docs/architecture/auth-system.md` before changing auth flows.
