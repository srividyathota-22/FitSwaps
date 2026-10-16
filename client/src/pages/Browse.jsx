import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import { CATEGORIES, CONDITIONS, SECTIONS } from "../constants";
import ItemCard from "../components/ItemCard";

const sel = "rounded-lg border border-zinc-300 bg-white p-2.5 text-sm outline-violet-500";
const EMPTY = { q: "", section: "", category: "", condition: "", city: "", sort: "newest" };

export default function Browse() {
  const { user, token } = useAuth();
  const [params] = useSearchParams();
  const [filters, setFilters] = useState({ ...EMPTY, section: params.get("section") || "" });
  const [ownerFilter, setOwnerFilter] = useState(null);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [nearby, setNearby] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const change = (e) => setFilters({ ...filters, [e.target.name]: e.target.value });
  const notMine = (i) => String(i.owner?._id) !== String(user.id);
  const hasFilters =
    !!ownerFilter || Object.entries(filters).some(([k, v]) => v && !(k === "sort" && v === "newest"));
  const query = (p) =>
    new URLSearchParams({
      ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
      ...(ownerFilter ? { owner: ownerFilter.id } : {}),
      page: p,
      limit: 24,
    }).toString();

  useEffect(() => {
    setFilters((f) => ({ ...f, section: params.get("section") || "" }));
  }, [params]);

  useEffect(() => {
    if (!user.city) return;
    api(`/items?city=${encodeURIComponent(user.city)}&limit=8`)
      .then((d) => setNearby(d.items.filter(notMine).slice(0, 4)))
      .catch(() => {});
    api("/community/nearby", { token })
      .then((d) => setPeople(d.people))
      .catch(() => {});
  }, [user.city, token]);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      api(`/items?${query(1)}`)
        .then((d) => {
          setItems(d.items.filter(notMine));
          setHasMore(d.hasMore);
          setPage(1);
          setError("");
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [filters, ownerFilter]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const d = await api(`/items?${query(page + 1)}`);
      setItems((list) => [...list, ...d.items.filter(notMine)]);
      setHasMore(d.hasMore);
      setPage(page + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingMore(false);
    }
  };

  const viewPerson = (p) => {
    setOwnerFilter({ id: p._id, name: p.name });
    document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div>
      <div className="mb-6 rounded-xl bg-linear-to-r from-violet-700 to-blue-500 p-8 text-white">
        <h1 className="text-4xl font-extrabold tracking-tight">Swap into something new</h1>
        <p className="mt-2 max-w-md text-violet-100">
          No cash, no waste. Find a piece you love and trade one you no longer wear.
        </p>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {["", ...SECTIONS].map((s) => (
          <button
            key={s || "all"}
            onClick={() => setFilters({ ...filters, section: s })}
            className={`rounded-lg border px-4 py-2 text-sm font-semibold ${
              filters.section === s ? "border-violet-600 bg-violet-600 text-white" : "border-zinc-300 bg-white"
            }`}
          >
            {s === "" ? "All" : s === "Kids" ? "Kids wear" : `${s}'s wear`}
          </button>
        ))}
      </div>

      <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <input name="q" value={filters.q} onChange={change} placeholder="Search hoodie, Levi's..." className={sel} />
        <select name="category" value={filters.category} onChange={change} className={sel}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select name="condition" value={filters.condition} onChange={change} className={sel}>
          <option value="">Any condition</option>
          {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
        </select>
        <input name="city" value={filters.city} onChange={change} placeholder="City" className={sel} />
        <select name="sort" value={filters.sort} onChange={change} className={sel}>
          <option value="newest">Newest</option>
          <option value="low">Lowest value</option>
          <option value="high">Highest value</option>
        </select>
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        {user.city && (
          <button
            onClick={() => setFilters({ ...filters, city: user.city })}
            className="rounded-lg border border-violet-600 px-3 py-1.5 text-sm font-semibold text-violet-700 hover:bg-violet-50"
          >
            Near me ({user.city})
          </button>
        )}
        {hasFilters && (
          <button
            onClick={() => {
              setFilters(EMPTY);
              setOwnerFilter(null);
            }}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-semibold"
          >
            Clear filters
          </button>
        )}
      </div>

      {!hasFilters && people.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-2xl font-extrabold">Swappers near you in {user.city}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {people.map((p) => (
              <div key={p._id} className="flex items-center gap-3 rounded-xl border border-violet-100 bg-white p-4">
                <span
                  aria-hidden="true"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-100 text-lg font-bold text-violet-700"
                >
                  {p.name?.[0]?.toUpperCase() || "?"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold leading-tight">{p.name}</p>
                  <p className="text-xs text-zinc-500">
                    {p.items} item{p.items === 1 ? "" : "s"} to swap
                  </p>
                </div>
                <button onClick={() => viewPerson(p)} className="text-sm font-bold text-violet-700 hover:underline">
                  View
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {!hasFilters && nearby.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-2xl font-extrabold">Nearby swaps in {user.city}</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-4">
            {nearby.map((it) => <ItemCard key={it._id} item={it} />)}
          </div>
        </section>
      )}

      {ownerFilter && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-violet-100 p-3 text-sm">
          <span>
            Showing items from <b>{ownerFilter.name}</b>
          </span>
          <button onClick={() => setOwnerFilter(null)} className="font-semibold text-violet-700">
            Show all
          </button>
        </div>
      )}

      <h2 id="results" className="mb-3 scroll-mt-24 text-2xl font-extrabold">
        {hasFilters ? "Results" : "All clothes"}
      </h2>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-600">{error}</p>}
      {loading && <p className="text-zinc-500">Loading clothes...</p>}
      {!loading && !error && items.length === 0 && (
        <p className="rounded-lg bg-white p-8 text-center text-zinc-500">
          No clothes found. Try clearing a filter, or list the first item!
        </p>
      )}
      <div className="grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-3 lg:grid-cols-4">
        {items.map((it) => <ItemCard key={it._id} item={it} />)}
      </div>

      {hasMore && !loading && (
        <div className="mt-8 text-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="rounded-lg border-2 border-violet-600 px-8 py-3 font-bold text-violet-700 hover:bg-violet-50 disabled:opacity-50"
          >
            {loadingMore ? "Loading..." : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}