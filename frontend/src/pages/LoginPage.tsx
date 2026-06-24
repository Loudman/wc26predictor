import { useState } from 'react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { authApi } from '../api/client';
import { useAuth } from '../App';
import clsx from 'clsx';

type Tab = 'google' | 'email';
type EmailMode = 'login' | 'register';

export default function LoginPage() {
  const { login } = useAuth();
  const [tab, setTab] = useState<Tab>('email');
  const [mode, setMode] = useState<EmailMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleGoogle(response: CredentialResponse) {
    if (!response.credential) return;
    try {
      const { token, user } = await authApi.loginWithGoogle(response.credential);
      login(token, user);
    } catch {
      setError('Google sign-in failed. Try again.');
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, user } = mode === 'login'
        ? await authApi.login(email, password)
        : await authApi.register(name, email, password);
      login(token, user);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  function switchMode() {
    setMode(m => m === 'login' ? 'register' : 'login');
    setError('');
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-8 px-4">
      <div className="text-center">
        <div className="text-6xl mb-4">⚽</div>
        <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">WC26 Predictor</h1>
        <p className="text-gray-400 text-lg">Predict every match. Climb the leaderboard.</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-xl">
        {/* Scoring legend */}
        <div className="grid grid-cols-5 gap-1 px-4 pt-4 pb-3 border-b border-gray-800 text-center text-xs">
          <div><div className="text-wc-gold font-bold text-sm">5</div><div className="text-gray-500">Exact</div></div>
          <div><div className="text-yellow-400 font-bold text-sm">4</div><div className="text-gray-500">±1 goal</div></div>
          <div><div className="text-green-400 font-bold text-sm">3</div><div className="text-gray-500">±2 goals</div></div>
          <div><div className="text-green-600 font-bold text-sm">2</div><div className="text-gray-500">Result</div></div>
          <div><div className="text-red-400 font-bold text-sm">0</div><div className="text-gray-500">Wrong</div></div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800">
          <TabBtn active={tab === 'email'} onClick={() => { setTab('email'); setError(''); }}>Email</TabBtn>
          <TabBtn active={tab === 'google'} onClick={() => { setTab('google'); setError(''); }}>Google</TabBtn>
        </div>

        <div className="px-6 py-6 flex flex-col gap-4">
          {tab === 'email' ? (
            <>
              <h2 className="text-sm font-medium text-gray-400 text-center">
                {mode === 'login' ? 'Sign in to your account' : 'Create a new account'}
              </h2>

              <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3">
                {mode === 'register' && (
                  <Field
                    label="Name"
                    type="text"
                    value={name}
                    onChange={setName}
                    placeholder="Your name"
                    autoComplete="name"
                  />
                )}
                <Field
                  label="Email"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
                <Field
                  label="Password"
                  type="password"
                  value={password}
                  onChange={setPassword}
                  placeholder={mode === 'register' ? 'Min. 8 characters' : '••••••••'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />

                {error && <p className="text-red-400 text-xs text-center">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1 bg-wc-green hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors"
                >
                  {loading ? '…' : mode === 'login' ? 'Sign in' : 'Create account'}
                </button>
              </form>

              <p className="text-center text-xs text-gray-500">
                {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
                <button onClick={switchMode} className="text-gray-300 hover:text-white underline underline-offset-2">
                  {mode === 'login' ? 'Register' : 'Sign in'}
                </button>
              </p>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm text-gray-400">Continue with your Google account</p>
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <GoogleLogin
                onSuccess={handleGoogle}
                onError={() => setError('Google sign-in failed.')}
                theme="filled_black"
                shape="pill"
                size="large"
                text="signin_with"
              />
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-700">Live data from football-data.org · {new Date().getFullYear()}</p>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex-1 py-2.5 text-sm font-medium transition-colors',
        active ? 'text-white border-b-2 border-wc-green' : 'text-gray-500 hover:text-gray-300'
      )}
    >
      {children}
    </button>
  );
}

function Field({ label, type, value, onChange, placeholder, autoComplete }: {
  label: string; type: string; value: string;
  onChange: (v: string) => void; placeholder: string; autoComplete?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-400">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-wc-green transition-colors"
      />
    </div>
  );
}
