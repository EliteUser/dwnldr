import type { ReadinessStatus } from '../../services/health.service.js';

import { Router } from 'express';

import { getHealthStatus, getReadinessStatus } from '../../services/health.service.js';

export type HealthRouterOptions = {
  getReadiness?: () => Promise<ReadinessStatus>;
};

export const createHealthRouter = (options: HealthRouterOptions = {}) => {
  const router = Router();
  const resolveReadiness = options.getReadiness ?? getReadinessStatus;

  router.get('/health', (_req, res) => {
    res.json(getHealthStatus());
  });

  router.get('/ready', async (_req, res) => {
    const readiness = await resolveReadiness();

    res.status(readiness.status === 'ok' ? 200 : 503).json(readiness);
  });

  return router;
};
