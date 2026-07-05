import React from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Spinner } from '../ui';
import { useAuth } from '../../contexts/AuthContext';

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
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to sign in');
    } finally {
      setSubmitting(false);
    }
  }, [login, password, username]);

  return (
    <div
      data-testid="login-screen"
      className="min-h-screen w-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(180deg, #0d0806 0%, #050302 100%)', color: '#e8dcc8' }}
    >
      <Card variant="elevated" className="w-full max-w-md">
        <CardHeader>
          <CardTitle>ArbiterOS Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="block text-[10px] uppercase tracking-widest text-leather-400" htmlFor="login-username">
                Username
              </label>
              <input
                id="login-username"
                data-testid="login-username"
                autoComplete="username"
                className="w-full rounded-md border border-mahogany-800 bg-leather-950 px-3 py-2 text-sm text-leather-100 outline-none transition focus:border-gold-500"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] uppercase tracking-widest text-leather-400" htmlFor="login-password">
                Password
              </label>
              <input
                id="login-password"
                data-testid="login-password"
                type="password"
                autoComplete="current-password"
                className="w-full rounded-md border border-mahogany-800 bg-leather-950 px-3 py-2 text-sm text-leather-100 outline-none transition focus:border-gold-500"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={submitting}
              />
            </div>

            {error ? (
              <p data-testid="login-error" className="text-xs text-red-300">
                {error}
              </p>
            ) : null}

            <Button
              data-testid="login-submit"
              type="submit"
              className="w-full"
              disabled={submitting || loading}
            >
              {submitting || loading ? <Spinner size="sm" className="text-leather-950" /> : null}
              <span>{submitting || loading ? 'Entering...' : 'Enter ArbiterOS'}</span>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
