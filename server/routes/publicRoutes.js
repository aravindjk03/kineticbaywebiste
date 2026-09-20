import { Router } from 'express';
import {
  getPublicServices,
  getPublicServiceBySlug,
  createPublicTicket,
  verifyAndGetPublicTicket,
  createPublicEnquiry,
  recordRealVisit,
} from '../store.js';
import {
  ticketSubmissionBucket,
  messageSubmissionBucket,
  ticketTrackingRateLimiter,
} from '../middleware/rateLimiter.js';

const router = Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ─── 1. PUBLIC SERVICE CATALOGUE ─────────────────────────────── */

/**
 * GET /api/public/services
 * Returns the public-facing service catalogue (Tech & Training)
 * Data minimized: excludes internal database IDs and admin flags
 */
router.get('/services', (req, res) => {
  const category = req.query.category ? String(req.query.category).toLowerCase() : null;
  const services = getPublicServices(category);
  res.json({
    success: true,
    count: services.length,
    services,
  });
});

/**
 * GET /api/public/services/:slug
 * Returns detailed view for a single service
 */
router.get('/services/:slug', (req, res) => {
  const slug = String(req.params.slug).toLowerCase().trim();
  const service = getPublicServiceBySlug(slug);

  if (!service) {
    return res.status(404).json({
      error: 'Service not found in the public catalogue.',
      reference: req.id,
    });
  }

  res.json({
    success: true,
    service,
  });
});

/* ─── 2. PUBLIC SERVICE ENQUIRIES ─────────────────────────────── */

/**
 * POST /api/public/enquiries
 * Captures lead / quote enquiry from public visitors or chatbot
 */
router.post('/enquiries', messageSubmissionBucket, (req, res) => {
  const { name, email, company, service_slug, budget_range, timeline, message } = req.body || {};

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({
      error: 'Please provide a valid name (minimum 2 characters).',
      reference: req.id,
    });
  }

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    return res.status(400).json({
      error: 'Please provide a valid email address.',
      reference: req.id,
    });
  }

  if (!message || typeof message !== 'string' || message.trim().length < 5) {
    return res.status(400).json({
      error: 'Please provide a brief project description or enquiry message (minimum 5 characters).',
      reference: req.id,
    });
  }

  const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const enquiry = createPublicEnquiry({
    name,
    email,
    company,
    service_slug,
    budget_range,
    timeline,
    message,
    reqId: req.id,
    ip: clientIp,
  });

  res.status(201).json({
    success: true,
    message: 'Your enquiry has been received. A Kinetic Bay engineer will respond within 24 hours.',
    enquiry,
  });
});

/* ─── 3. PUBLIC TICKET SUBMISSION ─────────────────────────────── */

/**
 * POST /api/public/tickets
 * Raises a support or service ticket with a cryptographically secure high-entropy public ID (KB-XXXXXXXX)
 */
router.post('/tickets', ticketSubmissionBucket, (req, res) => {
  const { name, email, category, priority, subject, description } = req.body || {};

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({
      error: 'Please provide a valid name (minimum 2 characters).',
      reference: req.id,
    });
  }

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    return res.status(400).json({
      error: 'Please provide a valid email address for ticket updates and verification.',
      reference: req.id,
    });
  }

  if (!subject || typeof subject !== 'string' || subject.trim().length < 4) {
    return res.status(400).json({
      error: 'Please provide a ticket subject line (minimum 4 characters).',
      reference: req.id,
    });
  }

  if (!description || typeof description !== 'string' || description.trim().length < 10) {
    return res.status(400).json({
      error: 'Please provide ticket details explaining your issue or request (minimum 10 characters).',
      reference: req.id,
    });
  }

  const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const ticket = createPublicTicket({
    name,
    email,
    category,
    priority,
    subject,
    description,
    reqId: req.id,
    ip: clientIp,
  });

  res.status(201).json({
    success: true,
    message: 'Ticket successfully submitted. Please save your Ticket Reference ID for tracking.',
    ticket,
  });
});

/* ─── 4. SECURE TICKET STATUS & ANTI-ENUMERATION TRACKING ────── */

/**
 * POST /api/public/ticket-status
 * Dual-factor verification: requires both Ticket ID (KB-XXXXXXXX) AND Requester Email.
 * Anti-Enumeration Defense:
 * If either the Ticket ID does not exist or the email does not match, returns a uniform 404.
 * Prevents attackers from probing valid ticket IDs or discovering if an email has open tickets.
 * Data Minimization:
 * Strictly strips internal notes, assigned staff identities, database IDs, and soft-delete tags.
 */
router.post('/ticket-status', ticketTrackingRateLimiter, (req, res) => {
  const ticketId = req.body?.ticketId || req.body?.ticket_id;
  const email = req.body?.email;

  if (!ticketId || typeof ticketId !== 'string' || ticketId.trim().length < 4) {
    return res.status(400).json({
      error: 'Please enter a valid Ticket Reference ID (e.g. KB-XXXXXXXX).',
      reference: req.id,
    });
  }

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    return res.status(400).json({
      error: 'Please enter the email address used when raising the ticket.',
      reference: req.id,
    });
  }

  const ticket = verifyAndGetPublicTicket(ticketId, email);

  if (!ticket) {
    // Uniform response for both non-existent ID and mismatched email
    return res.status(404).json({
      error: 'Ticket not found or verification credentials invalid.',
      reference: req.id,
    });
  }

  res.json({
    success: true,
    ticket,
  });
});

/* ─── 4. REAL VISIT TELEMETRY INGESTION ───────────────────────── */

/**
 * POST /api/public/analytics/visit
 * Ingests real public page visit event with strict bot filtering and session deduplication
 */
router.post('/analytics/visit', (req, res) => {
  const { path, visitorId, referrer, device } = req.body || {};
  const userAgent = req.headers['user-agent'] || '';
  const ip = req.ip || req.connection?.remoteAddress || '127.0.0.1';

  const result = recordRealVisit({
    path,
    visitorId,
    userAgent,
    ip,
    referrer,
    device,
  });

  res.json({
    success: true,
    ...result,
  });
});

export default router;
