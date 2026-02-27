import { Logger } from 'pino';

export const attachProcessHandlers = (logger: Logger): void => {
  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled rejection');
  });

  process.on('uncaughtException', (error) => {
    logger.error({ error }, 'Uncaught exception');
  });
};
