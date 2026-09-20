import { Router } from 'express';
import { authenticateMiddleware } from '../middleware/authenticate.js';
import { requirePermission, requireRole } from '../middleware/authorize.js';
import { PERMISSIONS, ROLES, getRealAnalytics, resetRealAnalytics } from '../store.js';

const router = Router();

// All analytics endpoints require valid authenticated session
router.use(authenticateMiddleware);

/**
 * GET /api/analytics
 * Retrieves aggregated real website visitor analytics and live telemetry
 * Accessible to Marketing, Admin, Super Admin (PERMISSIONS.ANALYTICS_READ)
 */
router.get('/', requirePermission(PERMISSIONS.ANALYTICS_READ), (req, res) => {
  const analytics = getRealAnalytics();
  res.json({
    success: true,
    analytics,
  });
});

/**
 * POST /api/analytics/reset
 * Resets telemetry to clean slate (Admin / Super Admin only)
 */
router.post('/reset', requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN]), (req, res) => {
  const analytics = resetRealAnalytics(req.user, req.id);
  res.json({
    success: true,
    message: 'Telemetry metrics have been reset to zero.',
    analytics,
  });
});

export default router;
