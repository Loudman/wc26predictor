import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { authApi } from '../api/client';
import { countryFlag } from '../data/nations';
import clsx from 'clsx';

export default function Header() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState<'name' | 'users' | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function openModal(m: 'name' | 'users') {
    setMenuOpen(false);
    setModal(m);
  }

  function goToProfile() {
    setMenuOpen(false);
    navigate('/profile');
  }

  const flag = countryFlag(user?.country);

  return (
    <>
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">⚽</span>
            <span className="font-bold text-white tracking-tight">WC26 Predictor</span>
          </Link>

          <nav className="flex items-center gap-1">
            <NavLink to="/" active={pathname === '/'}>Matches</NavLink>
            <NavLink to="/leaderboard" active={pathname === '/leaderboard'}>Leaderboard</NavLink>
          </nav>

          {user && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(o => !o)}
                className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-gray-800 transition-colors"
              >
                <img src={user.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=006847&color=fff`}
                  alt={user.name} className="w-7 h-7 rounded-full border border-gray-600" />
                <span className="text-sm text-gray-300 hidden sm:block max-w-[120px] truncate">
                  {flag && <span className="mr-1">{flag}</span>}{user.name}
                </span>
                <svg className={clsx('w-3.5 h-3.5 text-gray-500 transition-transform', menuOpen && 'rotate-180')}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-gray-800">
                    <p className="text-sm font-semibold text-white truncate">
                      {flag && <span className="mr-1">{flag}</span>}{user.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                  <div className="py-1">
                    <MenuItem icon="👤" onClick={goToProfile}>My Profile</MenuItem>
                    <MenuItem icon="✏️" onClick={() => openModal('name')}>Change name</MenuItem>
                    <MenuItem icon="👥" onClick={() => openModal('users')}>All players</MenuItem>
                  </div>
                  <div className="border-t border-gray-800 py-1">
                    <MenuItem icon="🚪" onClick={logout} danger>Sign out</MenuItem>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {modal === 'name' && <ChangeNameModal onClose={() => setModal(null)} />}
      {modal === 'users' && <UsersModal onClose={() => setModal(null)} />}
    </>
  );
}

function NavLink({ to, active, children }: { to: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link to={to} className={clsx(
      'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
      active ? 'bg-wc-green text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
    )}>
      {children}
    </Link>
  );
}

function MenuItem({ icon, onClick, danger, children }: {
  icon: string; onClick: () => void; danger?: boolean; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors text-left',
        danger ? 'text-red-400 hover:bg-red-500/10' : 'text-gray-300 hover:bg-gray-800'
      )}
    >
      <span>{icon}</span>
      {children}
    </button>
  );
}

// ---- Change Name Modal ----
function ChangeNameModal({ onClose }: { onClose: () => void }) {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    if (!name.trim()) { setError('Name cannot be empty'); return; }
    setSaving(true);
    setError('');
    try {
      await authApi.updateName(name.trim());
      updateUser({ name: name.trim() });
      onClose();
    } catch {
      setError('Failed to update name. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Change name" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-gray-400">New name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && save()}
            autoFocus
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-wc-green transition-colors"
          />
        </div>
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
            Cancel
          </button>
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

// ---- Users Modal ----
function UsersModal({ onClose }: { onClose: () => void }) {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<{ id: number; name: string; email: string; picture: string; country?: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authApi.getUsers()
      .then(setUsers)
      .finally(() => setLoading(false));
  }, []);

  return (
    <Modal title="All players" onClose={onClose}>
      {loading ? (
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 border-2 border-wc-gold border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-gray-800">
          {users.map(u => (
            <li key={u.id} className="flex items-center gap-3 py-2.5">
              <img
                src={u.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=006847&color=fff`}
                alt={u.name}
                className="w-8 h-8 rounded-full border border-gray-700 flex-shrink-0"
              />
              <div className="min-w-0">
                <p className={clsx('text-sm font-medium truncate', u.id === me?.id ? 'text-wc-gold' : 'text-white')}>
                  {countryFlag(u.country) && <span className="mr-1">{countryFlag(u.country)}</span>}
                  {u.name} {u.id === me?.id && <span className="text-xs font-normal">(you)</span>}
                </p>
                <p className="text-xs text-gray-500 truncate">{u.email}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

// ---- Shared Modal shell (exported for reuse) ----
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors text-xl leading-none">&times;</button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
