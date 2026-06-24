import { Router, Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import db from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function makeToken(userId: number, email: string): string {
  return jwt.sign({ userId, email }, process.env.JWT_SECRET!, { expiresIn: '30d' });
}

// --- Google OAuth ---
router.post('/google', async (req: Request, res: Response): Promise<void> => {
  const { credential } = req.body as { credential?: string };
  if (!credential) { res.status(400).json({ error: 'Missing Google credential' }); return; }

  let payload: { sub: string; name: string; email: string; picture: string } | undefined;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload() as typeof payload;
  } catch {
    res.status(401).json({ error: 'Invalid Google token' }); return;
  }
  if (!payload) { res.status(401).json({ error: 'Invalid Google token payload' }); return; }

  const { sub: googleId, name, email, picture } = payload;

  const existing = await db.execute({ sql: 'SELECT id FROM users WHERE email = ?', args: [email] });
  if (existing.rows.length > 0) {
    await db.execute({
      sql: 'UPDATE users SET google_id = COALESCE(google_id, ?), picture = ?, name = ? WHERE email = ?',
      args: [googleId, picture, name, email],
    });
  } else {
    await db.execute({
      sql: 'INSERT INTO users (google_id, name, email, picture) VALUES (?, ?, ?, ?)',
      args: [googleId, name, email, picture],
    });
  }

  const result = await db.execute({ sql: 'SELECT id, name, email, picture FROM users WHERE email = ?', args: [email] });
  const user = result.rows[0] as unknown as { id: number; name: string; email: string; picture: string };

  res.json({ token: makeToken(user.id, user.email), user });
});

// --- Email register ---
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { name, email, password } = req.body as { name?: string; email?: string; password?: string };

  if (!name?.trim() || !email?.trim() || !password) {
    res.status(400).json({ error: 'name, email and password are required' }); return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' }); return;
  }

  const existing = await db.execute({
    sql: 'SELECT id FROM users WHERE email = ?',
    args: [email.trim().toLowerCase()],
  });
  if (existing.rows.length > 0) {
    res.status(409).json({ error: 'An account with this email already exists' }); return;
  }

  const hash = await bcrypt.hash(password, 12);
  await db.execute({
    sql: 'INSERT INTO users (name, email, picture, password_hash) VALUES (?, ?, ?, ?)',
    args: [name.trim(), email.trim().toLowerCase(), '', hash],
  });

  const result = await db.execute({
    sql: 'SELECT id, name, email, picture FROM users WHERE email = ?',
    args: [email.trim().toLowerCase()],
  });
  const user = result.rows[0] as unknown as { id: number; name: string; email: string; picture: string };

  res.status(201).json({ token: makeToken(user.id, user.email), user });
});

// --- Email login ---
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email?.trim() || !password) {
    res.status(400).json({ error: 'email and password are required' }); return;
  }

  const result = await db.execute({
    sql: 'SELECT id, name, email, picture, password_hash FROM users WHERE email = ?',
    args: [email.trim().toLowerCase()],
  });
  const row = result.rows[0] as unknown as
    | { id: number; name: string; email: string; picture: string; password_hash: string | null }
    | undefined;

  if (!row || !row.password_hash) {
    res.status(401).json({ error: 'Invalid email or password' }); return;
  }

  const ok = await bcrypt.compare(password, row.password_hash);
  if (!ok) { res.status(401).json({ error: 'Invalid email or password' }); return; }

  res.json({ token: makeToken(row.id, row.email), user: { id: row.id, name: row.name, email: row.email, picture: row.picture } });
});

// --- Update name ---
router.put('/name', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const { name } = req.body as { name?: string };
  if (!name?.trim()) { res.status(400).json({ error: 'Name is required' }); return; }
  await db.execute({
    sql: 'UPDATE users SET name = ? WHERE id = ?',
    args: [name.trim(), req.userId!],
  });
  res.json({ name: name.trim() });
});

// --- List all users ---
router.get('/users', requireAuth, async (_req: AuthRequest, res: Response): Promise<void> => {
  const result = await db.execute({
    sql: 'SELECT id, name, email, picture FROM users ORDER BY name ASC',
    args: [],
  });
  res.json(result.rows);
});

// --- Current user ---
router.get('/me', async (req: Request, res: Response): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) { res.status(401).json({ error: 'No token' }); return; }
  try {
    const payload = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET!) as { userId: number };
    const result = await db.execute({ sql: 'SELECT id, name, email, picture FROM users WHERE id = ?', args: [payload.userId] });
    if (!result.rows[0]) { res.status(404).json({ error: 'User not found' }); return; }
    res.json({ user: result.rows[0] });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
