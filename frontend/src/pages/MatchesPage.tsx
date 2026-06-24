import { useState, useEffect } from 'react';
import { matchesApi, predictionsApi } from '../api/client';
import { Match, Prediction, MatchFilter } from '../types';
import MatchCard from '../components/MatchCard';
import PredictionModal from '../components/PredictionModal';
import clsx from 'clsx';

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [myPreds, setMyPreds] = useState<Prediction[]>([]);
  const [allPreds, setAllPreds] = useState<Prediction[]>([]);
  const [filter, setFilter] = useState<MatchFilter>('upcoming');
  const [selected, setSelected] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([matchesApi.getAll(), predictionsApi.getMine(), predictionsApi.getAll()])
      .then(([m, my, all]) => { setMatches(m); setMyPreds(my); setAllPreds(all); })
      .catch(() => setError('Failed to load matches. Make sure the backend is running and API keys are set.'))
      .finally(() => setLoading(false));
  }, []);

  function handleSaved(pred: Prediction) {
    setMyPreds(prev => {
      const idx = prev.findIndex(p => p.match_id === pred.match_id);
      if (idx >= 0) return prev.map((p, i) => i === idx ? pred : p);
      return [...prev, pred];
    });
    setSelected(null);
  }

  const filtered = matches.filter(m => {
    if (filter === 'upcoming') return m.status === 'SCHEDULED' || m.status === 'TIMED';
    if (filter === 'live') return m.status === 'IN_PLAY' || m.status === 'PAUSED';
    if (filter === 'finished') return m.status === 'FINISHED';
    return true;
  });

  const sorted = filter === 'finished'
    ? [...filtered].sort((a, b) => new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime())
    : filtered;

  const grouped = groupByDate(sorted);

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
        <p className="text-gray-600 text-xs mt-2">Check the console for details.</p>
      </div>
    );
  }

  const filters: { label: string; value: MatchFilter }[] = [
    { label: 'Upcoming', value: 'upcoming' },
    { label: 'Live', value: 'live' },
    { label: 'Finished', value: 'finished' },
    { label: 'All', value: 'all' },
  ];

  return (
    <main className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        {filters.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={clsx(
              'px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
              filter === f.value
                ? 'bg-wc-green text-white'
                : 'text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-gray-600 py-16">No {filter} matches right now.</p>
      ) : (
        <div className="flex flex-col gap-8">
          {grouped.map(({ date, matches: dayMatches }) => (
            <section key={date}>
              <h2 className="text-xs text-gray-500 uppercase tracking-widest mb-3 font-medium">{date}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {dayMatches.map(m => (
                  <MatchCard
                    key={m.id}
                    match={m}
                    myPrediction={myPreds.find(p => p.match_id === String(m.id))}
                    onClick={() => setSelected(m)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {selected && (
        <PredictionModal
          match={selected}
          existing={myPreds.find(p => p.match_id === String(selected.id))}
          allPredictions={allPreds}
          onClose={() => setSelected(null)}
          onSaved={handleSaved}
        />
      )}
    </main>
  );
}

function groupByDate(matches: Match[]): { date: string; matches: Match[] }[] {
  const map = new Map<string, Match[]>();
  for (const m of matches) {
    const key = new Date(m.utcDate).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric',
    });
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
  }
  return Array.from(map.entries()).map(([date, matches]) => ({ date, matches }));
}
