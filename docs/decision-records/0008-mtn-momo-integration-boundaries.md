# 0008 — MTN MoMo integration boundaries

## Context

The auth service needed a dedicated NestJS integration point for MTN MoMo communication, authentication, and webhook receipt without pulling transaction creation or reconciliation logic into the module.

## Decision

Add a standalone `MtnMomoModule` under `apps/auth-service/src/mtn-momo` with a service for MTN API/auth requests and a controller for the webhook entrypoint.

Keep the module boundary strict: no transaction creation, reconciliation, or analytics logic lives here.

## Alternatives considered

- Folding MTN support into the existing auth module: rejected to keep the boundary explicit.
- Adding business workflow logic to the MTN module: rejected because it would couple transport concerns to transaction processing.
- Deferring webhook handling until later: rejected because MTN callbacks need a clear HTTP entrypoint now.

## Consequences

- MTN-specific code is isolated and easier to evolve.
- Future transaction and reconciliation work can depend on this module without expanding its scope.
- Environment configuration now includes the MTN integration settings required by the service.
