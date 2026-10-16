import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import ItemCard from "../components/ItemCard";

const STEPS = [
  ["1", "List your clothes", "Add photos, brand, size and condition. We estimate a fair swap value for you."],
  ["2", "Request a swap", "Pick something you like and offer one of your items. Compare both values side by side."],
  ["3", "Chat and swap", "Negotiate in chat, confirm the swap, then exchange locally or by courier."],
];

export default function Home() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    api("/items?sort=newest")
      .then((d) => setItems(d.items.slice(0, 4)))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-20">
      <section className="grid items-center gap-8 pt-4 md:grid-cols-5">
        <div className="rise md:col-span-2">

          <h2 className="text-5xl font-extrabold leading-[1.05] tracking-tight text-zinc-900 md:text-6xl">
            Swap Clothes, Refresh Your Wardrobe.
          </h2>
          <p className="mt-5 max-w-md text-lg text-zinc-600">
            Give your unused clothes a new life and discover something new without buying more.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/register"
              className="rounded-lg bg-linear-to-r from-violet-600 to-blue-500 px-6 py-3 font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              Explore Clothes
            </Link>
            <Link
              to="/register"
              className="rounded-lg border-2 border-zinc-900 px-6 py-3 font-bold text-zinc-900 transition hover:bg-zinc-900 hover:text-white"
            >
              List an Item
            </Link>
          </div>
          <p className="mt-4 text-sm text-zinc-500">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-violet-600">Log in</Link>
          </p>
        </div>
        <img
  src="/hero/collage.jpg"
  alt="Friends choosing clothes at thrift racks and trying on outfits"
  className="block w-full md:col-span-3 md:translate-x-16 md:scale-110"
/>
      </section>

      

      {items.length > 0 && (
        <section>
          <div className="mb-6 flex items-end justify-between">
            <h2 className="text-3xl font-extrabold tracking-tight">Fresh on the rack</h2>
            <Link to="/register" className="text-sm font-semibold text-violet-600">
              Join to see more →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-4">
            {items.map((it) => <ItemCard key={it._id} item={it} />)}
          </div>
        </section>
      )}

      <section className="grid items-center gap-8 md:grid-cols-2">
        <img
          src="/hero/friends-1.jpg"
          alt="Two friends trying on beige shirts together"
          className="aspect-4/3 w-full rounded-2xl object-cover"
        />
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">Good for your wardrobe, good for the planet</h2>
          <p className="mt-4 text-zinc-600">
            Fast fashion creates a lot of textile waste, while many clothes sit unused in cupboards.
            Swapping lets them find a second home, so you get something new and nothing goes to waste.
          </p>
          <ul className="mt-5 space-y-2 font-semibold">
            <li>✓ No money changes hands</li>
            <li>✓ Fair swap value estimates</li>
            <li>✓ Nearby swaps in your city</li>
          </ul>
        </div>
      </section>

<section className="relative overflow-hidden rounded-2xl">
  <img
    src="/hero/denim.jpg"
    alt="A rack of denim jackets and shirts on wooden hangers"
    className="h-64 w-full object-cover md:h-80"
  />
  <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/45 px-4 text-center text-white">
    <h2 className="text-3xl font-extrabold tracking-tight md:text-5xl">New stories. Same clothes.</h2>
    <p className="mt-3 text-sm font-semibold tracking-widest">SWAP • REFRESH • REPEAT</p>
  </div>
</section>
    </div>
  );
}