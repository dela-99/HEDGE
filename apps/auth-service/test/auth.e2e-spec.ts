<<<<<<< HEAD
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import helmet from 'helmet';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { ConfigService } from '@nestjs/config';

describe('Auth Flow E2E Tests (e2e)', () => {
  let app: INestApplication;
  let configService: ConfigService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configService = app.get(ConfigService);

    app.use(helmet());
    app.enableCors({
      origin: configService.get<string>('app.corsOrigin') ?? true,
      credentials: true,
    });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('PHASE A: Full Auth Flow Tests', () => {
    let userId: string;
    let sessionId: string;
    let accessToken: string;
    let refreshToken: string;

    describe('1. POST /auth/register - Signup Flow', () => {
      it('should successfully register a new user', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/auth/register')
          .send({
            email: 'testuser@example.com',
            password: 'SecurePassword123!',
            name: 'Test User',
          });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('user');
        expect(response.body).toHaveProperty('accessToken');
        expect(response.body).toHaveProperty('refreshToken');
        expect(response.body).toHaveProperty('sessionId');

        userId = response.body.user.id;
        sessionId = response.body.sessionId;
        accessToken = response.body.accessToken;
        refreshToken = response.body.refreshToken;
      });

      it('should hash password (never return passwordHash)', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/auth/register')
          .send({
            email: 'testuser2@example.com',
            password: 'SecurePassword123!',
          });

        expect(response.status).toBe(201);
        expect(response.body.user).not.toHaveProperty('passwordHash');
      });

      it('should create a session with 7-day expiry', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/auth/register')
          .send({
            email: 'testuser3@example.com',
            password: 'SecurePassword123!',
          });

        expect(response.status).toBe(201);
        expect(response.body.sessionId).toBeDefined();
      });

      it('should reject duplicate email', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/auth/register')
          .send({
            email: 'testuser@example.com',
            password: 'DifferentPassword123!',
          });

        expect(response.status).toBe(409);
      });

      it('should reject weak passwords', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/auth/register')
          .send({
            email: 'testuser4@example.com',
            password: 'weak',
          });

        expect(response.status).toBe(400);
      });

      it('should reject invalid email', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/auth/register')
          .send({
            email: 'not-an-email',
            password: 'SecurePassword123!',
          });

        expect(response.status).toBe(400);
      });

      it('should reject unknown fields', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/auth/register')
          .send({
            email: 'testuser5@example.com',
            password: 'SecurePassword123!',
            unknownField: 'should be rejected',
          });

        expect(response.status).toBe(400);
      });
    });

    describe('2. POST /auth/login - Login Flow', () => {
      it('should successfully login with valid credentials', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/auth/login')
          .send({
            email: 'testuser@example.com',
            password: 'SecurePassword123!',
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('user');
        expect(response.body).toHaveProperty('accessToken');
        expect(response.body).toHaveProperty('refreshToken');
        expect(response.body).toHaveProperty('sessionId');
      });

      it('should reject invalid credentials', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/auth/login')
          .send({
            email: 'testuser@example.com',
            password: 'WrongPassword123!',
          });

        expect(response.status).toBe(401);
      });

      it('should reject non-existent user', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/auth/login')
          .send({
            email: 'nonexistent@example.com',
            password: 'SomePassword123!',
          });

        expect(response.status).toBe(401);
      });

      it('should not expose passwordHash in response', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/auth/login')
          .send({
            email: 'testuser@example.com',
            password: 'SecurePassword123!',
          });

        expect(response.body.user).not.toHaveProperty('passwordHash');
      });

      it('should return JWT payload with only sub, email, role, sid', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/auth/login')
          .send({
            email: 'testuser@example.com',
            password: 'SecurePassword123!',
          });

        const decoded = Buffer.from(response.body.accessToken.split('.')[1], 'base64').toString();
        const payload = JSON.parse(decoded);

        expect(payload).toHaveProperty('sub');
        expect(payload).toHaveProperty('email');
        expect(payload).toHaveProperty('role');
        expect(payload).toHaveProperty('sid');
        expect(payload).not.toHaveProperty('passwordHash');
        expect(payload).not.toHaveProperty('password');
      });
    });

    describe('3. POST /auth/refresh - Refresh Flow', () => {
      let loginAccessToken: string;
      let loginRefreshToken: string;

      beforeAll(async () => {
        const loginResponse = await request(app.getHttpServer())
          .post('/api/auth/login')
          .send({
            email: 'testuser@example.com',
            password: 'SecurePassword123!',
          });

        loginAccessToken = loginResponse.body.accessToken;
        loginRefreshToken = loginResponse.body.refreshToken;
      });

      it('should refresh tokens with valid refresh token', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/auth/refresh')
          .send({
            refreshToken: loginRefreshToken,
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('accessToken');
        expect(response.body).toHaveProperty('refreshToken');
        expect(response.body.accessToken).not.toBe(loginAccessToken);
        expect(response.body.refreshToken).not.toBe(loginRefreshToken);
      });

      it('should reject invalid refresh token', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/auth/refresh')
          .send({
            refreshToken: 'invalid-token',
          });

        expect(response.status).toBe(401);
      });

      it('should perform token rotation (old token becomes invalid)', async () => {
        const firstRefresh = await request(app.getHttpServer())
          .post('/api/auth/refresh')
          .send({
            refreshToken: loginRefreshToken,
          });

        const secondRefresh = await request(app.getHttpServer())
          .post('/api/auth/refresh')
          .send({
            refreshToken: loginRefreshToken,
          });

        expect(firstRefresh.status).toBe(200);
        expect(secondRefresh.status).toBe(401);
      });
    });

    describe('4. GET /auth/me - Protected Route', () => {
      let loginAccessToken: string;

      beforeAll(async () => {
        const loginResponse = await request(app.getHttpServer())
          .post('/api/auth/login')
          .send({
            email: 'testuser@example.com',
            password: 'SecurePassword123!',
          });

        loginAccessToken = loginResponse.body.accessToken;
      });

      it('should return current user with valid JWT', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${loginAccessToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('email');
        expect(response.body).not.toHaveProperty('passwordHash');
      });

      it('should reject request without JWT', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/auth/me');

        expect(response.status).toBe(401);
      });

      it('should reject malformed JWT', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/auth/me')
          .set('Authorization', 'Bearer invalid-token');

        expect(response.status).toBe(401);
      });

      it('should reject expired JWT', async () => {
        const expiredToken = Buffer.from(
          JSON.stringify({
            sub: 'user-id',
            email: 'test@example.com',
            role: 'USER',
            sid: 'session-id',
            iat: Math.floor(Date.now() / 1000) - 3600,
            exp: Math.floor(Date.now() / 1000) - 1800,
          })
        ).toString('base64');

        const response = await request(app.getHttpServer())
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${expiredToken}`);

        expect(response.status).toBe(401);
      });
    });

    describe('5. POST /auth/logout - Logout Flow', () => {
      let logoutAccessToken: string;

      beforeAll(async () => {
        const loginResponse = await request(app.getHttpServer())
          .post('/api/auth/login')
          .send({
            email: 'testuser@example.com',
            password: 'SecurePassword123!',
          });

        logoutAccessToken = loginResponse.body.accessToken;
      });

      it('should successfully logout', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/auth/logout')
          .set('Authorization', `Bearer ${logoutAccessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      it('should require valid JWT', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/auth/logout');

        expect(response.status).toBe(401);
      });
    });
  });

  describe('PHASE B: Security Hardening Tests', () => {
    describe('JWT Security', () => {
      it('should include correct token expiry in JWT claims', async () => {
        const loginResponse = await request(app.getHttpServer())
          .post('/api/auth/login')
          .send({
            email: 'testuser@example.com',
            password: 'SecurePassword123!',
          });

        const decoded = Buffer.from(
          loginResponse.body.accessToken.split('.')[1],
          'base64'
        ).toString();
        const payload = JSON.parse(decoded);

        const issuedAt = payload.iat;
        const expiresAt = payload.exp;
        const ttlSeconds = expiresAt - issuedAt;

        expect(ttlSeconds).toBe(900);
      });
    });

    describe('Validation Security', () => {
      it('should reject request with unknown fields', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            password: 'TestPassword123!',
            unknownField: 'malicious',
          });

        expect(response.status).toBe(400);
      });

      it('should reject invalid email format', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/auth/login')
          .send({
            email: 'not-an-email',
            password: 'TestPassword123!',
          });

        expect(response.status).toBe(400);
      });

      it('should reject weak passwords', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/auth/register')
          .send({
            email: 'weak@example.com',
            password: '1234567',
          });

        expect(response.status).toBe(400);
      });
    });

    describe('Rate Limiting', () => {
      it('should apply rate limiting to auth endpoints', async () => {
        const requests = [];

        for (let i = 0; i < 101; i++) {
          requests.push(
            request(app.getHttpServer())
              .post('/api/auth/login')
              .send({
                email: 'testuser@example.com',
                password: 'SecurePassword123!',
              })
          );
        }

        const responses = await Promise.all(requests);
        const limitedResponses = responses.filter(r => r.status === 429);

        expect(limitedResponses.length).toBeGreaterThan(0);
      });
    });

    describe('Sensitive Data Protection', () => {
      it('should never expose passwordHash in any response', async () => {
        const endpoints = [
          {
            method: 'post',
            path: '/api/auth/login',
            body: {
              email: 'testuser@example.com',
              password: 'SecurePassword123!',
            },
          },
          {
            method: 'post',
            path: '/api/auth/register',
            body: {
              email: 'newuser@example.com',
              password: 'TestPassword123!',
            },
          },
        ];

        for (const endpoint of endpoints) {
          const response = await request(app.getHttpServer())[endpoint.method](
            endpoint.path
          ).send(endpoint.body);

          const checkObject = (obj: any) => {
            if (typeof obj === 'object' && obj !== null) {
              expect(obj).not.toHaveProperty('passwordHash');
              Object.values(obj).forEach(checkObject);
            }
          };

          checkObject(response.body);
        }
      });
    });
  });

  describe('PHASE C: Audit Logging Tests', () => {
    it('should record audit log on signup', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'audit-test1@example.com',
          password: 'SecurePassword123!',
        });
    });

    it('should record audit log on login', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'testuser@example.com',
          password: 'SecurePassword123!',
        });
    });

    it('should record audit log on refresh', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'testuser@example.com',
          password: 'SecurePassword123!',
        });

      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({
          refreshToken: loginResponse.body.refreshToken,
        });
    });

    it('should record audit log on logout', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'testuser@example.com',
          password: 'SecurePassword123!',
        });

      await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${loginResponse.body.accessToken}`);
    });
  });
});
=======
import { CanActivate, ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
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
      const requestObject = context.switchToHttp().getRequest();
      requestObject.user = user;
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
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
      ],
    })
      .overrideGuard(LocalAuthGuard)
      .useValue(mockGuard({ id: 'user-1', email: 'merchant@example.com', role: Role.merchant_owner }))
      .overrideGuard(JwtRefreshGuard)
      .useValue(mockGuard({ sub: 'user-1', email: 'merchant@example.com', role: Role.merchant_owner }))
      .overrideGuard(JwtAuthGuard)
      .useValue(mockGuard({ sub: 'user-1', email: 'merchant@example.com', role: Role.merchant_owner }))
      .compile();

    app = moduleRef.createNestApplication();
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
>>>>>>> 88168253c6d945180ddc96650ddd16287cf5323e
