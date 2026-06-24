import { Router, Request, Response } from 'express';
import axios from 'axios';
import { getWorldCupMatches } from '../services/footballData';
import { getTipsForMatch, getFixturesDebug } from '../services/apiFootball';

const router = Router();

// Diagnostic endpoint — returns key status + a raw API-Football probe
router.get('/status', async (_req: Request, res: Response): Promise<void> => {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) { res.json({ ok: false, reason: 'API_FOOTBALL_KEY not set' }); return; }

  try {
    const probe = await axios.get('https://v3.football.api-sports.io/status', {
      headers: { 'x-apisports-key': key },
      timeout: 6000,
    });
    res.json({ ok: true, apiFootball: probe.data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.json({ ok: false, reason: message });
  }
});

router.get('/:matchId', async (req: Request, res: Response): Promise<void> => {
  if (!process.env.API_FOOTBALL_KEY) {
    res.status(501).json({ error: 'API_FOOTBALL_KEY not set in environment' });
    return;
  }

  const matchId = parseInt(req.params.matchId);
  if (isNaN(matchId)) { res.status(400).json({ error: 'Invalid match ID' }); return; }

  try {
    const matches = await getWorldCupMatches();
    const match = matches.find(m => m.id === matchId);
    if (!match) { res.status(404).json({ error: 'Match not found' }); return; }

    const tips = await getTipsForMatch(
      match.utcDate,
      match.homeTeam.name ?? '',
      match.awayTeam.name ?? '',
    );

    if (!tips) {
      const debug = await getFixturesDebug(match.utcDate.slice(0, 10));
      res.status(404).json({
        error: 'No tips available for this fixture',
        searched: { date: match.utcDate.slice(0, 10), homeTeam: match.homeTeam.name, awayTeam: match.awayTeam.name },
        apiFootballFixtures: debug,
      });
      return;
    }
    res.json(tips);
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error('Tips error:', detail);
    res.status(502).json({ error: 'Failed to fetch tips', detail });
  }
});

export default router;
