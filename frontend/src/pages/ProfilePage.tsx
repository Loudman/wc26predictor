import { useState, useEffect } from 'react';
import { profileApi, ProfileResponse, outrightApi, authApi } from '../api/client';
import { OutrightPick } from '../types';
import { useAuth } from '../App';
import { WC2026_NATIONS, countryFlag } from '../data/nations';
import { Modal } from '../components/Header';
import clsx from 'clsx';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [outright, setOutright] = useState<OutrightPick | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editModal, setEditModal] = useState<'name' | 'country' | null>(null);

  useEffect(() => {
    Promise.all([profileApi.getMe(), outrightApi.getMine().catch(() => null)])
      .then(([p, o]) => { setProfile(p); setOutright(o); })
      .catch(e => setError(e.message || 'Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-wc-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <p className="text-red-400 text-sm">{error || 'Profile not found.'}</p>
      </div>
    );
  }

  const { stats, badges, accuracyByMatchday, history } = profile;
  const flag = countryFlag(profile.user.country);
  const maxPts = Math.max(...accuracyByMatchday.map(d => d.pts), 1);

  function refreshProfile() {
    profileApi.getMe().then(setProfile).catch(() => {});
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">

      {/* User card */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex items-center gap-5">
        <img
          src={user?.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.user.name)}&background=006847&color=fff`}
          alt={profile.user.name}
          className="w-16 h-16 rounded-full border-2 border-wc-gold flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-white truncate">
            {flag && <span className="mr-2">{flag}</span>}{profile.user.name}
          </h1>
          <p className="text-sm text-gray-500">{profile.user.email}</p>
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => setEditModal('name')}
            className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
          >
            ✏️ Name
          </button>
          <button
            onClick={() => setEditModal('country')}
            className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
          >
            🌍 Nation
          </button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Points" value={stats.totalPoints} color="text-wc-gold" />
        <StatCard label="Exact %" value={`${stats.exactRate}%`} color="text-yellow-400" />
        <StatCard label="Current Streak" value={stats.currentStreak === 0 ? '—' : `🔥 ${stats.currentStreak}`} color="text-orange-400" />
        <StatCard label="Best Streak" value={stats.bestStreak === 0 ? '—' : `⚡ ${stats.bestStreak}`} color="text-purple-400" />
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Badges</h2>
          <div className="flex flex-wrap gap-3">
            {badges.map(b => (
              <div
                key={b.key}
                title={b.description}
                className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-xl px-3 py-2"
              >
                <span className="text-xl">{b.icon}</span>
                <span className="text-sm font-medium text-white">{b.label}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Outright picks */}
      <OutrightSection
        outright={outright}
        onSaved={(picks) => setOutright(picks)}
      />

      {/* Accuracy by matchday */}
      {accuracyByMatchday.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Points by Matchday</h2>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-2">
            {accuracyByMatchday.map(item => (
              <div key={item.label} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-28 flex-shrink-0 truncate">{item.label}</span>
                <div className="flex-1 h-4 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-wc-green rounded-full transition-all"
                    style={{ width: `${Math.round((item.pts / maxPts) * 100)}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-white w-8 text-right">{item.pts}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Prediction history */}
      {history.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Recent Predictions</h2>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            {history.map((h, i) => {
              const isExact = h.basePoints === 5;
              const isCorrect = h.basePoints >= 2 && !isExact;
              const isWrong = h.basePoints === 0;
              return (
                <div
                  key={h.matchId}
                  className={clsx(
                    'flex items-center gap-3 px-4 py-3 border-b border-gray-800 last:border-0',
                    i % 2 === 0 ? '' : 'bg-gray-800/30'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {h.homeTeam} vs {h.awayTeam}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(h.utcDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {h.stage.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <div className="text-center flex-shrink-0">
                    <p className="text-xs text-gray-500">Your pick</p>
                    <p className="text-sm font-bold text-gray-300">{h.homeScore}–{h.awayScore}</p>
                  </div>
                  <div className="text-center flex-shrink-0">
                    <p className="text-xs text-gray-500">Result</p>
                    <p className="text-sm font-bold text-white">{h.actualHome}–{h.actualAway}</p>
                  </div>
                  <div className="text-right flex-shrink-0 w-12">
                    <span className={clsx(
                      'text-xs font-bold px-2 py-0.5 rounded-full',
                      isExact ? 'bg-wc-gold/20 text-wc-gold' :
                      isCorrect ? 'bg-green-500/20 text-green-400' :
                      isWrong ? 'bg-red-500/20 text-red-400' : 'bg-gray-700 text-gray-400'
                    )}>
                      +{h.points}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Modals */}
      {editModal === 'name' && (
        <EditNameModal onClose={() => setEditModal(null)} onSaved={refreshProfile} />
      )}
      {editModal === 'country' && (
        <EditCountryModal
          current={profile.user.country}
          onClose={() => setEditModal(null)}
          onSaved={(c) => {
            updateUser({ country: c });
            refreshProfile();
            setEditModal(null);
          }}
        />
      )}
    </main>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
      <p className={clsx('text-2xl font-extrabold', color)}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}

// ---- Outright picks section ----
function OutrightSection({ outright, onSaved }: {
  outright: OutrightPick | null;
  onSaved: (picks: OutrightPick) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [champion, setChampion] = useState(outright?.champion ?? '');
  const [finalist, setFinalist] = useState(outright?.finalist ?? '');
  const [darkHorse, setDarkHorse] = useState(outright?.dark_horse ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setChampion(outright?.champion ?? '');
    setFinalist(outright?.finalist ?? '');
    setDarkHorse(outright?.dark_horse ?? '');
  }, [outright]);

  async function save() {
    setSaving(true);
    try {
      await outrightApi.save({ champion: champion || null, finalist: finalist || null, dark_horse: darkHorse || null });
      onSaved({ champion: champion || null, finalist: finalist || null, dark_horse: darkHorse || null });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  const nationOptions = WC2026_NATIONS.map(n => ({ value: n.name, label: `${n.flag} ${n.name}` }));

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Tournament Picks</h2>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
          >
            {outright?.champion ? 'Edit' : 'Make picks'}
          </button>
        )}
      </div>

      {editing ? (
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 space-y-3">
          <SelectField label="🏆 Champion" value={champion} onChange={setChampion} options={nationOptions} />
          <SelectField label="🥈 Finalist" value={finalist} onChange={setFinalist} options={nationOptions} />
          <SelectField label="🌟 Dark Horse" value={darkHorse} onChange={setDarkHorse} options={nationOptions} />
          <div className="flex gap-2 justify-end pt-1">
            <button onClick={() => setEditing(false)} className="text-sm text-gray-400 hover:text-white px-3 py-1.5 transition-colors">
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="text-sm bg-wc-green hover:bg-green-700 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg font-medium transition-colors"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 grid grid-cols-3 gap-4">
          <PickDisplay label="🏆 Champion" value={outright?.champion} />
          <PickDisplay label="🥈 Finalist" value={outright?.finalist} />
          <PickDisplay label="🌟 Dark Horse" value={outright?.dark_horse} />
        </div>
      )}
    </section>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-400">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-wc-green transition-colors"
      >
        <option value="">— Pick a nation —</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function PickDisplay({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="text-center">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-sm font-medium text-white">
        {value ? <>{countryFlag(value)} {value}</> : <span className="text-gray-600">—</span>}
      </p>
    </div>
  );
}

// ---- Edit name modal ----
function EditNameModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    if (!name.trim()) { setError('Name cannot be empty'); return; }
    setSaving(true);
    try {
      await authApi.updateName(name.trim());
      updateUser({ name: name.trim() });
      onSaved();
      onClose();
    } catch {
      setError('Failed to update name.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Change name" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && save()}
          autoFocus
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-wc-green"
        />
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 text-sm bg-wc-green hover:bg-green-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ---- Edit country modal ----
function EditCountryModal({ current, onClose, onSaved }: {
  current: string | null;
  onClose: () => void;
  onSaved: (country: string | null) => void;
}) {
  const [country, setCountry] = useState(current ?? '');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await authApi.updateCountry(country || null);
      onSaved(country || null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Pick your nation" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <select
          value={country}
          onChange={e => setCountry(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-wc-green"
        >
          <option value="">— No nation —</option>
          {WC2026_NATIONS.map(n => (
            <option key={n.name} value={n.name}>{n.flag} {n.name}</option>
          ))}
        </select>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 text-sm bg-wc-green hover:bg-green-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
