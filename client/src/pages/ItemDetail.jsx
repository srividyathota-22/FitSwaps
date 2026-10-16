import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext";

export default function ItemDetail() {
  const { id } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [myItems, setMyItems] = useState([]);
  const [error, setError] = useState("");
  const [active, setActive] = useState(0);

  useEffect(() => {
    setActive(0);
    api(`/items/${id}`).then((d) => setItem(d.item)).catch((e) => setError(e.message));
  }, [id]);

  useEffect(() => {
    api("/items/mine", { token })
      .then((d) => setMyItems(d.items.filter((i) => i.status === "AVAILABLE")))
      .catch(() => {});
  }, [token]);

  const remove = async () => {
    if (!window.confirm("Delete this listing?")) return;
    try {
      await api(`/items/${id}`, { method: "DELETE", token });
      navigate("/");
    } catch (e) {
      setError(e.message);
    }
  };

  if (error) return <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-600">{error}</p>;
  if (!item) return <p className="text-zinc-500">Loading...</p>;

  const mine = String(item.owner?._id) === String(user.id);
  const fair = myItems
    .filter((i) => Math.abs(i.estimatedValue - item.estimatedValue) <= item.estimatedValue * 0.2)
    .slice(0, 3);
  const sameCity =
    item.city && user.city && item.city.trim().toLowerCase() === user.city.trim().toLowerCase();
  const itemCode = item.code || item._id.slice(-6).toUpperCase();

  return (
    <div>
      <Link to="/" className="text-sm font-semibold text-violet-600">← Back to browse</Link>
      <div className="mt-4 grid gap-8 md:grid-cols-2">
        <div>
          <div className="aspect-4/5 overflow-hidden rounded-xl bg-violet-100">
            {item.images[active] && (
              <img src={item.images[active]} alt={item.title} className="h-full w-full object-cover" />
            )}
          </div>
          {item.images.length > 1 && (
            <div className="mt-3 flex gap-2">
              {item.images.map((src, i) => (
                <button key={i} onClick={() => setActive(i)} aria-label={`Photo ${i + 1}`}
                  className={`h-20 w-16 overflow-hidden rounded-lg border-2 ${i === active ? "border-violet-600" : "border-transparent"}`}>
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-violet-100 bg-white p-6">
          <h1 className="text-3xl font-extrabold tracking-tight">{item.title}</h1>
          <p className="mt-1 text-zinc-500">
            {item.section ? `${item.section} · ` : ""}{item.category} · {item.brand}
          </p>
          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-zinc-500">Size</dt><dd className="font-bold">{item.size}</dd></div>
            <div><dt className="text-zinc-500">Condition</dt><dd className="font-bold">{item.condition}</dd></div>
            <div>
              <dt className="text-zinc-500">Location</dt>
              <dd className="font-bold">
                {item.city}{item.state ? `, ${item.state}` : ""}
                {!mine && sameCity && <span className="ml-2 rounded bg-violet-600 px-2 py-0.5 text-xs text-white">Near you</span>}
              </dd>
            </div>
            <div><dt className="text-zinc-500">Listed by</dt><dd className="font-bold">{item.owner?.name}</dd></div>
            <div><dt className="text-zinc-500">Item ID</dt><dd className="font-mono font-bold">{itemCode}</dd></div>
          </dl>
          {item.description && <p className="mt-5 whitespace-pre-line text-zinc-700">{item.description}</p>}
          <p className="mt-5 text-2xl font-extrabold text-violet-600">
            ₹{item.estimatedValue} <span className="text-sm font-normal text-zinc-500">estimated swap value</span>
          </p>

          <div className="mt-6">
            {mine ? (
              <div className="flex gap-3">
                {item.status === "AVAILABLE" && (
                  <Link to={`/items/${item._id}/edit`} className="rounded-lg bg-violet-600 px-5 py-3 font-bold text-white hover:bg-violet-700">
                    Edit listing
                  </Link>
                )}
                <button onClick={remove} className="rounded-lg border border-red-500 px-5 py-3 font-bold text-red-600 hover:bg-red-50">
                  Delete listing
                </button>
              </div>
            ) : item.status === "AVAILABLE" ? (
              <Link to={`/swap/new/${item._id}`} className="inline-block rounded-lg bg-violet-600 px-6 py-3 font-bold text-white hover:bg-violet-700">
                Request swap
              </Link>
            ) : (
              <p className="font-semibold text-zinc-500">This item is not available for swapping.</p>
            )}
          </div>
        </div>
      </div>

      {!mine && item.status === "AVAILABLE" && (
        <section className="mt-10 rounded-xl border border-violet-100 bg-white p-6">
          <h2 className="text-xl font-extrabold">Fair swap suggestions</h2>
          {myItems.length === 0 ? (
            <p className="mt-2 text-zinc-500">
              <Link to="/add" className="font-semibold text-violet-600">List an item</Link> to see which of your clothes make a fair swap.
            </p>
          ) : fair.length === 0 ? (
            <p className="mt-2 text-zinc-500">
              None of your items are within 20% of this value, but you can still offer one and negotiate.
            </p>
          ) : (
            <>
              <p className="mb-3 mt-1 text-sm text-zinc-500">
                Your items with a similar estimated value (within 20%). Estimates only, so you can still negotiate.
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                {fair.map((i) => (
                  <Link key={i._id} to={`/swap/new/${item._id}?offer=${i._id}`}
                    className="flex items-center gap-3 rounded-lg border border-violet-100 p-3 hover:bg-violet-50">
                    <div className="h-14 w-12 shrink-0 overflow-hidden rounded bg-violet-100">
                      {i.images?.[0] && <img src={i.images[0]} alt={i.title} className="h-full w-full object-cover" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold leading-tight">{i.title}</p>
                      <p className="text-xs font-bold text-violet-600">₹{i.estimatedValue} · Offer this</p>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
