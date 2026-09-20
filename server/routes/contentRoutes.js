import express from 'express';
import { CONTENT_ITEMS, PERMISSIONS, ROLES, logAuditEvent } from '../store.js';
import { authenticateMiddleware } from '../middleware/authenticate.js';
import { requirePermission, requireRole } from '../middleware/authorize.js';

const router = express.Router();

/* ─── 1. LIST CONTENT (READ) ──────────────────────────────────── */
router.get('/', authenticateMiddleware, requirePermission(PERMISSIONS.CONTENT_READ), (req, res) => {
  const includeDeleted = req.query.includeDeleted === 'true';
  const canViewDeleted = [ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(req.user.role);

  let items = CONTENT_ITEMS;
  if (!includeDeleted || !canViewDeleted) {
    items = items.filter((item) => item.deleted_at === null);
  }

  res.json({
    items,
    reference: req.id,
  });
});

/* ─── 2. CREATE CONTENT (DRAFT) ───────────────────────────────── */
router.post('/', authenticateMiddleware, requirePermission(PERMISSIONS.CONTENT_CREATE), (req, res) => {
  const reqId = req.id || 'REQ-CNT-NEW';
  const { title, slug, content, category } = req.body || {};

  if (!title || !slug) {
    return res.status(400).json({
      error: 'Title and slug required.',
      reference: reqId,
    });
  }

  const newItem = {
    id: 'cnt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    title,
    slug: slug.toLowerCase().replace(/[^a-z0-9-_]/g, '-'),
    category: category || 'general',
    status: 'draft', // Always starts in draft
    content: content || '',
    version: 1,
    authorId: req.user.id,
    reviewerId: null,
    deleted_at: null,
    deleted_by: null,
    deletion_reason: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  CONTENT_ITEMS.unshift(newItem);

  logAuditEvent({
    type: 'CONTENT_CREATED',
    userId: req.user.id,
    role: req.user.role,
    reqId,
    ip: req.ip || '127.0.0.1',
    userAgent: req.headers['user-agent'] || 'UNKNOWN',
    target: `/api/content/${newItem.id}`,
    action: 'CREATE_CONTENT',
    result: 'SUCCESS',
    metadata: { title, slug: newItem.slug },
  });

  res.status(201).json({ item: newItem, reference: reqId });
});

/* ─── 3. UPDATE CONTENT ───────────────────────────────────────── */
router.put('/:id', authenticateMiddleware, requirePermission(PERMISSIONS.CONTENT_UPDATE), (req, res) => {
  const reqId = req.id || 'REQ-CNT-UPD';
  const item = CONTENT_ITEMS.find((c) => c.id === req.params.id && c.deleted_at === null);

  if (!item) {
    return res.status(404).json({ error: 'Content item not found.', reference: reqId });
  }

  const { title, content, category } = req.body || {};
  if (title) item.title = title;
  if (content !== undefined) item.content = content;
  if (category) item.category = category;
  item.version += 1;
  item.updated_at = new Date().toISOString();

  // If already published, editing moves it back to draft or review
  if (item.status === 'published' && req.user.role === ROLES.MARKETING) {
    item.status = 'draft';
  }

  logAuditEvent({
    type: 'CONTENT_UPDATED',
    userId: req.user.id,
    role: req.user.role,
    reqId,
    ip: req.ip || '127.0.0.1',
    userAgent: req.headers['user-agent'] || 'UNKNOWN',
    target: `/api/content/${item.id}`,
    action: 'UPDATE_CONTENT',
    result: 'SUCCESS',
    metadata: { version: item.version },
  });

  res.json({ item, reference: reqId });
});

/* ─── 4. APPROVAL WORKFLOW STATE TRANSITIONS ──────────────────── */
router.post('/:id/transition', authenticateMiddleware, (req, res) => {
  const reqId = req.id || 'REQ-WORKFLOW';
  const item = CONTENT_ITEMS.find((c) => c.id === req.params.id && c.deleted_at === null);

  if (!item) {
    return res.status(404).json({ error: 'Content item not found.', reference: reqId });
  }

  const { targetStatus } = req.body || {};
  const currentStatus = item.status;
  const userRole = req.user.role;

  // Workflow rules:
  // DRAFT -> SUBMITTED (Marketing or higher)
  // SUBMITTED -> REVIEW (Admin or higher)
  // REVIEW -> APPROVED (Admin or higher)
  // APPROVED -> PUBLISHED (Requires content:publish)

  if (targetStatus === 'submitted') {
    if (currentStatus !== 'draft') {
      return res.status(400).json({ error: 'Only drafts can be submitted for review.', reference: reqId });
    }
    item.status = 'submitted';
  } else if (targetStatus === 'review') {
    if (![ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(userRole)) {
      return res.status(403).json({ error: 'Only Admins can move content to review.', reference: reqId });
    }
    item.status = 'review';
    item.reviewerId = req.user.id;
  } else if (targetStatus === 'approved') {
    if (![ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(userRole)) {
      return res.status(403).json({ error: 'Only Admins can approve content.', reference: reqId });
    }
    item.status = 'approved';
    item.reviewerId = req.user.id;
  } else if (targetStatus === 'published') {
    // Strictly requires content:publish
    if (!req.session.permissions.includes(PERMISSIONS.CONTENT_PUBLISH)) {
      logAuditEvent({
        type: 'UNAUTHORIZED_PUBLISH_ATTEMPT',
        userId: req.user.id,
        role: userRole,
        reqId,
        ip: req.ip || '127.0.0.1',
        userAgent: req.headers['user-agent'] || 'UNKNOWN',
        target: `/api/content/${item.id}`,
        action: 'PUBLISH',
        result: 'DENIED',
      });

      return res.status(403).json({
        error: 'Forbidden: Marketing role is not permitted to publish directly without Admin approval.',
        reference: reqId,
      });
    }

    item.status = 'published';
  } else {
    return res.status(400).json({ error: 'Invalid workflow target state.', reference: reqId });
  }

  item.updated_at = new Date().toISOString();

  logAuditEvent({
    type: 'WORKFLOW_TRANSITION',
    userId: req.user.id,
    role: userRole,
    reqId,
    ip: req.ip || '127.0.0.1',
    userAgent: req.headers['user-agent'] || 'UNKNOWN',
    target: `/api/content/${item.id}`,
    action: 'TRANSITION_STATUS',
    result: 'SUCCESS',
    metadata: { from: currentStatus, to: targetStatus },
  });

  res.json({ item, reference: reqId });
});

/* ─── 5. SOFT DELETE ──────────────────────────────────────────── */
router.delete('/:id', authenticateMiddleware, requirePermission(PERMISSIONS.CONTENT_DELETE), (req, res) => {
  const reqId = req.id || 'REQ-CNT-DEL';
  const item = CONTENT_ITEMS.find((c) => c.id === req.params.id && c.deleted_at === null);

  if (!item) {
    return res.status(404).json({ error: 'Content item not found.', reference: reqId });
  }

  item.deleted_at = new Date().toISOString();
  item.deleted_by = req.user.id;
  item.deletion_reason = req.body?.reason || 'Administrative soft-delete';

  logAuditEvent({
    type: 'CONTENT_SOFT_DELETED',
    userId: req.user.id,
    role: req.user.role,
    reqId,
    ip: req.ip || '127.0.0.1',
    userAgent: req.headers['user-agent'] || 'UNKNOWN',
    target: `/api/content/${item.id}`,
    action: 'SOFT_DELETE',
    result: 'SUCCESS',
    metadata: { reason: item.deletion_reason },
  });

  res.json({ success: true, message: 'Item placed in trash.', reference: reqId });
});

/* ─── 6. RESTORE SOFT DELETED CONTENT ─────────────────────────── */
router.post('/:id/restore', authenticateMiddleware, requirePermission(PERMISSIONS.CONTENT_DELETE), (req, res) => {
  const reqId = req.id || 'REQ-CNT-RESTORE';
  const item = CONTENT_ITEMS.find((c) => c.id === req.params.id && c.deleted_at !== null);

  if (!item) {
    return res.status(404).json({ error: 'Deleted item not found in trash.', reference: reqId });
  }

  item.deleted_at = null;
  item.deleted_by = null;
  item.deletion_reason = null;
  item.updated_at = new Date().toISOString();

  logAuditEvent({
    type: 'CONTENT_RESTORED',
    userId: req.user.id,
    role: req.user.role,
    reqId,
    ip: req.ip || '127.0.0.1',
    userAgent: req.headers['user-agent'] || 'UNKNOWN',
    target: `/api/content/${item.id}`,
    action: 'RESTORE_CONTENT',
    result: 'SUCCESS',
  });

  res.json({ success: true, item, reference: reqId });
});

/* ─── 7. PERMANENT DELETE (SUPER ADMIN ONLY) ─────────────────── */
router.delete('/:id/permanent', authenticateMiddleware, requireRole(ROLES.SUPER_ADMIN), (req, res) => {
  const reqId = req.id || 'REQ-CNT-PERM';
  const index = CONTENT_ITEMS.findIndex((c) => c.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Content item not found.', reference: reqId });
  }

  const [removed] = CONTENT_ITEMS.splice(index, 1);

  logAuditEvent({
    type: 'CONTENT_PERMANENTLY_DELETED',
    userId: req.user.id,
    role: req.user.role,
    reqId,
    ip: req.ip || '127.0.0.1',
    userAgent: req.headers['user-agent'] || 'UNKNOWN',
    target: `/api/content/${removed.id}`,
    action: 'PERMANENT_DELETE',
    result: 'SUCCESS',
    metadata: { title: removed.title },
  });

  res.json({ success: true, reference: reqId });
});

export default router;
