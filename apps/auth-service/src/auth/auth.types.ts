import { Role } from '@prisma/client';

export type AuthTokenPayload = {
  sub: string;
  email: string;
  role: Role;
};

export type JwtPayload = AuthTokenPayload;

export function isJwtPayload(payload: unknown): payload is AuthTokenPayload {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const candidate = payload as Partial<AuthTokenPayload> & Record<string, unknown>;
  return (
    typeof candidate.sub === 'string' &&
    candidate.sub.length > 0 &&
    typeof candidate.email === 'string' &&
    candidate.email.length > 0 &&
    (candidate.role === Role.admin || candidate.role === Role.merchant_owner)
  );
}
