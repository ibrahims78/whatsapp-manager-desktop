import { Router } from 'express';
import authRoutes from './auth';
import sessionsRoutes from './sessions';
import sendRoutes from './send';
import usersRoutes from './users';
import apiKeysRoutes from './api-keys';
import dashboardRoutes from './dashboard';
import auditLogsRoutes from './audit-logs';
import n8nRoutes from './n8n-workflow';
import healthRoutes from './health';

const router = Router();

router.use('/auth', authRoutes);
router.use('/sessions', sessionsRoutes);
router.use('/sessions', sendRoutes);
router.use('/users', usersRoutes);
router.use('/api-keys', apiKeysRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/audit-logs', auditLogsRoutes);
router.use('/n8n', n8nRoutes);
router.use('/', healthRoutes);

export default router;
