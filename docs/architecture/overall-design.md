# Overall Design

HEDGE is organized as a service-oriented monorepo:

- `/apps/auth-service` contains authentication and identity flows.
- `/apps/user-service` contains user profile and account management logic.
- `/apps/payment-service` contains payment processing logic.
- `/apps/mobile-app` contains the client application.
- `/packages` stores shared utilities, types, and security helpers.
- `/infrastructure` is reserved for deployment and platform configuration.

All cross-cutting architecture notes and implementation decisions belong in `/docs`.
