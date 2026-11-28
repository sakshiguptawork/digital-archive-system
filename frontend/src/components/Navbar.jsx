import { useNavigate } from 'react-router-dom';
import { ROLE_LABELS } from '../constants/archiveOptions';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <div className="brand">
          <div className="brand-mark">CV</div>
          <div>
            <div className="brand-title">ChronicleVault</div>
            <div className="brand-subtitle">Cloud-Based Digital Archive System</div>
          </div>
        </div>

        {user && (
          <div className="navbar-user">
            <div className="user-chip">
              <span>{user.name}</span>
              <span className="role-pill">
                {ROLE_LABELS[user.role] || user.role}
              </span>
            </div>
            <button
              type="button"
              className="btn btn-outline-light btn-sm"
              onClick={handleLogout}
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
