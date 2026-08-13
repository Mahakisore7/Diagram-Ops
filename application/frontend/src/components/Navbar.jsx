import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link to="/" className="text-lg font-semibold text-slate-900">
          Diagram-Ops
        </Link>
        {user && (
          <div className="flex items-center gap-4 text-sm">
            <Link to="/" className="text-slate-600 hover:text-slate-900">
              Generate
            </Link>
            <Link to="/diagrams" className="text-slate-600 hover:text-slate-900">
              My Diagrams
            </Link>
            <span className="text-slate-400">{user.email}</span>
            <button onClick={handleLogout} className="text-slate-600 hover:text-slate-900">
              Log out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
