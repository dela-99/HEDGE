import { Role } from '@prisma/client';

export type AuthTokenPayload = {
  sub: string;
  email: string;
  role: Role;
  sid: string;
};

export type JwtPayload = Pick<AuthTokenPayload, 'sub' | 'email' | 'role'>;

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
    (candidate.role === Role.admin || candidate.role === Role.merchant_owner) &&
    typeof candidate.sid === 'string' &&
    candidate.sid.length > 0
  );
}
