import { Router, Request, Response } from 'express';
import db from '../db';
import { getWorldCupMatches } from '../services/footballData';

const router = Router();

function calcPoints(predHome: number, predAway: number, actualHome: number, actualAway: number): number {
  const goalError = Math.abs(predHome - actualHome) + Math.abs(predAway - actualAway);
  if (goalError === 0) return 5;
  if (Math.sign(predHome - predAway) !== Math.sign(actualHome - actualAway)) return 0;
  if (goalError === 1) return 4;
  if (goalError === 2) return 3;
  return 2;
}

router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const matches = await getWorldCupMatches('FINISHED');
    const finishedIds = new Set(matches.map(m => String(m.id)));
    const resultMap = new Map(
      matches
        .filter(m => m.score.fullTime.home !== null && m.score.fullTime.away !== null)
        .map(m => [String(m.id), { home: m.score.fullTime.home!, away: m.score.fullTime.away! }])
    );

    const { rows } = await db.execute({
      sql: `SELECT p.user_id, p.match_id, p.home_score, p.away_score,
                   u.name, u.email, u.picture
            FROM predictions p
            JOIN users u ON u.id = p.user_id`,
      args: [],
    });

    const userStats = new Map<number, {
      id: number; name: string; email: string; picture: string;
      points: number; exact: number; correct: number; wrong: number; total: number;
    }>();

    for (const row of rows) {
      const pred = row as unknown as {
        user_id: number; match_id: string; home_score: number; away_score: number;
        name: string; email: string; picture: string;
      };

      if (!finishedIds.has(pred.match_id)) continue;

      if (!userStats.has(pred.user_id)) {
        userStats.set(pred.user_id, {
          id: pred.user_id, name: pred.name, email: pred.email, picture: pred.picture,
          points: 0, exact: 0, correct: 0, wrong: 0, total: 0,
        });
      }

      const stat = userStats.get(pred.user_id)!;
      stat.total += 1;

      const result = resultMap.get(pred.match_id);
      if (!result) continue;

      const pts = calcPoints(pred.home_score, pred.away_score, result.home, result.away);
      stat.points += pts;
      if (pts === 5) stat.exact += 1;
      else if (pts === 2) stat.correct += 1;
      else stat.wrong += 1;
    }

    const leaderboard = Array.from(userStats.values())
      .sort((a, b) => b.points - a.points || b.exact - a.exact || b.correct - a.correct);

    res.json(leaderboard);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Leaderboard error:', message);
    res.status(502).json({ error: 'Failed to compute leaderboard', detail: message });
  }
});

export default router;
