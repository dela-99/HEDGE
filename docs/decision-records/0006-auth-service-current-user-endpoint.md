# 0006 — Auth service current user endpoint

## Context

The auth service needs a simple way for authenticated clients to fetch the current user's safe profile after login or token refresh.

## Decision

Add a protected `GET /auth/me` endpoint that reads the authenticated JWT payload and resolves the user through `UsersService`.

The endpoint returns the safe user projection already used elsewhere in the service so password hashes and other sensitive fields never leave the auth boundary.

## Alternatives considered

- Returning the raw JWT payload: rejected because clients should receive canonical user data from persistence.
- Adding a separate profile module: rejected because the requirement is small and already fits the auth module boundary.
- Reusing the login response only: rejected because clients need a stable endpoint for session-aware user lookup.

## Consequences

- Clients have a dedicated current-user endpoint.
- The auth module stays modular while reusing the existing user lookup and validation logic.
- Sensitive fields remain internal to authentication flows.
