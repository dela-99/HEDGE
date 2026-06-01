import { CanActivate, ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import request from 'supertest';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { JwtRefreshGuard } from '../src/common/guards/jwt-refresh.guard';
import { LocalAuthGuard } from '../src/common/guards/local-auth.guard';

function mockGuard(user: unknown): CanActivate {
  return {
    canActivate(context: ExecutionContext) {
      context.switchToHttp().getRequest().user = user;
      return true;
    },
  };
}

describe('Auth flow skeleton (e2e)', () => {
  let app: INestApplication;

  const authService = {
    register: jest.fn().mockResolvedValue({
      user: { id: 'user-1', email: 'merchant@example.com', role: Role.merchant_owner },
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      sessionId: 'session-1',
    }),
    login: jest.fn().mockResolvedValue({
      user: { id: 'user-1', email: 'merchant@example.com', role: Role.merchant_owner },
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      sessionId: 'session-1',
    }),
    refreshTokens: jest.fn(),
    logout: jest.fn(),
    currentUser: jest.fn().mockResolvedValue({
      id: 'user-1',
      email: 'merchant@example.com',
      role: Role.merchant_owner,
    }),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    })
      .overrideGuard(LocalAuthGuard)
      .useValue(mockGuard({ id: 'user-1', email: 'merchant@example.com', role: Role.merchant_owner }))
      .overrideGuard(JwtRefreshGuard)
      .useValue(mockGuard({ sub: 'user-1', email: 'merchant@example.com', role: Role.merchant_owner }))
      .overrideGuard(JwtAuthGuard)
      .useValue(mockGuard({ sub: 'user-1', email: 'merchant@example.com', role: Role.merchant_owner }))
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );

    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  it('covers signup', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'merchant@example.com', password: 'password123' })
      .expect(201)
      .expect(({ body }) => {
        expect(body.accessToken).toBe('access-token');
      });
  });

  it('covers login', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'merchant@example.com', password: 'password123' })
      .expect(201)
      .expect(({ body }) => {
        expect(body.refreshToken).toBe('refresh-token');
      });
  });

  it('covers protected route access', async () => {
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', '******')
      .expect(200)
      .expect(({ body }) => {
        expect(body.email).toBe('merchant@example.com');
      });
  });
});
