import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import { db, usersTable } from './db';
import { eq } from 'drizzle-orm';
import { verifyToken } from './lib/auth';
import { apiRateLimiter } from './lib/rate-limit';
import router from './routes';

const app: Express = express();

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
  })
);

app.use(
  cors({
    origin: [
      'http://127.0.0.1:43210',
      'http://localhost:43210',
      'http://127.0.0.1:5173',
      'http://localhost:5173',
    ],
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(apiRateLimiter);

app.use(async (req: Request, res: Response, next: NextFunction) => {
  const allowedPaths = ['/api/auth/login', '/api/auth/logout', '/api/auth/me', '/api/healthz'];
  const isUserPatch = req.method === 'PATCH' && /^\/api\/users\/\d+$/.test(req.path);
  if (allowedPaths.some((p) => req.path.startsWith(p)) || isUserPatch) return next();

  const token =
    req.headers.authorization?.slice(7) ||
    (req.cookies as Record<string, string>)?.session_token;
  if (!token) return next();

  const payload = verifyToken(token);
  if (!payload) return next();

  try {
    const [user] = db
      .select({ mustChangePassword: usersTable.mustChangePassword })
      .from(usersTable)
      .where(eq(usersTable.id, payload.userId))
      .all();

    if (user?.mustChangePassword) {
      res.status(403).json({
        error: 'must_change_password',
        message: 'You must change your password before continuing.',
      });
      return;
    }
  } catch { /* ignore */ }
  next();
});

if (process.env.NODE_ENV === 'production') {
  const rendererPath = path.join(
    (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath || process.cwd(),
    'app', 'dist', 'renderer'
  );
  app.use(express.static(rendererPath));
  app.use('/api/files', express.static(path.join(process.cwd(), 'public')));
  app.use('/api', router);
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(rendererPath, 'index.html'));
  });
} else {
  app.use('/api/files', express.static(path.join(process.cwd(), 'public')));
  app.use('/api', router);
}

export default app;
