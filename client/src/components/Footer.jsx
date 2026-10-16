import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext";

const link = "text-sm text-zinc-300 transition hover:text-white";
const heading = "mb-4 text-xs font-bold uppercase tracking-widest text-violet-300";

const SOCIAL = [
  ["Instagram", "https://www.instagram.com"],
  ["YouTube", "https://www.youtube.com"],
  ["X", "https://x.com"],
];

function Icon({ name }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
  if (name === "Instagram")
    return (
      <svg {...common} aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
      </svg>
    );
  if (name === "YouTube")
    return (
      <svg {...common} aria-hidden="true">
        <rect x="2" y="5" width="20" height="14" rx="4" />
        <path d="M10 9l5 3-5 3z" fill="currentColor" />
      </svg>
    );
  return (
    <svg {...common} aria-hidden="true">
      <path d="M5 5l14 14M19 5L5 19" />
    </svg>
  );
}

export default function Footer() {
  const { user } = useAuth();
  const shop = (section) => (user ? `/?section=${section}` : "/register");

  return (
    <footer className="mt-20 bg-[#14102B] text-white">
      <div className="mx-auto max-w-6xl px-5 pt-14">
        <div className="flex flex-col items-start justify-between gap-5 rounded-2xl bg-linear-to-r from-violet-600 to-blue-500 p-8 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">Got clothes you no longer wear?</h2>
            <p className="mt-1 text-violet-100">List them in a minute and swap for something new.</p>
          </div>
          <Link
            to={user ? "/add" : "/register"}
            className="rounded-lg bg-white px-6 py-3 text-sm font-bold text-violet-700 transition hover:bg-violet-50"
          >
            List an item
          </Link>
        </div>

        <div className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Link to="/" className="text-2xl font-extrabold tracking-tight">FitSwaps</Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-zinc-400">
              A community marketplace to swap clothes you have outgrown for pieces you will love.
              No cash, no waste.
            </p>
            <div className="mt-5 flex gap-3">
              {SOCIAL.map(([name, href]) => (
                <a
                  key={name}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={name}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-zinc-300 transition hover:border-white hover:bg-white hover:text-[#14102B]"
                >
                  <Icon name={name} />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className={heading}>Shop</h3>
            <ul className="space-y-2.5">
              <li><Link to={shop("Men")} className={link}>Men's wear</Link></li>
              <li><Link to={shop("Women")} className={link}>Women's wear</Link></li>
              <li><Link to={shop("Kids")} className={link}>Kids wear</Link></li>
              <li><Link to={user ? "/" : "/register"} className={link}>All clothes</Link></li>
            </ul>
          </div>

          <div>
            <h3 className={heading}>Swap</h3>
            <ul className="space-y-2.5">
              <li><Link to={user ? "/add" : "/register"} className={link}>List an item</Link></li>
              <li><Link to={user ? "/swaps" : "/login"} className={link}>My swaps</Link></li>
              <li><Link to={user ? "/dashboard" : "/login"} className={link}>Dashboard</Link></li>
              <li><Link to="/community" className={link}>Community</Link></li>
            </ul>
          </div>

          <div>
            <h3 className={heading}>Account</h3>
            <ul className="space-y-2.5">
              {user ? (
                <li><Link to="/profile" className={link}>My profile</Link></li>
              ) : (
                <>
                  <li><Link to="/login" className={link}>Log in</Link></li>
                  <li><Link to="/register" className={link}>Create an account</Link></li>
                </>
              )}
            </ul>
          </div>

          <div>
            <h3 className={heading}>Why swap</h3>
            <ul className="space-y-2.5 text-sm text-zinc-300">
              <li>Free to join</li>
              <li>Fair value estimates</li>
              <li>Nearby swaps</li>
              <li>Less textile waste</li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center gap-1 border-t border-white/10 py-5 text-center text-sm text-zinc-400">
  <p>© 2026 FitSwaps. Made for a greener wardrobe.</p>

        </div>
      </div>
    </footer>
  );
}