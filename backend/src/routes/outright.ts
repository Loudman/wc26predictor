import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import db from '../db';

const router = Router();
router.use(requireAuth);

// GET /api/outright — my picks
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const result = await db.execute({
    sql: 'SELECT champion, finalist, dark_horse, updated_at FROM outright_picks WHERE user_id = ?',
    args: [req.userId!],
  });
  if (!result.rows[0]) {
    res.json({ champion: null, finalist: null, dark_horse: null });
    return;
  }
  res.json(result.rows[0]);
});

// PUT /api/outright — save my picks
router.put('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { champion, finalist, dark_horse } = req.body as {
    champion?: string; finalist?: string; dark_horse?: string;
  };

  await db.execute({
    sql: `INSERT INTO outright_picks (user_id, champion, finalist, dark_horse)
          VALUES (?, ?, ?, ?)
          ON CONFLICT (user_id) DO UPDATE SET
            champion = excluded.champion,
            finalist = excluded.finalist,
            dark_horse = excluded.dark_horse,
            updated_at = CURRENT_TIMESTAMP`,
    args: [req.userId!, champion?.trim() || null, finalist?.trim() || null, dark_horse?.trim() || null],
  });

  res.json({ success: true, champion, finalist, dark_horse });
});

// GET /api/outright/all — all users' picks
router.get('/all', async (_req: AuthRequest, res: Response): Promise<void> => {
  const result = await db.execute({
    sql: `SELECT o.user_id, u.name, u.picture, u.country,
                 o.champion, o.finalist, o.dark_horse, o.updated_at
          FROM outright_picks o
          JOIN users u ON u.id = o.user_id
          ORDER BY u.name ASC`,
    args: [],
  });
  res.json(result.rows);
});

export default router;
