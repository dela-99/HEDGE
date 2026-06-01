export interface AppConfiguration {
  app: {
    port: number;
    corsOrigins: string[];
    nodeEnv: string;
  };
  database: {
    url: string;
  };
}

function requireString(env: NodeJS.ProcessEnv, key: string) {
  const value = env[key]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

function optionalString(env: NodeJS.ProcessEnv, key: string, defaultValue?: string) {
  return env[key]?.trim() ?? defaultValue ?? '';
}

function parseCorsOrigins(raw: string): string[] {
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export default (): AppConfiguration => ({
  app: {
    port: parseInt(optionalString(process.env, 'PORT', '3001'), 10),
    nodeEnv: optionalString(process.env, 'NODE_ENV', 'development'),
    corsOrigins: optionalString(process.env, 'CORS_ORIGIN', '').length > 0
      ? parseCorsOrigins(optionalString(process.env, 'CORS_ORIGIN', ''))
      : [],
  },
  database: {
    url: requireString(process.env, 'DATABASE_URL'),
  },
});
