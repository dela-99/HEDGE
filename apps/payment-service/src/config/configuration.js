"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function requireString(env, key) {
    const value = env[key]?.trim();
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
}
function optionalString(env, key, defaultValue) {
    return env[key]?.trim() ?? defaultValue ?? '';
}
function parseCorsOrigins(raw) {
    return raw
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);
}
exports.default = () => ({
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
//# sourceMappingURL=configuration.js.map