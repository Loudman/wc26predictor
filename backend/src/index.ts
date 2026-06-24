import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { ready } from './db';

import authRoutes from './routes/auth';
import matchRoutes from './routes/matches';
import predictionRoutes from './routes/predictions';
import leaderboardRoutes from './routes/leaderboard';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(rateLimit({ windowMs: 60_000, max: 120, standardHeaders: true }));

// Ensure schema is created before any request is handled
app.use((_req, _res, next) => { ready.then(() => next()).catch(next); });

app.use('/api/auth', authRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

app.get('/health', (_req, res) => res.json({ ok: true }));

// Serve frontend static files in production
if (process.env.VERCEL) {
  const dist = path.join(process.cwd(), 'frontend/dist');
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

// Export for Vercel serverless
export default app;

// Listen only in local dev (Vercel manages its own HTTP server)
if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
}
