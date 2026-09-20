import express from 'express';
import {
  PERMISSIONS,
  ROLES,
  getCmsTickets,
  getCmsTicketById,
  updateTicketStatus,
  assignTicket,
  addTicketInternalNote,
  addTicketCustomerUpdate,
  softDeleteTicket,
  restoreTicket,
  AUDIT_LOGS,
} from '../store.js';
import { authenticateMiddleware } from '../middleware/authenticate.js';
import { requirePermission } from '../middleware/authorize.js';

const router = express.Router();

// All ticket management endpoints require valid authenticated session
router.use(authenticateMiddleware);

/**
 * GET /api/tickets
 * Lists all tickets with status/priority/category/search filtering
 * Soft-deleted tickets viewable only by Admin/SuperAdmin
 */
router.get('/', requirePermission(PERMISSIONS.TICKETS_READ), (req, res) => {
  const { status, priority, category, search, includeDeleted } = req.query;
  const canViewDeleted = [ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(req.user.role);

  const tickets = getCmsTickets({
    status: status ? String(status) : undefined,
    priority: priority ? String(priority) : undefined,
    category: category ? String(category) : undefined,
    search: search ? String(search) : undefined,
    includeDeleted: includeDeleted === 'true' && canViewDeleted,
  });

  res.json({
    success: true,
    count: tickets.length,
    tickets,
    reference: req.id,
  });
});

/**
 * GET /api/tickets/:id
 * Returns full ticket record including internal notes and audit history
 */
router.get('/:id', requirePermission(PERMISSIONS.TICKETS_READ), (req, res) => {
  const ticket = getCmsTicketById(req.params.id);

  if (!ticket) {
    return res.status(404).json({
      error: 'Ticket not found.',
      reference: req.id,
    });
  }

  // Soft-deleted tickets restricted
  if (ticket.deleted_at && ![ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(req.user.role)) {
    return res.status(404).json({
      error: 'Ticket not found.',
      reference: req.id,
    });
  }

  // Find audit history for this ticket
  const ticketAuditLogs = AUDIT_LOGS.filter(
    (log) => log.target === `Ticket:${ticket.public_id}` || log.metadata?.public_id === ticket.public_id
  );

  res.json({
    success: true,
    ticket,
    auditLogs: ticketAuditLogs,
    reference: req.id,
  });
});

/**
 * PATCH /api/tickets/:id/status
 * Transitions status through defined lifecycle (NEW -> TRIAGED -> ASSIGNED -> IN_PROGRESS -> RESOLVED -> CLOSED)
 */
router.patch('/:id/status', requirePermission(PERMISSIONS.TICKETS_UPDATE), (req, res) => {
  const { status } = req.body || {};

  if (!status || typeof status !== 'string') {
    return res.status(400).json({
      error: 'Valid target status string is required.',
      reference: req.id,
    });
  }

  try {
    const updated = updateTicketStatus(req.params.id, status, req.user, req.id);
    if (!updated) {
      return res.status(404).json({
        error: 'Ticket not found.',
        reference: req.id,
      });
    }

    res.json({
      success: true,
      message: `Ticket status updated to ${status}.`,
      ticket: updated,
      reference: req.id,
    });
  } catch (err) {
    res.status(400).json({
      error: err.message,
      reference: req.id,
    });
  }
});

/**
 * PATCH /api/tickets/:id/assign
 * Assigns ticket to a staff member
 */
router.patch('/:id/assign', requirePermission(PERMISSIONS.TICKETS_ASSIGN), (req, res) => {
  const { assignedTo } = req.body || {};

  const updated = assignTicket(req.params.id, assignedTo, req.user, req.id);
  if (!updated) {
    return res.status(404).json({
      error: 'Ticket not found.',
      reference: req.id,
    });
  }

  res.json({
    success: true,
    message: assignedTo ? `Ticket assigned to user ${assignedTo}.` : 'Ticket unassigned.',
    ticket: updated,
    reference: req.id,
  });
});

/**
 * POST /api/tickets/:id/notes
 * Adds a confidential internal staff note (STRICTLY HIDDEN from public visitors)
 */
router.post('/:id/notes', requirePermission(PERMISSIONS.TICKETS_UPDATE), (req, res) => {
  const { note } = req.body || {};

  if (!note || typeof note !== 'string' || note.trim().length < 2) {
    return res.status(400).json({
      error: 'Internal note content is required (minimum 2 characters).',
      reference: req.id,
    });
  }

  const addedNote = addTicketInternalNote(req.params.id, note, req.user, req.id);
  if (!addedNote) {
    return res.status(404).json({
      error: 'Ticket not found.',
      reference: req.id,
    });
  }

  res.status(201).json({
    success: true,
    message: 'Internal note appended to ticket.',
    note: addedNote,
    reference: req.id,
  });
});

/**
 * POST /api/tickets/:id/customer-update
 * Adds a public customer-facing update message visible on ticket tracking
 */
router.post('/:id/customer-update', requirePermission(PERMISSIONS.TICKETS_UPDATE), (req, res) => {
  const { message } = req.body || {};

  if (!message || typeof message !== 'string' || message.trim().length < 2) {
    return res.status(400).json({
      error: 'Customer update message is required (minimum 2 characters).',
      reference: req.id,
    });
  }

  const update = addTicketCustomerUpdate(req.params.id, message, req.user, req.id);
  if (!update) {
    return res.status(404).json({
      error: 'Ticket not found.',
      reference: req.id,
    });
  }

  res.status(201).json({
    success: true,
    message: 'Customer status update published.',
    update,
    reference: req.id,
  });
});

/**
 * DELETE /api/tickets/:id
 * Soft deletes a ticket with mandatory deletion reason
 */
router.delete('/:id', requirePermission(PERMISSIONS.TICKETS_DELETE), (req, res) => {
  const { reason } = req.body || {};

  const deleted = softDeleteTicket(req.params.id, reason, req.user, req.id);
  if (!deleted) {
    return res.status(404).json({
      error: 'Ticket not found.',
      reference: req.id,
    });
  }

  res.json({
    success: true,
    message: 'Ticket soft-deleted and archived.',
    reference: req.id,
  });
});

/**
 * POST /api/tickets/:id/restore
 * Restores a soft-deleted ticket
 */
router.post('/:id/restore', requirePermission(PERMISSIONS.TICKETS_DELETE), (req, res) => {
  const restored = restoreTicket(req.params.id, req.user, req.id);
  if (!restored) {
    return res.status(404).json({
      error: 'Ticket not found.',
      reference: req.id,
    });
  }

  res.json({
    success: true,
    message: 'Ticket restored to active service queue.',
    ticket: restored,
    reference: req.id,
  });
});

export default router;
