export interface User {
  id: number;
  name: string;
  email: string;
  picture: string;
}

export interface Team {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
}

export interface Match {
  id: number;
  utcDate: string;
  status: 'SCHEDULED' | 'TIMED' | 'IN_PLAY' | 'PAUSED' | 'FINISHED' | 'POSTPONED' | 'SUSPENDED' | 'CANCELLED';
  matchday: number | null;
  stage: string;
  group: string | null;
  homeTeam: Team;
  awayTeam: Team;
  score: {
    winner: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null;
    fullTime: { home: number | null; away: number | null };
    halfTime: { home: number | null; away: number | null };
  };
}

export interface Prediction {
  match_id: string;
  home_score: number;
  away_score: number;
  updated_at?: string;
  user_name?: string;
  user_picture?: string;
}

export interface LeaderboardEntry {
  id: number;
  name: string;
  email: string;
  picture: string;
  points: number;
  exact: number;
  correct: number;
  wrong: number;
  total: number;
}

export type MatchFilter = 'all' | 'upcoming' | 'live' | 'finished';
