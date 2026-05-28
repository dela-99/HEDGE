# 0005 — Auth service users module boundary

## Context

The auth service needs a lightweight persistence layer for users without mixing in authentication, sessions, or audit orchestration concerns.

## Decision

Keep the Users module focused on user persistence only:

- create users with a Prisma `Role` default
- fetch users by email or id
- maintain a minimal `updateLastLogin()` hook for future login tracking
- expose a single read endpoint for user retrieval

The module returns safe user data for normal reads and keeps password hashes internal to authentication flows.

## Alternatives considered

- Putting password verification in UsersService: rejected because authentication belongs in the auth module.
- Adding admin and mutation endpoints now: rejected because the current requirement is a stable persistence foundation, not a full user management API.
- Skipping the users module entirely and querying Prisma from auth flows: rejected because it would spread persistence concerns across the service.

## Consequences

- User persistence stays isolated and easy to reason about.
- Auth flows keep control over credential verification and token issuance.
- Future user features can build on a narrow, predictable service surface.
