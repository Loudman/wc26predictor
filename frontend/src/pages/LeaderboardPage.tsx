import { useState, useEffect } from 'react';
import { leaderboardApi } from '../api/client';
import { LeaderboardEntry } from '../types';
import { useAuth } from '../App';
import clsx from 'clsx';

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    leaderboardApi.get()
      .then(setEntries)
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
                <img src={entry.picture} alt={entry.name} className="w-7 h-7 rounded-full flex-shrink-0" />
                <span className={clsx('text-sm truncate', isMe ? 'text-white font-semibold' : 'text-gray-200')}>
                  {entry.name} {isMe && <span className="text-wc-gold text-xs">(you)</span>}
                </span>
              </div>

              <span className="text-sm text-right text-wc-gold font-medium">{entry.exact}</span>
              <span className="text-sm text-right text-green-400">{entry.correct}</span>
              <span className="text-sm text-right text-red-400">{entry.wrong}</span>
              <span className="text-sm text-right font-bold text-white">{entry.points}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-600">
        <span><span className="text-wc-gold font-bold">5pts</span> exact score</span>
        <span><span className="text-yellow-400 font-bold">4pts</span> right outcome ±1 goal</span>
        <span><span className="text-green-400 font-bold">3pts</span> right outcome ±2 goals</span>
        <span><span className="text-green-600 font-bold">2pts</span> right outcome</span>
        <span><span className="text-red-400 font-bold">0pts</span> wrong</span>
      </div>
    </main>
  );
}
