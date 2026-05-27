export function validateEnv(config: Record<string, unknown>) {
  const required = ['DATABASE_URL', 'REDIS_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];

  for (const key of required) {
    if (!String(config[key] ?? process.env[key] ?? '').trim()) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  return config;
}
