import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createServerApp } from './app.js';
import { getActiveCmsRoute } from './store.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distPath = path.join(projectRoot, 'dist');
const indexPath = path.join(distPath, 'index.html');

const app = createServerApp();

// In production, serve frontend static build with dotfiles allowed (handles paths with leading dots like .gemini)
app.use(express.static(distPath, { dotfiles: 'allow' }));

// Fallback to index.html for SPA routing (except /api)
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  try {
    if (fs.existsSync(indexPath)) {
      const html = fs.readFileSync(indexPath, 'utf-8');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(html);
    }
  } catch (err) {
    console.error('[SPA Fallback] Error reading index.html:', err);
  }
  res.sendFile(indexPath, { dotfiles: 'allow' }, (err) => {
    if (err && !res.headersSent) {
      next(err);
    }
  });
});

// Graceful error handler
app.use((err, req, res, next) => {
  console.error('[Server Error]:', err);
  if (!res.headersSent) {
    res.status(err.status || 500).json({ error: 'Internal Server Error' });
  }
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  const cmsRoute = getActiveCmsRoute();
  console.log(`\n===============================================================`);
  console.log(`   KB NEXUS — ENTERPRISE SECURITY & CMS PLATFORM`);
  console.log(`===============================================================`);
  console.log(`  🚀 Public Website:       http://localhost:${PORT}/`);
  console.log(`  🔐 KB NEXUS Secure URL:  http://localhost:${PORT}/${cmsRoute}`);
  console.log(`---------------------------------------------------------------`);
  console.log(`  Default KB NEXUS Credentials (Password + Recovery Code):`);
  console.log(`  • Super Admin:  superadmin  /  SuperSecurePass2026!  /  1111-2222-3333-4444`);
  console.log(`  • Admin:        admin       /  AdminSecurePass2026!  /  2222-3333-4444-5555`);
  console.log(`  • Marketing:    marketing   /  MarketingPass2026!    /  3333-4444-5555-6666`);
  console.log(`===============================================================\n`);
});

export default server;
