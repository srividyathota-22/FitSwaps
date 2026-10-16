import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext";

const link = "px-3 py-2 text-sm font-semibold text-zinc-700";

export default function Navbar() {
  const { user, logout } = useAuth();
  return (
    <header className="sticky top-0 z-50 border-b border-violet-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-5 py-3">
        <Link to="/" className="mr-2 text-2xl font-extrabold tracking-tight text-violet-600">
          FitSwaps
        </Link>
        {user ? (
          <>
            <Link to="/" className={link}>Browse</Link>
            <Link to="/dashboard" className="px-3 py-2 text-sm font-semibold text-zinc-700">Dashboard</Link>
            {user.role === "admin" && (
            <Link to="/admin" className="px-3 py-2 text-sm font-semibold text-violet-700">Admin</Link>
            )}
            <Link to="/swaps" className={link}>My swaps</Link>
            <Link to="/community" className={link}>Community</Link>
            <div className="ml-auto flex items-center gap-3">
              <Link
                to="/add"
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
              >
                Add item
              </Link>
              <Link to="/profile" className="text-sm font-semibold text-zinc-700 hover:text-violet-700">Hi, {user.name}</Link>
              <button
                onClick={logout}
                className="rounded-lg border border-zinc-800 px-4 py-2 text-sm font-semibold hover:bg-zinc-100"
              >
                Log out
              </button>
            </div>
          </>
        ) : (
          <div className="ml-auto flex items-center gap-3">
            <Link to="/login" className={link}>Log in</Link>
            <Link
              to="/register"
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
            >
              Sign up
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}