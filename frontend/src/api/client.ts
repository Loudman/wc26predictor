import axios from 'axios';
import { Match, Prediction, LeaderboardEntry } from '../types';

const BASE = import.meta.env.VITE_API_URL ?? '/api';
const http = axios.create({ baseURL: BASE });

http.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

interface AuthResponse {
  token: string;
  user: { id: number; name: string; email: string; picture: string };
}

export const authApi = {
  loginWithGoogle: (credential: string) =>
    http.post<AuthResponse>('/auth/google', { credential }).then(r => r.data),
  register: (name: string, email: string, password: string) =>
    http.post<AuthResponse>('/auth/register', { name, email, password }).then(r => r.data),
  login: (email: string, password: string) =>
    http.post<AuthResponse>('/auth/login', { email, password }).then(r => r.data),
  me: () => http.get<{ user: { id: number; name: string; email: string; picture: string } }>('/auth/me').then(r => r.data),
  updateName: (name: string) => http.put<{ name: string }>('/auth/name', { name }).then(r => r.data),
  getUsers: () => http.get<{ id: number; name: string; email: string; picture: string }[]>('/auth/users').then(r => r.data),
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
};
