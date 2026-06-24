import axios from 'axios';

const client = axios.create({
  baseURL: 'https://api.football-data.org/v4',
  headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY },
  timeout: 10000,
});

export interface FDTeam {
  id: number | null;
  name: string | null;
  shortName: string | null;
  tla: string | null;
  crest: string | null;
}

export interface FDScore {
  winner: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null;
  fullTime: { home: number | null; away: number | null };
  halfTime: { home: number | null; away: number | null };
}

export interface FDMatch {
  id: number;
  utcDate: string;
  status: 'SCHEDULED' | 'TIMED' | 'IN_PLAY' | 'PAUSED' | 'FINISHED' | 'POSTPONED' | 'SUSPENDED' | 'CANCELLED';
  matchday: number | null;
  stage: string;
  group: string | null;
  homeTeam: FDTeam;
  awayTeam: FDTeam;
  score: FDScore;
  venue?: string;
  referees?: { name: string; role: string }[];
}

export async function getWorldCupMatches(status?: string): Promise<FDMatch[]> {
  const params: Record<string, string> = {};
  if (status) params.status = status;

  const res = await client.get('/competitions/WC/matches', { params });
  return res.data.matches as FDMatch[];
}

export async function getMatch(matchId: number): Promise<FDMatch> {
  const res = await client.get(`/matches/${matchId}`);
  return res.data as FDMatch;
}
