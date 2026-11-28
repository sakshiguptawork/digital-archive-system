import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DEMO_ACCOUNTS } from '../constants/archiveOptions';
import { getDashboardRoute, useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../services/api';

const LoginPage = () => {
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const profile = await login(email, password);
      navigate(getDashboardRoute(profile.role));
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to sign in. Check your credentials.'));
    }
  };

  const handleFillDemo = (account) => {
    setEmail(account.email);
    setPassword(account.password);
    setError('');
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-header">
          <div className="brand-mark">CV</div>
          <h1>ChronicleVault</h1>
          <p>Sign in to access the Digital Archive System</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form className="stack" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="login-email">Email Address</label>
            <input
              id="login-email"
              type="email"
              required
              placeholder="name@archive.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              required
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', marginTop: '0.35rem' }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div
          style={{
            marginTop: '1.15rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border-color)'
          }}
        >
          <div className="muted-text" style={{ marginBottom: '0.5rem' }}>
            Quick-fill seeded demo credentials (<code>npm run seed</code>):
          </div>
          <div className="btn-row">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleFillDemo(account)}
              >
                {account.label}
              </button>
            ))}
          </div>
        </div>

        <div className="auth-footer">
          Don&apos;t have an account?{' '}
          <Link to="/register">Create an archive account</Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
