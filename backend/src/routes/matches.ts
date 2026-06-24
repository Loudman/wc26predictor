import { Router, Request, Response } from 'express';
import { getWorldCupMatches, FDMatch } from '../services/footballData';

const router = Router();

let matchCache: { data: FDMatch[]; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 2 * 60 * 1000;

router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    if (matchCache && Date.now() - matchCache.fetchedAt < CACHE_TTL_MS) {
      res.json(matchCache.data);
      return;
    }

    const matches = await getWorldCupMatches();
    matchCache = { data: matches, fetchedAt: Date.now() };
    res.json(matches);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Failed to fetch matches:', message);
    res.status(502).json({ error: 'Failed to fetch match data', detail: message });
  }
});

export default router;
