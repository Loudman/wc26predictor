import { useState, useEffect } from 'react';
import { leaderboardApi } from '../api/client';
import { LeaderboardEntry, MvpEntry, RecapEntry } from '../types';
import { useAuth } from '../App';
import { countryFlag } from '../data/nations';
import clsx from 'clsx';

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [mvp, setMvp] = useState<MvpEntry | null>(null);
  const [recap, setRecap] = useState<RecapEntry | null>(null);
  const [recapOpen, setRecapOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      leaderboardApi.get(),
      leaderboardApi.mvp().catch(() => null),
      leaderboardApi.recap().catch(() => null),
    ])
      .then(([lb, m, r]) => { setEntries(lb); setMvp(m); setRecap(r); })
      .catch(() => setError('Failed to load leaderboard.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-wc-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-600 text-sm">No finished matches yet — leaderboard updates after the first game ends.</p>
      </div>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-white mb-6">Leaderboard</h1>

      {/* MVP card */}
      {mvp && (
        <div className="mb-4 bg-wc-gold/10 border border-wc-gold/30 rounded-2xl p-4 flex items-center gap-4">
          <span className="text-3xl">👑</span>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <img
              src={mvp.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(mvp.name)}&background=006847&color=fff`}
              alt={mvp.name}
              className="w-10 h-10 rounded-full border-2 border-wc-gold flex-shrink-0"
            />
            <div className="min-w-0">
              <p className="text-xs text-wc-gold uppercase tracking-wide font-semibold mb-0.5">Matchday MVP</p>
              <p className="text-white font-bold truncate">
                {countryFlag(mvp.country) && <span className="mr-1">{countryFlag(mvp.country)}</span>}
                {mvp.name}
              </p>
              <p className="text-xs text-gray-400">{mvp.date} · {mvp.points} pts</p>
            </div>
          </div>
        </div>
      )}

      {/* Recap section */}
      {recap && (
        <div className="mb-4 bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden">
          <button
            onClick={() => setRecapOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-800 transition-colors"
          >
            <span className="font-semibold text-white text-sm">📋 Latest Matchday Recap — {recap.date}</span>
            <svg className={clsx('w-4 h-4 text-gray-400 transition-transform', recapOpen && 'rotate-180')}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {recapOpen && (
            <div className="border-t border-gray-800 px-4 py-3 space-y-4">
              {/* Match results */}
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Results</p>
                <div className="space-y-1.5">
                  {recap.matches.map(m => (
                    <div key={m.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-300">{m.homeTeam}</span>
                      <span className="font-bold text-white mx-2">{m.homeScore} – {m.awayScore}</span>
                      <span className="text-gray-300">{m.awayTeam}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Day standings */}
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Day standings</p>
                <div className="space-y-1">
                  {recap.standings.map((s, i) => (
                    <div key={s.id} className="flex items-center gap-2 text-sm">
                      <span className="text-gray-600 w-4 text-right text-xs">{i + 1}</span>
                      <img
                        src={s.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=006847&color=fff`}
                        alt={s.name}
                        className="w-6 h-6 rounded-full flex-shrink-0"
                      />
                      <span className="flex-1 text-gray-200 truncate">
                        {countryFlag(s.country) && <span className="mr-1">{countryFlag(s.country)}</span>}
                        {s.name}
                      </span>
                      <span className="font-bold text-wc-gold">{s.pts}pts</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main leaderboard table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_repeat(4,auto)] px-4 py-2 text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800 gap-4">
          <span>#</span>
          <span>Player</span>
          <span className="text-right">Exact</span>
          <span className="text-right">Outcome</span>
          <span className="text-right">Wrong</span>
          <span className="text-right font-bold text-gray-300">Pts</span>
        </div>

        {entries.map((entry, i) => {
          const isMe = entry.id === user?.id;
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
          const flag = countryFlag(entry.country);
          const hasStreak = (entry.streak ?? 0) >= 3;

          return (
            <div
              key={entry.id}
              className={clsx(
                'grid grid-cols-[auto_1fr_repeat(4,auto)] px-4 py-3 gap-4 items-center',
                'border-b border-gray-800 last:border-0 transition-colors',
                isMe ? 'bg-wc-green/10' : 'hover:bg-gray-800/50'
              )}
            >
              <span className="text-sm text-gray-500 w-5">
                {medal ?? <span className="text-gray-600">{i + 1}</span>}
              </span>

              <div className="flex items-center gap-2 min-w-0">
                <img
                  src={entry.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(entry.name)}&background=006847&color=fff`}
                  alt={entry.name}
                  className="w-7 h-7 rounded-full flex-shrink-0"
                />
                <span className={clsx('text-sm truncate', isMe ? 'text-white font-semibold' : 'text-gray-200')}>
                  {flag && <span className="mr-1">{flag}</span>}
                  {entry.name} {isMe && <span className="text-wc-gold text-xs">(you)</span>}
                </span>
              </div>

              <span className="text-sm text-right text-wc-gold font-medium">{entry.exact}</span>
              <span className="text-sm text-right text-green-400">{entry.correct}</span>
              <span className="text-sm text-right text-red-400">{entry.wrong}</span>
              <span className="text-sm text-right font-bold text-white flex items-center gap-1 justify-end">
                {hasStreak && <span title={`${entry.streak} match streak`}>🔥</span>}
                {entry.points}
              </span>
            </div>
          );
        })}
      </div>

      {/* Scoring legend */}
      <div className="mt-4 space-y-1">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Scoring</p>
        <div className="flex flex-wrap gap-3 text-xs text-gray-600">
          <span><span className="text-wc-gold font-bold">5pts</span> exact score</span>
          <span><span className="text-yellow-400 font-bold">4pts</span> right outcome ±1</span>
          <span><span className="text-green-400 font-bold">3pts</span> right outcome ±2</span>
          <span><span className="text-green-600 font-bold">2pts</span> right outcome</span>
          <span><span className="text-red-400 font-bold">0pts</span> wrong</span>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-gray-600 mt-1">
          <span><span className="text-wc-gold font-bold">⚡ 1.5×</span> Round of 16</span>
          <span><span className="text-wc-gold font-bold">⚡ 2×</span> Quarter-finals</span>
          <span><span className="text-wc-gold font-bold">⚡ 3×</span> Semi-finals</span>
          <span><span className="text-wc-gold font-bold">⚡ 4×</span> Final</span>
        </div>
        <p className="text-xs text-gray-600 mt-1">
          <span className="font-bold">🔥 Streak bonus:</span> 3–4 correct +1/match · 5–9 +2/match · 10+ +3/match
        </p>
      </div>
    </main>
  );
}
