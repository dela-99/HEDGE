export interface AppConfiguration {
  app: {
    port: number;
    corsOrigins: string[];
    nodeEnv: string;
  };
  database: {
    url: string;
  };
  redis: {
    url: string;
  };
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessExpiresIn: string;
    refreshExpiresIn: string;
  };
}

function requireString(env: NodeJS.ProcessEnv, key: string) {
  const value = env[key]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

function requirePort(env: NodeJS.ProcessEnv) {
  const rawPort = requireString(env, 'PORT');
  const port = Number(rawPort);

  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error('PORT must be a positive integer between 1 and 65535');
  }

  return port;
}

function requireDuration(env: NodeJS.ProcessEnv, key: string) {
  const value = requireString(env, key);

  if (!/^\d+[smhd]$/.test(value)) {
    throw new Error(`${key} must use a duration format such as 15m or 7d`);
  }

  return value;
}

function parseCorsOrigins(env: NodeJS.ProcessEnv) {
  const value = env.CORS_ORIGIN?.trim();

  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => {
      try {
        const parsed = new URL(origin);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          throw new Error();
        }
      } catch {
        throw new Error(`Invalid CORS origin "${origin}" in CORS_ORIGIN; use comma-separated http(s) origins`);
      }

      return origin;
    });
}

export function createConfiguration(env: NodeJS.ProcessEnv = process.env): AppConfiguration {
  return {
    app: {
      port: requirePort(env),
      corsOrigins: parseCorsOrigins(env),
      nodeEnv: env.NODE_ENV?.trim() || 'development',
    },
    database: {
      url: requireString(env, 'DATABASE_URL'),
    },
    redis: {
      url: requireString(env, 'REDIS_URL'),
    },
    jwt: {
      accessSecret: requireString(env, 'JWT_ACCESS_SECRET'),
      refreshSecret: requireString(env, 'JWT_REFRESH_SECRET'),
      accessExpiresIn: requireDuration(env, 'ACCESS_TOKEN_EXPIRES'),
      refreshExpiresIn: requireDuration(env, 'REFRESH_TOKEN_EXPIRES'),
    },
  };
}

export default () => createConfiguration();
