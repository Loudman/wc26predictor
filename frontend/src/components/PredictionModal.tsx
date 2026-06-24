import { useState } from 'react';
import { Match, Prediction } from '../types';
import { predictionsApi } from '../api/client';

interface Props {
  match: Match;
  existing: Prediction | undefined;
  allPredictions: Prediction[];
  onClose: () => void;
  onSaved: (pred: Prediction) => void;
}

export default function PredictionModal({ match, existing, allPredictions, onClose, onSaved }: Props) {
  const [home, setHome] = useState(existing?.home_score ?? 0);
  const [away, setAway] = useState(existing?.away_score ?? 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isLocked = match.status === 'IN_PLAY' || match.status === 'PAUSED' || match.status === 'FINISHED';

  async function save() {
    if (isLocked) return;
    setSaving(true);
    setError('');
    try {
      await predictionsApi.save(match.id, home, away);
      onSaved({ match_id: String(match.id), home_score: home, away_score: away });
    } catch {
      setError('Failed to save prediction. Try again.');
    } finally {
      setSaving(false);
    }
  }

  const matchDate = new Date(match.utcDate);
  const friendlyPreds = allPredictions.filter(p => p.match_id === String(match.id) && p.user_name);

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Match header */}
        <div className="bg-gray-800 px-6 py-4 flex items-center justify-between">
          <div className="text-xs text-gray-400 uppercase tracking-wider">
            {match.stage.replace(/_/g, ' ')} · {match.group ?? 'Knockout'}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors text-xl">&times;</button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-6">
          {/* Teams */}
          <div className="flex items-center justify-between gap-4">
            <TeamBadge team={match.homeTeam} />
            <span className="text-gray-500 text-sm font-medium">vs</span>
            <TeamBadge team={match.awayTeam} align="right" />
          </div>

          <p className="text-center text-xs text-gray-500">
            {matchDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}{' '}
            · {matchDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </p>

          {/* Score input */}
          {!isLocked ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-gray-400 text-center">Your prediction</p>
              <div className="flex items-center justify-center gap-4">
                <ScoreInput value={home} onChange={setHome} label={match.homeTeam.tla} />
                <span className="text-2xl font-bold text-gray-600">–</span>
                <ScoreInput value={away} onChange={setAway} label={match.awayTeam.tla} />
              </div>
              {error && <p className="text-red-400 text-xs text-center">{error}</p>}
              <button
                onClick={save}
                disabled={saving}
                className="mt-2 bg-wc-green hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors"
              >
                {saving ? 'Saving…' : existing ? 'Update prediction' : 'Submit prediction'}
              </button>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm text-amber-400 font-medium">
                {match.status === 'FINISHED' ? 'Match finished' : 'Match in progress — locked'}
              </p>
              {match.score.fullTime.home !== null && (
                <p className="text-3xl font-extrabold text-white mt-1">
                  {match.score.fullTime.home} – {match.score.fullTime.away}
                </p>
              )}
            </div>
          )}

          {/* Other players' predictions */}
          {friendlyPreds.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Group predictions</p>
              <div className="flex flex-col gap-1.5">
                {friendlyPreds.map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {p.user_picture && (
                        <img src={p.user_picture} alt="" className="w-5 h-5 rounded-full" />
                      )}
                      <span className="text-gray-300">{p.user_name}</span>
                    </div>
                    <span className="font-mono text-gray-100">{p.home_score} – {p.away_score}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TeamBadge({ team, align = 'left' }: { team: { name: string; crest: string; tla: string }; align?: 'left' | 'right' }) {
  return (
    <div className={`flex flex-col items-center gap-1.5 flex-1 ${align === 'right' ? 'items-end' : 'items-start'}`}>
      <img src={team.crest} alt={team.name} className="w-10 h-10 object-contain" />
      <span className="text-sm font-medium text-white text-center">{team.name}</span>
    </div>
  );
}

function ScoreInput({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs text-gray-500 uppercase">{label}</span>
      <input
        type="number"
        min={0}
        max={20}
        value={value}
        onChange={e => onChange(Math.max(0, Math.min(20, parseInt(e.target.value) || 0)))}
        className="w-16 h-14 text-center text-2xl font-bold bg-gray-800 border border-gray-600 rounded-xl text-white focus:outline-none focus:border-wc-green"
      />
    </div>
  );
}
