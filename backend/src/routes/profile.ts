import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import db from '../db';
import { getWorldCupMatches } from '../services/footballData';
import { calcPoints, calcBasePoints, streakBonus } from '../utils/scoring';

const router = Router();
router.use(requireAuth);

interface BadgeDef {
  key: string;
  label: string;
  icon: string;
  description: string;
}

const BADGE_DEFS: BadgeDef[] = [
  { key: 'nostradamus', label: 'Nostradamus', icon: '🔮', description: '3 exact scores in a row' },
  { key: 'on_fire',     label: 'On Fire',     icon: '🔥', description: '5 correct outcomes in a row' },
  { key: 'hot_streak',  label: 'Hot Streak',  icon: '⚡', description: '10 correct outcomes in a row' },
  { key: 'perfect_day', label: 'Perfect Day', icon: '🏆', description: 'All predictions scored ≥2 pts in a matchday (min 3 matches)' },
  { key: 'sniper',      label: 'Sniper',      icon: '🎯', description: '≥70% exact rate with min 10 predictions' },
  { key: 'century',     label: 'Century Club', icon: '⭐', description: '100+ total points' },
];

// GET /api/profile/me
router.get('/me', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;

    // Fetch user
    const userResult = await db.execute({
      sql: 'SELECT id, name, email, picture, country FROM users WHERE id = ?',
      args: [userId],
    });
    if (!userResult.rows[0]) { res.status(404).json({ error: 'User not found' }); return; }
    const user = userResult.rows[0] as unknown as {
      id: number; name: string; email: string; picture: string; country: string | null;
    };

    // Fetch all finished matches
    const allMatches = await getWorldCupMatches('FINISHED');
    const matchMap = new Map(
      allMatches
        .filter(m => m.score.fullTime.home !== null && m.score.fullTime.away !== null)
        .map(m => [String(m.id), m])
    );

    // Fetch user's predictions
    const predResult = await db.execute({
      sql: 'SELECT match_id, home_score, away_score, updated_at FROM predictions WHERE user_id = ?',
      args: [userId],
    });

    type PredRow = { match_id: string; home_score: number; away_score: number; updated_at: string };

    // Build history (only finished matches with scores)
    const historyItems: {
      matchId: string; homeScore: number; awayScore: number;
      utcDate: string; stage: string; matchday: number | null;
      homeTeam: string; awayTeam: string;
      actualHome: number; actualAway: number;
      points: number; basePoints: number;
    }[] = [];

    for (const row of predResult.rows) {
      const pred = row as unknown as PredRow;
      const match = matchMap.get(pred.match_id);
      if (!match) continue;

      const base = calcBasePoints(
        pred.home_score, pred.away_score,
        match.score.fullTime.home!, match.score.fullTime.away!
      );
      const pts = calcPoints(
        pred.home_score, pred.away_score,
        match.score.fullTime.home!, match.score.fullTime.away!,
        match.stage
      );

      historyItems.push({
        matchId: pred.match_id,
        homeScore: pred.home_score,
        awayScore: pred.away_score,
        utcDate: match.utcDate,
        stage: match.stage,
        matchday: match.matchday,
        homeTeam: match.homeTeam.shortName || match.homeTeam.name || '',
        awayTeam: match.awayTeam.shortName || match.awayTeam.name || '',
        actualHome: match.score.fullTime.home!,
        actualAway: match.score.fullTime.away!,
        points: pts,
        basePoints: base,
      });
    }

    // Sort by date desc for display
    historyItems.sort((a, b) => new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime());

    // Compute stats (streaks need chronological order)
    const chronological = [...historyItems].sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime());

    let totalPoints = 0;
    let exactCount = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let currentStreak = 0;
    let bestStreak = 0;
    let streakBonusTotal = 0;

    // Also track exact streaks for badge
    let exactStreak = 0;
    let bestExactStreak = 0;
    let correctStreakForBadge = 0;
    let bestCorrectStreak = 0;

    for (const item of chronological) {
      totalPoints += item.points;
      if (item.basePoints === 5) {
        exactCount++;
        exactStreak++;
        if (exactStreak > bestExactStreak) bestExactStreak = exactStreak;
      } else {
        exactStreak = 0;
      }
      if (item.basePoints >= 2) {
        correctCount++;
        correctStreakForBadge++;
        if (correctStreakForBadge > bestCorrectStreak) bestCorrectStreak = correctStreakForBadge;
      } else {
        correctStreakForBadge = 0;
      }
      if (item.basePoints === 0) wrongCount++;

      if (item.basePoints > 0) {
        currentStreak++;
        if (currentStreak > bestStreak) bestStreak = currentStreak;
        streakBonusTotal += streakBonus(currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    totalPoints += streakBonusTotal;
    const totalPredictions = historyItems.length;
    const exactRate = totalPredictions >= 1 ? exactCount / totalPredictions : 0;

    // Accuracy by matchday / stage
    const byMatchday = new Map<string, { pts: number; matches: number }>();
    for (const item of chronological) {
      const key = item.stage === 'GROUP_STAGE'
        ? `Matchday ${item.matchday ?? '?'}`
        : item.stage.replace(/_/g, ' ');
      if (!byMatchday.has(key)) byMatchday.set(key, { pts: 0, matches: 0 });
      byMatchday.get(key)!.pts += item.points;
      byMatchday.get(key)!.matches += 1;
    }

    // Compute "perfect day" badge: group preds by calendar date
    const byDate = new Map<string, { base: number }[]>();
    for (const item of chronological) {
      const d = item.utcDate.slice(0, 10);
      if (!byDate.has(d)) byDate.set(d, []);
      byDate.get(d)!.push({ base: item.basePoints });
    }
    let hasPerfectDay = false;
    for (const dayPreds of byDate.values()) {
      if (dayPreds.length >= 3 && dayPreds.every(p => p.base >= 2)) {
        hasPerfectDay = true;
        break;
      }
    }

    // Determine which badges user has earned
    const earnedKeys = new Set<string>();
    if (bestExactStreak >= 3) earnedKeys.add('nostradamus');
    if (bestCorrectStreak >= 5) earnedKeys.add('on_fire');
    if (bestCorrectStreak >= 10) earnedKeys.add('hot_streak');
    if (hasPerfectDay) earnedKeys.add('perfect_day');
    if (totalPredictions >= 10 && exactRate >= 0.7) earnedKeys.add('sniper');
    if (totalPoints >= 100) earnedKeys.add('century');

    // Upsert newly earned badges
    for (const key of earnedKeys) {
      await db.execute({
        sql: `INSERT OR IGNORE INTO badges (user_id, badge_key) VALUES (?, ?)`,
        args: [userId, key],
      });
    }

    // Fetch all earned badges with timestamps
    const badgeResult = await db.execute({
      sql: 'SELECT badge_key, earned_at FROM badges WHERE user_id = ?',
      args: [userId],
    });

    const badges = badgeResult.rows
      .map(r => {
        const row = r as unknown as { badge_key: string; earned_at: string };
        const def = BADGE_DEFS.find(b => b.key === row.badge_key);
        if (!def) return null;
        return { key: def.key, label: def.label, icon: def.icon, description: def.description, earnedAt: row.earned_at };
      })
      .filter(Boolean);

    res.json({
      user: { id: user.id, name: user.name, email: user.email, picture: user.picture, country: user.country },
      stats: {
        totalPoints,
        totalPredictions,
        exactCount,
        exactRate: Math.round(exactRate * 100),
        correctCount,
        wrongCount,
        currentStreak,
        bestStreak,
      },
      badges,
      accuracyByMatchday: Array.from(byMatchday.entries()).map(([label, v]) => ({ label, pts: v.pts, matches: v.matches })),
      history: historyItems.slice(0, 20),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Profile error:', message);
    res.status(502).json({ error: 'Failed to load profile', detail: message });
  }
});

export default router;
