export interface AppConfiguration {
  app: {
    port: number;
    corsOrigin?: string;
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

export function createConfiguration(env: NodeJS.ProcessEnv = process.env): AppConfiguration {
  return {
    app: {
      port: requirePort(env),
      corsOrigin: env.CORS_ORIGIN?.trim() || undefined,
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
