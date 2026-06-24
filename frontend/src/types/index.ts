export interface User {
  id: number;
  name: string;
  email: string;
  picture: string;
  country?: string | null;
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
  country?: string | null;
  points: number;
  exact: number;
  correct: number;
  wrong: number;
  total: number;
  streak?: number;
  bestStreak?: number;
}

export type MatchFilter = 'all' | 'upcoming' | 'live' | 'finished';

export interface Badge {
  key: string;
  label: string;
  icon: string;
  description: string;
  earnedAt: string;
}

export interface OutrightPick {
  champion: string | null;
  finalist: string | null;
  dark_horse: string | null;
}

export interface ProfileStats {
  totalPoints: number;
  totalPredictions: number;
  exactCount: number;
  exactRate: number;
  correctCount: number;
  wrongCount: number;
  currentStreak: number;
  bestStreak: number;
}

export interface HistoryEntry {
  matchId: string;
  homeScore: number;
  awayScore: number;
  utcDate: string;
  stage: string;
  matchday: number | null;
  homeTeam: string;
  awayTeam: string;
  actualHome: number;
  actualAway: number;
  points: number;
  basePoints: number;
}

export interface RecapEntry {
  date: string;
  matchCount: number;
  standings: { id: number; name: string; picture: string; country: string | null; pts: number; preds: number }[];
  matches: { id: number; homeTeam: string; awayTeam: string; homeScore: number | null; awayScore: number | null; stage: string }[];
}

export interface MvpEntry {
  userId: number;
  name: string;
  picture: string;
  country: string | null;
  points: number;
  date: string;
}
