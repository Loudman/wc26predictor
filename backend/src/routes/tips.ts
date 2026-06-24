import { Router, Request, Response } from 'express';
import { getWorldCupMatches } from '../services/footballData';
import { getTipsForMatch } from '../services/apiFootball';

const router = Router();

router.get('/:matchId', async (req: Request, res: Response): Promise<void> => {
  if (!process.env.RAPIDAPI_KEY) {
    res.status(501).json({ error: 'Tips not configured' });
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

    if (!tips) { res.status(404).json({ error: 'No tips available' }); return; }
    res.json(tips);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Tips error:', message);
    res.status(502).json({ error: 'Failed to fetch tips', detail: message });
  }
});

export default router;
