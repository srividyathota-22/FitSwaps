import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext";

export default function ItemCard({ item }) {
  const { user } = useAuth();
  const ownerId = String(item.owner?._id || item.owner || "");
  const near =
    user &&
    ownerId !== String(user.id) &&
    item.city &&
    user.city &&
    item.city.trim().toLowerCase() === user.city.trim().toLowerCase();

  return (
    <Link to={`/items/${item._id}`} className="group block">
      <div className="relative aspect-4/5 overflow-hidden rounded-lg bg-violet-100">
        {item.images?.[0] ? (
                    <img
            src={item.images[0]}
            alt={item.title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-5xl">👗</div>
        )}
        <span className="absolute left-2 top-2 rounded bg-white px-2 py-0.5 text-xs font-bold text-zinc-800">
          {item.condition}
        </span>
        {near && (
          <span className="absolute bottom-2 left-2 rounded bg-violet-600 px-2 py-0.5 text-xs font-bold text-white">
            Near you
          </span>
        )}
      </div>
      <div className="pt-2">
        <p className="truncate font-bold text-zinc-900">{item.title}</p>
        <p className="truncate text-sm text-zinc-500">
          {item.brand} · {item.size} · {item.owner?.city || item.city}
        </p>
        <p className="text-sm font-extrabold text-violet-600">
          ₹{item.estimatedValue} swap value
        </p>
      </div>
    </Link>
  );
}