import pino from 'pino';
import path from 'path';
import fs from 'fs';

function getLogDir(): string {
  if (process.env.NODE_ENV === 'production') {
    return path.join(path.dirname(process.execPath), 'logs');
  }
  return path.join(process.cwd(), 'logs');
}

const logDir = getLogDir();
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logFile = path.join(logDir, 'wa-manager.log');

export const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'info',
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  process.env.NODE_ENV === 'production'
    ? pino.destination({ dest: logFile, sync: false })
    : pino.transport({ target: 'pino-pretty', options: { colorize: true } })
);
