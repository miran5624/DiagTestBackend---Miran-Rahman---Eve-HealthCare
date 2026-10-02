import { app, prisma } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';

const port = parseInt(env.PORT, 10) || 3000;

const server = app.listen(port, () => {
  logger.info(`Server listening on port ${port}`);
});

const gracefulShutdown = async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  server.close(async () => {
    logger.info('HTTP server closed');
    await prisma.$disconnect();
    logger.info('Database connection closed');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
