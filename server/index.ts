import http from 'http';
import app from './app';
import { initSocketServer, restoreActiveSessions } from './lib/whatsapp-manager';
import { initDatabase } from './db/index';
import { runMigrations } from './db/migrate';
import { logger } from './lib/logger';

const PORT = parseInt(process.env.SERVER_PORT || '43210', 10);

export async function startServer(): Promise<http.Server> {
  await initDatabase();
  await runMigrations();

  const httpServer = http.createServer(app);
  initSocketServer(httpServer);

  return new Promise((resolve, reject) => {
    httpServer.listen(PORT, '127.0.0.1', () => {
      logger.info({ port: PORT }, `Server started on http://127.0.0.1:${PORT}`);
      restoreActiveSessions().catch((err) =>
        logger.error({ err }, 'Failed to restore sessions')
      );
      resolve(httpServer);
    });
    httpServer.on('error', reject);
  });
}

if (require.main === module) {
  startServer().catch((err) => {
    logger.error({ err }, 'Failed to start server');
    process.exit(1);
  });
}
