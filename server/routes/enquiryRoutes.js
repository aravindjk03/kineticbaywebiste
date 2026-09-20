import express from 'express';
import {
  PERMISSIONS,
  ROLES,
  getCmsEnquiries,
  updateEnquiryStatus,
  softDeleteEnquiry,
} from '../store.js';
import { authenticateMiddleware } from '../middleware/authenticate.js';
import { requirePermission } from '../middleware/authorize.js';

const router = express.Router();

router.use(authenticateMiddleware);

/**
 * GET /api/enquiries
 * Lists all service enquiries and captured leads
 */
router.get('/', requirePermission(PERMISSIONS.ENQUIRIES_READ), (req, res) => {
  const { status, search, includeDeleted } = req.query;
  const canViewDeleted = [ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(req.user.role);

  const enquiries = getCmsEnquiries({
    status: status ? String(status) : undefined,
    search: search ? String(search) : undefined,
    includeDeleted: includeDeleted === 'true' && canViewDeleted,
  });

  res.json({
    success: true,
    count: enquiries.length,
    enquiries,
    reference: req.id,
  });
});

/**
 * PATCH /api/enquiries/:id/status
 * Updates enquiry CRM pipeline status and sales notes
 */
router.patch('/:id/status', requirePermission(PERMISSIONS.ENQUIRIES_UPDATE), (req, res) => {
  const { status, notes } = req.body || {};

  const updated = updateEnquiryStatus(req.params.id, status, notes, req.user, req.id);
  if (!updated) {
    return res.status(404).json({
      error: 'Enquiry not found.',
      reference: req.id,
    });
  }

  res.json({
    success: true,
    message: 'Enquiry status updated.',
    enquiry: updated,
    reference: req.id,
  });
});

/**
 * DELETE /api/enquiries/:id
 * Soft deletes an enquiry
 */
router.delete('/:id', requirePermission(PERMISSIONS.ENQUIRIES_DELETE), (req, res) => {
  const deleted = softDeleteEnquiry(req.params.id, req.user, req.id);
  if (!deleted) {
    return res.status(404).json({
      error: 'Enquiry not found.',
      reference: req.id,
    });
  }

  res.json({
    success: true,
    message: 'Enquiry deleted.',
    reference: req.id,
  });
});

export default router;
