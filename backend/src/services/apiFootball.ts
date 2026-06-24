import axios from 'axios';

const client = axios.create({
  baseURL: 'https://api-football-v1.p.rapidapi.com/v3',
  headers: {
    'X-RapidAPI-Key': process.env.RAPIDAPI_KEY ?? '',
    'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com',
  },
  timeout: 8000,
});

// Known mismatches between football-data.org and API-Football team names
const NAME_ALIASES: Record<string, string> = {
  'united states': 'usa',
  'south korea': 'korea republic',
  'ivory coast': "cote d'ivoire",
  'dr congo': 'dr congo',
  'trinidad & tobago': 'trinidad and tobago',
};

function normalize(name: string): string {
  const lower = name.toLowerCase().trim();
  return NAME_ALIASES[lower] ?? lower;
}

function teamsMatch(a: string, b: string): boolean {
  const na = normalize(a).replace(/[^a-z]/g, '');
  const nb = normalize(b).replace(/[^a-z]/g, '');
  return na.slice(0, 6) === nb.slice(0, 6) || na.includes(nb.slice(0, 5)) || nb.includes(na.slice(0, 5));
}

export interface TipResult {
  homePercent: number;
  drawPercent: number;
  awayPercent: number;
  advice: string;
  winner: string | null;
  avgHomeGoals: number | null;
  avgAwayGoals: number | null;
}

// date → fixture list cache
const fixtureCache = new Map<string, { id: number; homeTeam: string; awayTeam: string }[]>();

async function getFixturesForDate(date: string) {
  if (fixtureCache.has(date)) return fixtureCache.get(date)!;
  const res = await client.get('/fixtures', {
    params: { date, league: 1, season: 2026 },
  });
  const response = res.data.response;
  if (!Array.isArray(response)) {
    console.error('API-Football fixtures unexpected response:', JSON.stringify(res.data).slice(0, 200));
    return [];
  }
  const fixtures = (response as {
    fixture: { id: number };
    teams: { home: { name: string }; away: { name: string } };
  }[]).map(f => ({
    id: f.fixture.id,
    homeTeam: f.teams.home.name,
    awayTeam: f.teams.away.name,
  }));
  fixtureCache.set(date, fixtures);
  return fixtures;
}

// fixtureId → prediction cache (1 hour TTL)
const predCache = new Map<number, { data: TipResult; fetchedAt: number }>();
const PRED_TTL = 60 * 60 * 1000;

export async function getTipsForMatch(
  utcDate: string,
  homeTeamName: string,
  awayTeamName: string,
): Promise<TipResult | null> {
  const date = utcDate.slice(0, 10);
  const fixtures = await getFixturesForDate(date);

  const fixture = fixtures.find(
    f => teamsMatch(f.homeTeam, homeTeamName) && teamsMatch(f.awayTeam, awayTeamName),
  );
  if (!fixture) return null;

  const cached = predCache.get(fixture.id);
  if (cached && Date.now() - cached.fetchedAt < PRED_TTL) return cached.data;

  const res = await client.get('/predictions', { params: { fixture: fixture.id } });
  const pred = res.data.response?.[0] as {
    predictions: {
      winner: { name: string } | null;
      goals: { home: string | null; away: string | null };
      advice: string;
      percent: { home: string; draw: string; away: string };
    };
  } | undefined;

  if (!pred) return null;

  const result: TipResult = {
    homePercent: parseInt(pred.predictions.percent.home) || 0,
    drawPercent: parseInt(pred.predictions.percent.draw) || 0,
    awayPercent: parseInt(pred.predictions.percent.away) || 0,
    advice: pred.predictions.advice ?? '',
    winner: pred.predictions.winner?.name ?? null,
    avgHomeGoals: pred.predictions.goals.home != null ? parseFloat(pred.predictions.goals.home) : null,
    avgAwayGoals: pred.predictions.goals.away != null ? parseFloat(pred.predictions.goals.away) : null,
  };

  predCache.set(fixture.id, { data: result, fetchedAt: Date.now() });
  return result;
}
