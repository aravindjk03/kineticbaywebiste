import express from 'express';
import cookieParser from 'cookie-parser';
import { SECURITY_CONFIG } from './config.js';
import { securityHeadersMiddleware } from './middleware/securityHeaders.js';
import { requestValidatorMiddleware, secureErrorHandler } from './middleware/requestValidator.js';
import { apiRateLimiter } from './middleware/rateLimiter.js';

import authRoutes from './routes/authRoutes.js';
import cmsRoutes from './routes/cmsRoutes.js';
import contentRoutes from './routes/contentRoutes.js';
import userRoutes from './routes/userRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import ticketRoutes from './routes/ticketRoutes.js';
import enquiryRoutes from './routes/enquiryRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';

export function createServerApp() {
  const app = express();

  // Basic security hardening
  app.disable('x-powered-by');

  // Parse cookies
  app.use(cookieParser(SECURITY_CONFIG.COOKIE_SECRET));

  // Parse JSON payloads with strict limit to prevent oversized body attacks
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));

  // Apply security headers
  app.use(securityHeadersMiddleware);

  // Apply request validation, XSS sanitization, and correlation ID
  app.use(requestValidatorMiddleware);

  // Global rate limiter for API endpoints
  app.use('/api', apiRateLimiter);

  // Mount API modules
  app.use('/api/public', publicRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/security', cmsRoutes);
  app.use('/api/content', contentRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/tickets', ticketRoutes);
  app.use('/api/enquiries', enquiryRoutes);
  app.use('/api/analytics', analyticsRoutes);

  // Handle unmatched API endpoints
  app.use('/api', (req, res) => {
    res.status(404).json({
      error: 'Endpoint not found or method unsupported.',
      reference: req.id,
    });
  });

  // Secure generic error handler
  app.use(secureErrorHandler);

  return app;
}
