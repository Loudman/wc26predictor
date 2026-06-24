import { Router, Request, Response } from 'express';
import db from '../db';
import { getWorldCupMatches } from '../services/footballData';
import { calcPoints, calcBasePoints, streakBonus } from '../utils/scoring';

const router = Router();

// GET /api/leaderboard
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const matches = await getWorldCupMatches('FINISHED');
    const finishedIds = new Set(matches.map(m => String(m.id)));
    const matchMap = new Map(
      matches
        .filter(m => m.score.fullTime.home !== null && m.score.fullTime.away !== null)
        .map(m => [String(m.id), m])
    );

    const { rows } = await db.execute({
      sql: `SELECT p.user_id, p.match_id, p.home_score, p.away_score,
                   u.name, u.email, u.picture, u.country
            FROM predictions p
            JOIN users u ON u.id = p.user_id`,
      args: [],
    });

    type UserStat = {
      id: number; name: string; email: string; picture: string; country: string | null;
      points: number; exact: number; correct: number; wrong: number; total: number;
      streak: number; bestStreak: number;
      matchResults: { utcDate: string; base: number }[];
    };

    const userStats = new Map<number, UserStat>();

    for (const row of rows) {
      const pred = row as unknown as {
        user_id: number; match_id: string; home_score: number; away_score: number;
        name: string; email: string; picture: string; country: string | null;
      };

      if (!finishedIds.has(pred.match_id)) continue;

      if (!userStats.has(pred.user_id)) {
        userStats.set(pred.user_id, {
          id: pred.user_id, name: pred.name, email: pred.email,
          picture: pred.picture, country: pred.country,
          points: 0, exact: 0, correct: 0, wrong: 0, total: 0,
          streak: 0, bestStreak: 0,
          matchResults: [],
        });
      }

      const stat = userStats.get(pred.user_id)!;
      stat.total += 1;

      const match = matchMap.get(pred.match_id);
      if (!match) continue;

      const base = calcBasePoints(
        pred.home_score, pred.away_score,
        match.score.fullTime.home!, match.score.fullTime.away!
      );
      stat.matchResults.push({ utcDate: match.utcDate, base });

      const pts = calcPoints(
        pred.home_score, pred.away_score,
        match.score.fullTime.home!, match.score.fullTime.away!,
        match.stage
      );

      if (base === 5) stat.exact += 1;
      else if (base >= 2) stat.correct += 1;
      else stat.wrong += 1;

      stat.points += pts;
    }

    // Apply streak bonus (sorted by match date)
    for (const stat of userStats.values()) {
      stat.matchResults.sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime());

      let currentStreak = 0;
      let bestStreak = 0;
      let streakBonusTotal = 0;

      for (const r of stat.matchResults) {
        if (r.base > 0) {
          currentStreak++;
          if (currentStreak > bestStreak) bestStreak = currentStreak;
          streakBonusTotal += streakBonus(currentStreak);
        } else {
          currentStreak = 0;
        }
      }

      stat.streak = currentStreak;
      stat.bestStreak = bestStreak;
      stat.points += streakBonusTotal;
    }

    const leaderboard = Array.from(userStats.values())
      .map(s => ({
        id: s.id, name: s.name, email: s.email, picture: s.picture, country: s.country,
        points: s.points, exact: s.exact, correct: s.correct, wrong: s.wrong, total: s.total,
        streak: s.streak, bestStreak: s.bestStreak,
      }))
      .sort((a, b) => b.points - a.points || b.exact - a.exact || b.correct - a.correct);

    res.json(leaderboard);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Leaderboard error:', message);
    res.status(502).json({ error: 'Failed to compute leaderboard', detail: message });
  }
});

