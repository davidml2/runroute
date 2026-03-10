import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
}));

export const dbConfig = registerAs('db', () => ({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  username: process.env.DB_USERNAME || 'runroute',
  password: process.env.DB_PASSWORD || 'runroute_secret',
  database: process.env.DB_DATABASE || 'runroute_db',
}));

export const redisConfig = registerAs('redis', () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
}));

export const jwtConfig = registerAs('jwt', () => ({
  accessSecret: process.env.JWT_ACCESS_SECRET || 'dev_access_secret',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret',
  accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
}));

export const googleConfig = registerAs('google', () => ({
  mapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackUrl: process.env.GOOGLE_CALLBACK_URL,
}));

export const openaiConfig = registerAs('openai', () => ({
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.OPENAI_MODEL || 'gpt-4o',
}));

export const aiServiceConfig = registerAs('aiService', () => ({
  url: process.env.AI_SERVICE_URL || 'http://localhost:8000',
}));

export const osrmConfig = registerAs('osrm', () => ({
  baseUrl: process.env.OSRM_BASE_URL || 'http://router.project-osrm.org',
}));
