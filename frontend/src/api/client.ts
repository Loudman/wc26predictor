import axios from 'axios';
import { Match, Prediction, LeaderboardEntry, Badge, OutrightPick, ProfileStats, HistoryEntry, RecapEntry, MvpEntry } from '../types';

const BASE = import.meta.env.VITE_API_URL ?? '/api';
const http = axios.create({ baseURL: BASE });

http.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

interface AuthResponse {
  token: string;
  user: { id: number; name: string; email: string; picture: string; country?: string | null };
}

export const authApi = {
  loginWithGoogle: (credential: string) =>
    http.post<AuthResponse>('/auth/google', { credential }).then(r => r.data),
  register: (name: string, email: string, password: string) =>
    http.post<AuthResponse>('/auth/register', { name, email, password }).then(r => r.data),
  login: (email: string, password: string) =>
    http.post<AuthResponse>('/auth/login', { email, password }).then(r => r.data),
  me: () => http.get<{ user: { id: number; name: string; email: string; picture: string; country?: string | null } }>('/auth/me').then(r => r.data),
  updateName: (name: string) => http.put<{ name: string }>('/auth/name', { name }).then(r => r.data),
  updateCountry: (country: string | null) => http.put<{ country: string | null }>('/auth/country', { country }).then(r => r.data),
  getUsers: () => http.get<{ id: number; name: string; email: string; picture: string; country?: string | null }[]>('/auth/users').then(r => r.data),
};

export const matchesApi = {
  getAll: () => http.get<Match[]>('/matches').then(r => r.data),
};

export const predictionsApi = {
  getMine: () => http.get<Prediction[]>('/predictions').then(r => r.data),
  getAll: () => http.get<Prediction[]>('/predictions/all').then(r => r.data),
  save: (matchId: string | number, homeScore: number, awayScore: number) =>
    http.put(`/predictions/${matchId}`, { homeScore, awayScore }).then(r => r.data),
};

export const leaderboardApi = {
  get: () => http.get<LeaderboardEntry[]>('/leaderboard').then(r => r.data),
  mvp: () => http.get<MvpEntry | null>('/leaderboard/mvp').then(r => r.data),
  recap: () => http.get<RecapEntry | null>('/leaderboard/recap').then(r => r.data),
};

export interface ProfileResponse {
  user: { id: number; name: string; email: string; picture: string; country: string | null };
  stats: ProfileStats;
  badges: Badge[];
  accuracyByMatchday: { label: string; pts: number; matches: number }[];
  history: HistoryEntry[];
}

export const profileApi = {
  getMe: () => http.get<ProfileResponse>('/profile/me').then(r => r.data),
};

export interface TipResult {
  homePercent: number;
  drawPercent: number;
  awayPercent: number;
  advice: string;
  winner: string | null;
  avgHomeGoals: number | null;
  avgAwayGoals: number | null;
}

export const tipsApi = {
  get: (matchId: number) => http.get<TipResult>(`/tips/${matchId}`).then(r => r.data),
};

export const outrightApi = {
  getMine: () => http.get<OutrightPick>('/outright').then(r => r.data),
  save: (picks: OutrightPick) => http.put<{ success: boolean }>('/outright', picks).then(r => r.data),
  getAll: () => http.get<(OutrightPick & { user_id: number; name: string; picture: string; country: string | null })[]>('/outright/all').then(r => r.data),
};
