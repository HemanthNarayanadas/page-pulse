import { createApp } from './app';
import { config } from './config';
import { logger } from './utils/logger';

const app = createApp();

const server = app.listen(config.port, () => {
  logger.info(`Page Pulse API listening on port ${config.port} [${config.nodeEnv}]`);
});

function shutdown(signal: string): void {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  server.close(() => {
    logger.info('Server closed. Exiting process.');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled promise rejection');
});
