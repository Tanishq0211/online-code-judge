import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function Nav() {
  const { user, logout } = useAuth();
  return (
    <nav className="border-b bg-white">
      <div className="max-w-4xl mx-auto flex items-center gap-4 p-3 text-sm">
        <Link to="/problems" className="font-semibold">Judge</Link>
        <Link to="/problems" className="text-blue-600">Problems</Link>
        {user && <Link to="/submissions" className="text-blue-600">Submissions</Link>}
        <span className="flex-1" />
        {user ? (
          <>
            <span className="text-gray-600">{user.username}</span>
            <button onClick={logout} className="text-blue-600">Log out</button>
          </>
        ) : (
          <>
            <Link to="/login" className="text-blue-600">Log in</Link>
            <Link to="/register" className="text-blue-600">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}
