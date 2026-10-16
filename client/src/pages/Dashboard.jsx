import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import ItemCard from "../components/ItemCard";

const STATUS = {
  AVAILABLE: "Available",
  SWAP_PENDING: "In a swap",
  SWAPPED: "Swapped",
  HIDDEN: "Hidden by admin",
};

export default function Dashboard() {
  const { user, token } = useAuth();
  const [items, setItems] = useState([]);
  const [swaps, setSwaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () =>
    Promise.all([api("/items/mine", { token }), api("/swaps/mine", { token })])
      .then(([a, b]) => {
        setItems(a.items);
        setSwaps(b.swaps);
        setError("");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    if (!window.confirm("Delete this listing?")) return;
    try {
      await api(`/items/${id}`, { method: "DELETE", token });
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  const uid = String(user.id);
  const stats = [
    ["Active listings", items.filter((i) => i.status === "AVAILABLE").length],
    ["Incoming requests", swaps.filter((s) => String(s.receiver._id) === uid && s.status === "PENDING").length],
    ["Outgoing requests", swaps.filter((s) => String(s.requester._id) === uid && s.status === "PENDING").length],
    ["Active swaps", swaps.filter((s) => s.status === "ACCEPTED").length],
    ["Completed swaps", swaps.filter((s) => s.status === "COMPLETED").length],
  ];

  return (
    <div>
      <div className="mb-6 rounded-xl border border-violet-100 bg-white p-6">
        <h1 className="text-3xl font-extrabold">Hi, {user.name}</h1>
        <p className="text-zinc-500">
          {user.email} · {user.city}{user.state ? `, ${user.state}` : ""}
        </p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-5">
        {stats.map(([label, n]) => (
          <div key={label} className="rounded-xl border border-violet-100 bg-white p-4">
            <p className="text-3xl font-extrabold text-violet-600">{n}</p>
            <p className="text-sm text-zinc-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-extrabold">My listings</h2>
        <div className="flex gap-2">
          <Link to="/swaps" className="rounded-lg border border-violet-600 px-4 py-2 text-sm font-bold text-violet-700">My swaps</Link>
          <Link to="/add" className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white">Add item</Link>
        </div>
      </div>

      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
      {loading && <p className="text-zinc-500">Loading...</p>}
      {!loading && items.length === 0 && (
        <p className="rounded-lg bg-white p-8 text-center text-zinc-500">
          No clothing listed yet. Add your first item to start swapping.
        </p>
      )}
      <div className="grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-3 lg:grid-cols-4">
        {items.map((it) => (
          <div key={it._id}>
            <ItemCard item={it} />
            <div className="mt-1 flex items-center justify-between">
              <span className="rounded bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-700">
                {STATUS[it.status]}
              </span>
              {it.status === "AVAILABLE" && (
                <span className="flex gap-3">
                  <Link to={`/items/${it._id}/edit`} className="text-xs font-bold text-violet-700">Edit</Link>
                  <button onClick={() => remove(it._id)} className="text-xs font-bold text-red-600">Delete</button>
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}