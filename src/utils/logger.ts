import pino from 'pino';

export const createLogger = (level: string): pino.Logger => pino({
  level,
  transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty', options: { colorize: true } } : undefined
});
