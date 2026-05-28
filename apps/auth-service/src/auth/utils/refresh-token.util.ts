import { Request } from 'express';

export function extractRefreshToken(request: Pick<Request, 'body' | 'cookies'>): string | null {
  const token = request.body?.refreshToken ?? request.cookies?.refreshToken;
  return typeof token === 'string' && token.length ? token : null;
}
