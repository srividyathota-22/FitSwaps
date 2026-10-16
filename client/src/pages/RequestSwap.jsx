import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";

function ItemBox({ item, label }) {
  return (
    <div className="rounded-xl border border-violet-100 bg-white p-4">
      <p className="mb-2 text-sm font-bold text-zinc-500">{label}</p>
      <div className="flex gap-3">
        <div className="h-28 w-24 shrink-0 overflow-hidden rounded-lg bg-violet-100">
          {item.images?.[0] && <img src={item.images[0]} alt={item.title} className="h-full w-full object-cover" />}
        </div>
        <div>
          <p className="font-bold">{item.title}</p>
          <p className="text-sm text-zinc-500">{item.brand} · Size {item.size} · {item.condition}</p>
          <p className="mt-1 font-extrabold text-violet-600">₹{item.estimatedValue}</p>
        </div>
      </div>
    </div>
  );
}

export default function RequestSwap() {
  const { itemId } = useParams();
  const [params] = useSearchParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [target, setTarget] = useState(null);
  const [mine, setMine] = useState([]);
  const [sel, setSel] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api(`/items/${itemId}`), api("/items/mine", { token })])
      .then(([a, b]) => {
        setTarget(a.item);
        const avail = b.items.filter((i) => i.status === "AVAILABLE");
        setMine(avail);
        const o = params.get("offer");
        if (o && avail.some((i) => i._id === o)) setSel(o);

      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [itemId, token]);

  const offered = mine.find((i) => i._id === sel);
  const diff = offered && target ? Math.abs(target.estimatedValue - offered.estimatedValue) : 0;
  const fair = offered && target ? diff <= target.estimatedValue * 0.2 : false;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!sel) return setError("Choose one of your items to offer.");
    setBusy(true);
    try {
      await api("/swaps", { method: "POST", token, body: { requestedItemId: itemId, offeredItemId: sel, message } });
      navigate("/swaps");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p className="text-zinc-500">Loading...</p>;
  if (!target) return <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-600">{error || "Item not found."}</p>;

  return (
    <div className="mx-auto max-w-3xl">
      <Link to={`/items/${itemId}`} className="text-sm font-semibold text-violet-600">← Back to item</Link>
      <h1 className="mb-5 mt-3 text-3xl font-extrabold">Request a swap</h1>
      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

      {target.status !== "AVAILABLE" ? (
        <p className="rounded-lg bg-white p-6 text-zinc-600">This item is no longer available for swapping.</p>
      ) : mine.length === 0 ? (
        <p className="rounded-lg bg-white p-6 text-zinc-600">
          You have no available items to offer yet.{" "}
          <Link to="/add" className="font-semibold text-violet-600">List an item first</Link>.
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <ItemBox item={target} label="You get" />
            <div>
              <label className="block text-sm font-bold text-zinc-500">
                You give
                <select value={sel} onChange={(e) => setSel(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-zinc-300 bg-white p-3 font-normal text-zinc-900 outline-violet-500">
                  <option value="">Choose one of your items</option>
                  {mine.map((i) => <option key={i._id} value={i._id}>{i.title} (₹{i.estimatedValue})</option>)}
                </select>
              </label>
              {offered && <div className="mt-3"><ItemBox item={offered} label="Your offer" /></div>}
            </div>
          </div>

          {offered && (
            <p className={`rounded-lg p-3 text-sm ${fair ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
              <b>{fair ? "Looks like a fair swap." : "This swap looks uneven."}</b> Difference: ₹{diff}.
              Values are estimates only, so you can still negotiate.
            </p>
          )}

          <label className="block text-sm font-semibold">
            Message (optional)
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} maxLength={300}
              placeholder="Say hello and tell them why you like their item"
              className="mt-1 w-full rounded-lg border border-zinc-300 p-3 font-normal outline-violet-500" />
          </label>

          <button disabled={busy} className="rounded-lg bg-violet-600 px-6 py-3 font-bold text-white hover:bg-violet-700 disabled:opacity-50">
            {busy ? "Sending..." : "Send swap request"}
          </button>
        </form>
      )}
    </div>
  );
}