// GET /api/leaderboard/mvp — top scorer in the most recently completed matchday
router.get('/mvp', async (_req: Request, res: Response): Promise<void> => {
  try {
    const matches = await getWorldCupMatches('FINISHED');
    if (matches.length === 0) { res.json(null); return; }

    // Find the most recent calendar date with finished matches
    const dates = matches.map(m => m.utcDate.slice(0, 10)).sort().reverse();
    const latestDate = dates[0];

    const dayMatches = matches.filter(
      m => m.utcDate.slice(0, 10) === latestDate &&
           m.score.fullTime.home !== null && m.score.fullTime.away !== null
    );
    if (dayMatches.length === 0) { res.json(null); return; }

    const dayMatchIds = dayMatches.map(m => String(m.id));
    const matchMap = new Map(dayMatches.map(m => [String(m.id), m]));

    const { rows } = await db.execute({
      sql: `SELECT p.user_id, p.match_id, p.home_score, p.away_score,
                   u.name, u.picture, u.country
            FROM predictions p
            JOIN users u ON u.id = p.user_id
            WHERE p.match_id IN (${dayMatchIds.map(() => '?').join(',')})`,
      args: dayMatchIds,
    });

    const userPts = new Map<number, { name: string; picture: string; country: string | null; points: number }>();

    for (const row of rows) {
      const pred = row as unknown as {
        user_id: number; match_id: string; home_score: number; away_score: number;
        name: string; picture: string; country: string | null;
      };
      const match = matchMap.get(pred.match_id);
      if (!match) continue;

      if (!userPts.has(pred.user_id)) {
        userPts.set(pred.user_id, { name: pred.name, picture: pred.picture, country: pred.country, points: 0 });
      }
      userPts.get(pred.user_id)!.points += calcPoints(
        pred.home_score, pred.away_score,
        match.score.fullTime.home!, match.score.fullTime.away!,
        match.stage
      );
    }

    if (userPts.size === 0) { res.json(null); return; }

    const [userId, mvp] = Array.from(userPts.entries()).sort((a, b) => b[1].points - a[1].points)[0];
    res.json({ userId, name: mvp.name, picture: mvp.picture, country: mvp.country, points: mvp.points, date: latestDate });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(502).json({ error: 'Failed to compute MVP', detail: message });
  }
});

// GET /api/leaderboard/recap — most recently completed matchday summary
router.get('/recap', async (_req: Request, res: Response): Promise<void> => {
  try {
    const matches = await getWorldCupMatches('FINISHED');
    if (matches.length === 0) { res.json(null); return; }

    const dates = matches.map(m => m.utcDate.slice(0, 10)).sort().reverse();
    const latestDate = dates[0];

    const dayMatches = matches.filter(
      m => m.utcDate.slice(0, 10) === latestDate &&
           m.score.fullTime.home !== null && m.score.fullTime.away !== null
    );
    if (dayMatches.length === 0) { res.json(null); return; }

    const dayMatchIds = dayMatches.map(m => String(m.id));
    const matchMap = new Map(dayMatches.map(m => [String(m.id), m]));

    const { rows } = await db.execute({
      sql: `SELECT p.user_id, p.match_id, p.home_score, p.away_score,
                   u.name, u.picture, u.country
            FROM predictions p
            JOIN users u ON u.id = p.user_id
            WHERE p.match_id IN (${dayMatchIds.map(() => '?').join(',')})`,
      args: dayMatchIds,
    });

    const userPts = new Map<number, { name: string; picture: string; country: string | null; pts: number; preds: number }>();

    for (const row of rows) {
      const pred = row as unknown as {
        user_id: number; match_id: string; home_score: number; away_score: number;
        name: string; picture: string; country: string | null;
      };
      const match = matchMap.get(pred.match_id);
      if (!match) continue;

      if (!userPts.has(pred.user_id)) {
        userPts.set(pred.user_id, { name: pred.name, picture: pred.picture, country: pred.country, pts: 0, preds: 0 });
      }
      const u = userPts.get(pred.user_id)!;
      u.pts += calcPoints(
        pred.home_score, pred.away_score,
        match.score.fullTime.home!, match.score.fullTime.away!,
        match.stage
      );
      u.preds += 1;
    }

    const standings = Array.from(userPts.entries())
      .map(([id, u]) => ({ id, ...u }))
      .sort((a, b) => b.pts - a.pts);

    const matchSummaries = dayMatches.map(m => ({
      id: m.id,
      homeTeam: m.homeTeam.shortName || m.homeTeam.name,
      awayTeam: m.awayTeam.shortName || m.awayTeam.name,
      homeScore: m.score.fullTime.home,
      awayScore: m.score.fullTime.away,
      stage: m.stage,
    }));

    res.json({
      date: latestDate,
      matchCount: dayMatches.length,
      standings,
      matches: matchSummaries,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(502).json({ error: 'Failed to compute recap', detail: message });
  }
});

export default router;
