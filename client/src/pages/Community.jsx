import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext";

const TIPS = [
  "Swap before you shop: check the marketplace first.",
  "Wash in cold water and air dry to make clothes last longer.",
  "Repair small tears and loose buttons instead of throwing clothes away.",
  "Take clear daylight photos so your item gets noticed.",
  "Be honest about condition, it builds trust in the community.",
];

const timeAgo = (d) => {
  const mins = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
};

export default function Community() {
  const { user, token } = useAuth();
  const [stats, setStats] = useState(null);
  const [leaders, setLeaders] = useState([]);
  const [stories, setStories] = useState([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadStories = () => api("/community/stories", { token }).then((d) => setStories(d.stories));

  useEffect(() => {
    Promise.all([api("/community/stats"), api("/community/leaders"), api("/community/stories", { token })])
      .then(([a, b, c]) => {
        setStats(a);
        setLeaders(b.leaders);
        setStories(c.stories);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const post = async (e) => {
    e.preventDefault();
    setError("");
    if (text.trim().length < 10) return setError("Write at least 10 characters.");
    setBusy(true);
    try {
      await api("/community/stories", { method: "POST", token, body: { text } });
      setText("");
      await loadStories();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const like = async (id) => {
    if (!user) return;
    try {
      const d = await api(`/community/stories/${id}/like`, { method: "POST", token });
      setStories((list) => list.map((s) => (s._id === id ? { ...s, likes: d.likes, liked: d.liked } : s)));
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this story?")) return;
    try {
      await api(`/community/stories/${id}`, { method: "DELETE", token });
      await loadStories();
    } catch (err) {
      setError(err.message);
    }
  };

  const itemsReused = stats ? stats.completedSwaps * 2 : 0;
  const cards = stats
    ? [
        ["Members", stats.members],
        ["Swaps completed", stats.completedSwaps],
        ["Clothes given a second life", itemsReused],
        ["Waste kept out of landfill", `${(itemsReused * 0.4).toFixed(1)} kg`],
      ]
    : [];

  return (
    <div>
      <div className="mb-8 rounded-2xl bg-linear-to-r from-violet-700 to-blue-500 p-8 text-white">
        <h1 className="text-4xl font-extrabold tracking-tight">Our swap community</h1>
        <p className="mt-2 max-w-xl text-violet-100">
          Every swap keeps a piece of clothing out of landfill. Share your story, cheer on other swappers
          and see the difference we are making together.
        </p>
      </div>

      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
      {loading && <p className="text-zinc-500">Loading the community...</p>}

      {stats && (
        <section aria-label="Community impact" className="mb-8">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {cards.map(([label, value]) => (
              <div key={label} className="rounded-xl border border-violet-100 bg-white p-4">
                <p className="text-3xl font-extrabold text-violet-600">{value}</p>
                <p className="text-sm text-zinc-500">{label}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-zinc-400">
            Waste saved is an estimate that assumes about 0.4 kg of clothing per swapped item.
          </p>
        </section>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <h2 className="mb-3 text-2xl font-extrabold">Swap stories</h2>

          {user ? (
            <form onSubmit={post} className="mb-5 rounded-xl border border-violet-100 bg-white p-4">
              <label className="block text-sm font-semibold">
                Share your swap story or a sustainable fashion tip
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={280}
                  rows={3}
                  placeholder="e.g. I swapped two old hoodies for a kurta I wore all festival!"
                  className="mt-2 w-full rounded-lg border border-zinc-300 p-3 font-normal outline-violet-500"
                />
              </label>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-zinc-400">{text.length}/280</span>
                <button disabled={busy} className="rounded-lg bg-violet-600 px-5 py-2 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50">
                  {busy ? "Posting..." : "Share story"}
                </button>
              </div>
            </form>
          ) : (
            <p className="mb-5 rounded-xl border border-violet-100 bg-white p-4 text-sm text-zinc-600">
              <Link to="/login" className="font-semibold text-violet-600">Log in</Link> or{" "}
              <Link to="/register" className="font-semibold text-violet-600">join the community</Link> to share your story and like others.
            </p>
          )}

          {!loading && stories.length === 0 && (
            <p className="rounded-xl bg-white p-8 text-center text-zinc-500">No stories yet. Be the first to share one!</p>
          )}
          <div className="space-y-3">
            {stories.map((s) => {
              const canDelete = user && (user.role === "admin" || String(s.author._id) === String(user.id));
              return (
                <article key={s._id} className="rounded-xl border border-violet-100 bg-white p-4">
                  <div className="flex items-center gap-3">
                    <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 font-bold text-violet-700">
                      {s.author.name?.[0]?.toUpperCase() || "?"}
                    </span>
                    <div>
                      <p className="text-sm font-bold leading-tight">{s.author.name}</p>
                      <p className="text-xs text-zinc-500">
                        {s.author.city ? `${s.author.city} · ` : ""}{timeAgo(s.createdAt)}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-zinc-800">{s.text}</p>
                  <div className="mt-3 flex items-center gap-4 text-sm">
                    <button
                      onClick={() => like(s._id)}
                      disabled={!user}
                      aria-pressed={s.liked}
                      aria-label={s.liked ? "Unlike this story" : "Like this story"}
                      className={`font-semibold ${s.liked ? "text-violet-700" : "text-zinc-500"} disabled:cursor-default`}
                    >
                      {s.liked ? "♥ Liked" : "♡ Like"} · {s.likes}
                    </button>
                    {canDelete && (
                      <button onClick={() => remove(s._id)} className="font-semibold text-red-600">Delete</button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-xl border border-violet-100 bg-white p-5">
            <h2 className="mb-3 text-xl font-extrabold">Top swappers</h2>
            {leaders.length === 0 ? (
              <p className="text-sm text-zinc-500">Complete a swap to appear on the leaderboard.</p>
            ) : (
              <ol className="space-y-3">
                {leaders.map((l, i) => (
                  <li key={l.name + i} className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-bold leading-tight">{l.name}</p>
                      {l.city && <p className="text-xs text-zinc-500">{l.city}</p>}
                    </div>
                    <span className="text-sm font-bold text-violet-600">{l.swaps} swap{l.swaps === 1 ? "" : "s"}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="rounded-xl border border-violet-100 bg-white p-5">
            <h2 className="mb-3 text-xl font-extrabold">Sustainable fashion tips</h2>
            <ul className="space-y-2 text-sm text-zinc-700">
              {TIPS.map((t) => <li key={t}>✓ {t}</li>)}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}