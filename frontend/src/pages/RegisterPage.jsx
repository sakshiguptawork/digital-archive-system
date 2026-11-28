import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getDashboardRoute, useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../services/api';

const RegisterPage = () => {
  const { register, loading } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'public'
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    try {
      const profile = await register(form);
      navigate(getDashboardRoute(profile.role));
    } catch (err) {
      setError(getErrorMessage(err, 'Registration failed. Please try again.'));
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-header">
          <div className="brand-mark">CV</div>
          <h1>Create Archive Account</h1>
          <p>Register as a Public User, Researcher, or Archivist</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form className="stack" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="reg-name">Full Name</label>
            <input
              id="reg-name"
              name="name"
              type="text"
              required
              placeholder="Dr. Eleanor Vance"
              value={form.name}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="reg-email">Email Address</label>
            <input
              id="reg-email"
              name="email"
              type="email"
              required
              placeholder="eleanor@university.edu"
              value={form.email}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="reg-password">Password</label>
            <input
              id="reg-password"
              name="password"
              type="password"
              required
              minLength={6}
              placeholder="Minimum 6 characters"
              value={form.password}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="reg-role">Account Role</label>
            <select
              id="reg-role"
              name="role"
              value={form.role}
              onChange={handleChange}
            >
              <option value="public">Public User (Browse Public Records)</option>
              <option value="researcher">
                Researcher (Request Restricted Access & Annotate)
              </option>
              <option value="archivist">
                Archivist (Upload, Preserve & Approve Access)
              </option>
            </select>
          </div>

          <button
            type="submit"
            className="btn btn-accent"
            disabled={loading}
            style={{ width: '100%', marginTop: '0.35rem' }}
          >
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <div className="auth-footer">
          Already registered? <Link to="/login">Sign in here</Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
