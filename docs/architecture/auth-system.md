# Auth System

The auth service is the entry point for authentication, authorization, and session management concerns in HEDGE.

When extending authentication behavior:

- Keep auth-specific code in `/apps/auth-service`.
- Reuse shared types and security utilities from `/packages` when available.
- Record major design changes as ADRs in `/docs/decision-records`.
