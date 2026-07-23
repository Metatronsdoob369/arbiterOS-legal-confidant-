import React from 'react';
import { Spinner } from '../ui';
import { useAuth } from '../../contexts/AuthContext';
import { Seal } from '../brand/Seal';

interface LoginScreenProps {
  loading: boolean;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ loading }) => {
  const { login } = useAuth();
  const [username, setUsername] = React.useState('admin');
  const [password, setPassword] = React.useState('secret-passphrase');
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit = React.useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await login(username, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in');
    } finally {
      setSubmitting(false);
    }
  }, [login, password, username]);

  return (
    <div
      data-testid="login-screen"
      className="min-h-screen w-screen flex items-center justify-center px-4"
      style={{ background: '#0a0a0c', color: '#eef1f5' }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-[400px] rounded-[18px] px-5 pt-7 pb-5"
        style={{
          border: '1px solid rgba(207,213,222,0.28)',
          background:
            'radial-gradient(120% 80% at 50% 120%, rgba(196,165,116,0.1), transparent 55%), linear-gradient(180deg, #323842 0%, #1c2026 72%, #14171c 100%)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07), 0 28px 70px rgba(0,0,0,0.55)',
        }}
      >
        <div className="text-center mb-6">
          <div className="relative inline-block mb-4">
            <Seal tone="primary" size={72} title="Arbiter seal" />
            <span
              aria-hidden
              className="absolute left-[14%] right-[14%] -bottom-2 h-3 pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse at center, rgba(196,165,116,0.4), transparent 70%)',
                filter: 'blur(4px)',
              }}
            />
          </div>
          <p
            className="m-0 text-[1.5rem] font-bold uppercase"
            style={{ letterSpacing: '0.18em', textIndent: '0.18em', color: '#cfd5de' }}
          >
            Arbiter
          </p>
          <p
            className="mt-1.5 mb-0 text-[0.66rem] font-medium uppercase"
            style={{ letterSpacing: '0.28em', textIndent: '0.28em', color: '#c4a574' }}
          >
            Legal Confidant
          </p>
        </div>

        <label
          className="block mt-3 mb-1.5 font-mono text-[0.58rem] uppercase"
          style={{ letterSpacing: '0.14em', color: '#9aa1ab' }}
          htmlFor="login-username"
        >
          Username
        </label>
        <input
          id="login-username"
          data-testid="login-username"
          autoComplete="username"
          className="w-full rounded-full px-4 py-3 text-[0.92rem] outline-none transition"
          style={{
            border: '1px solid rgba(207,213,222,0.28)',
            background: 'rgba(10,10,12,0.55)',
            color: '#eef1f5',
          }}
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          disabled={submitting}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'rgba(207,213,222,0.55)';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(207,213,222,0.08)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'rgba(207,213,222,0.28)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />

        <label
          className="block mt-3 mb-1.5 font-mono text-[0.58rem] uppercase"
          style={{ letterSpacing: '0.14em', color: '#9aa1ab' }}
          htmlFor="login-password"
        >
          Password
        </label>
        <input
          id="login-password"
          data-testid="login-password"
          type="password"
          autoComplete="current-password"
          className="w-full rounded-full px-4 py-3 text-[0.92rem] outline-none transition"
          style={{
            border: '1px solid rgba(207,213,222,0.28)',
            background: 'rgba(10,10,12,0.55)',
            color: '#eef1f5',
          }}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={submitting}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'rgba(207,213,222,0.55)';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(207,213,222,0.08)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'rgba(207,213,222,0.28)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />

        {error ? (
          <p data-testid="login-error" className="mt-3 text-xs text-red-300">
            {error}
          </p>
        ) : null}

        <button
          data-testid="login-submit"
          type="submit"
          disabled={submitting || loading}
          className="mt-5 w-full rounded-full py-3 text-[0.8rem] font-semibold uppercase tracking-[0.12em] transition disabled:opacity-50 inline-flex items-center justify-center gap-2"
          style={{
            border: '1.5px solid #cfd5de',
            background: '#2a2e35',
            color: '#eef1f5',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#eef1f5';
            e.currentTarget.style.background = '#343a44';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#cfd5de';
            e.currentTarget.style.background = '#2a2e35';
          }}
        >
          {submitting || loading ? <Spinner size="sm" className="text-silver-bright" /> : null}
          <span>{submitting || loading ? 'Entering...' : 'Enter'}</span>
        </button>
      </form>
    </div>
  );
};
