import { createConfiguration } from './configuration';

export function validateEnv(config: Record<string, unknown>) {
  createConfiguration(config as NodeJS.ProcessEnv);
  return config;
}
