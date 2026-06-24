import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import db from '../db';

const router = Router();
router.use(requireAuth);

router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const result = await db.execute({
    sql: `SELECT p.match_id, p.home_score, p.away_score, p.updated_at,
                 u.name as user_name, u.picture as user_picture
          FROM predictions p
          JOIN users u ON u.id = p.user_id
          WHERE p.user_id = ?`,
    args: [req.userId!],
  });
  res.json(result.rows);
});

router.get('/all', async (_req: AuthRequest, res: Response): Promise<void> => {
  const result = await db.execute({
    sql: `SELECT p.match_id, p.home_score, p.away_score,
                 u.name as user_name, u.picture as user_picture
          FROM predictions p
          JOIN users u ON u.id = p.user_id`,
    args: [],
  });
  res.json(result.rows);
});

router.put('/:matchId', async (req: AuthRequest, res: Response): Promise<void> => {
  const { matchId } = req.params;
  const { homeScore, awayScore } = req.body as { homeScore?: number; awayScore?: number };

  if (homeScore == null || awayScore == null || homeScore < 0 || awayScore < 0) {
    res.status(400).json({ error: 'homeScore and awayScore must be non-negative integers' }); return;
  }

  await db.execute({
    sql: `INSERT INTO predictions (user_id, match_id, home_score, away_score)
          VALUES (?, ?, ?, ?)
          ON CONFLICT (user_id, match_id) DO UPDATE SET
            home_score = excluded.home_score,
            away_score = excluded.away_score,
            updated_at = CURRENT_TIMESTAMP`,
    args: [req.userId!, matchId, Math.floor(homeScore), Math.floor(awayScore)],
  });

  res.json({ success: true });
});

export default router;
