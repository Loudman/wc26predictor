import clsx from 'clsx';
import { Match, Prediction } from '../types';

interface Props {
  match: Match;
  myPrediction: Prediction | undefined;
  onClick: () => void;
}

function stageMultiplier(stage: string): number {
  switch (stage) {
    case 'LAST_16':        return 1.5;
    case 'QUARTER_FINALS': return 2;
    case 'SEMI_FINALS':    return 3;
    case 'THIRD_PLACE':    return 2;
    case 'FINAL':          return 4;
    default:               return 1; // GROUP_STAGE
  }
}

function stageMultiplierLabel(stage: string): string | null {
  switch (stage) {
    case 'LAST_16':        return '⚡ 1.5×';
    case 'QUARTER_FINALS': return '⚡ 2×';
    case 'SEMI_FINALS':    return '⚡ 3×';
    case 'THIRD_PLACE':    return '⚡ 2×';
    case 'FINAL':          return '⚡ 4×';
    default:               return null;
  }
}

export function calcBasePoints(predHome: number, predAway: number, actualHome: number, actualAway: number): number {
  const goalError = Math.abs(predHome - actualHome) + Math.abs(predAway - actualAway);
  if (goalError === 0) return 5;
  const predOutcome = Math.sign(predHome - predAway);
  const actualOutcome = Math.sign(actualHome - actualAway);
  if (predOutcome !== actualOutcome) return 0;
  if (goalError === 1) return 4;
  if (goalError === 2) return 3;
  return 2;
}

export function calcPoints(pred: Prediction, match: Match): number | null {
  const { home, away } = match.score.fullTime;
  if (match.status !== 'FINISHED' || home === null || away === null) return null;
  const base = calcBasePoints(pred.home_score, pred.away_score, home, away);
  if (base === 0) return 0;
  return Math.round(base * stageMultiplier(match.stage));
}

export default function MatchCard({ match, myPrediction, onClick }: Props) {
  const isFinished = match.status === 'FINISHED';
  const isLive = match.status === 'IN_PLAY' || match.status === 'PAUSED' || (() => {
    const kick = new Date(match.utcDate).getTime();
    const now = Date.now();
    return !isFinished && kick <= now && now <= kick + 2.5 * 60 * 60 * 1000;
  })();
  const isScheduled = !isFinished && !isLive;

  const pts = myPrediction ? calcPoints(myPrediction, match) : null;
  const multiplierLabel = stageMultiplierLabel(match.stage);

  return (
    <div
      onClick={onClick}
      className={clsx(
        'bg-gray-900 border rounded-xl p-4 cursor-pointer transition-all hover:border-gray-600 hover:bg-gray-800',
        isLive ? 'border-green-600/60 bg-green-950/20' : 'border-gray-800',
        myPrediction && !isFinished && 'border-wc-gold/30'
      )}
    >
      {/* Status badge */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          {isLive && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />}
          <span className={clsx(
            'text-xs font-medium uppercase tracking-wide',
            isLive ? 'text-green-400' : isFinished ? 'text-gray-500' : 'text-gray-500'
          )}>
            {isLive ? 'Live' : isFinished ? 'Final' : formatMatchDate(match.utcDate)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {multiplierLabel && (
            <span className="text-xs font-bold text-wc-gold bg-wc-gold/10 px-1.5 py-0.5 rounded">
              {multiplierLabel}
            </span>
          )}
          <span className="text-xs text-gray-600">{match.stage.replace(/_/g, ' ')}</span>
        </div>
      </div>

      {/* Teams & Score */}
      <div className="flex items-center gap-3">
        <TeamRow team={match.homeTeam} />
        <div className="flex-1 flex items-center justify-center">
          {isFinished || isLive ? (
            <div className="flex items-center gap-2">
              <Score value={match.score.fullTime.home} />
              <span className="text-gray-600 text-sm">–</span>
              <Score value={match.score.fullTime.away} />
            </div>
          ) : (
            <span className="text-gray-600 text-xs font-medium">vs</span>
          )}
        </div>
        <TeamRow team={match.awayTeam} align="right" />
      </div>

      {/* My prediction */}
      <div className="mt-3 pt-3 border-t border-gray-800 flex items-center justify-between">
        {myPrediction ? (
          <>
            <span className="text-xs text-gray-500">
              Your pick:{' '}
              <span className="text-gray-300 font-medium">
                {myPrediction.home_score} – {myPrediction.away_score}
              </span>
            </span>
            {pts !== null && (
              <span className={clsx(
                'text-xs font-bold px-2 py-0.5 rounded-full',
                pts >= 18 ? 'bg-wc-gold/20 text-wc-gold' :  // e.g. 5×4=20 (FINAL exact)
                pts >= 10 ? 'bg-yellow-500/20 text-yellow-400' :
                pts >= 6  ? 'bg-green-600/20 text-green-400' :
                pts >= 2  ? 'bg-green-500/20 text-green-500' :
                'bg-red-500/20 text-red-400'
              )}>
                +{pts}
              </span>
            )}
          </>
        ) : (
          <span className={clsx(
            'text-xs',
            isScheduled ? 'text-amber-500/80' : 'text-gray-600'
          )}>
            {isScheduled ? 'Tap to predict' : isFinished ? 'No prediction made' : 'Match is live'}
          </span>
        )}
      </div>
    </div>
  );
}

function TeamRow({ team, align = 'left' }: { team: { name: string; crest: string; shortName: string }; align?: 'left' | 'right' }) {
  return (
    <div className={clsx('flex items-center gap-2 flex-1', align === 'right' && 'flex-row-reverse')}>
      <img src={team.crest} alt={team.name} className="w-7 h-7 object-contain flex-shrink-0" />
      <span className="text-sm font-medium text-white truncate">{team.shortName || team.name}</span>
    </div>
  );
}

function Score({ value }: { value: number | null }) {
  return (
    <span className="text-xl font-extrabold text-white w-6 text-center">
      {value ?? '–'}
    </span>
  );
}

function formatMatchDate(utcDate: string): string {
  const d = new Date(utcDate);
  const now = new Date();
  const matchDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const today    = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((matchDay.getTime() - today.getTime()) / 86400000);
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 0) return `Today ${time}`;
  if (diffDays === 1) return `Tomorrow ${time}`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
