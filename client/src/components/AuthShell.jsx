const FLOATERS = [
  ["👗", "left-[8%] top-[9%]", "0s"],
  ["🧥", "right-[10%] top-[15%]", "1.2s"],
  ["👖", "left-[11%] bottom-[12%]", "2.1s"],
  ["👟", "right-[9%] bottom-[9%]", "0.6s"],
];

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="mx-auto mt-2 grid max-w-4xl overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-xl md:grid-cols-2">
      <div className="relative hidden min-h-140 flex-col items-center justify-center overflow-hidden bg-linear-to-br from-violet-700 via-violet-600 to-blue-500 p-8 text-white md:flex">
        {FLOATERS.map(([emoji, pos, delay]) => (
          <span
            key={emoji}
            aria-hidden="true"
            className={`float absolute text-4xl opacity-60 ${pos}`}
            style={{ animationDelay: delay }}
          >
            {emoji}
          </span>
        ))}

        <div className="relative z-10 flex gap-2" aria-hidden="true">
          <div className="swap-a flex h-36 w-28 flex-col items-center justify-center rounded-xl bg-white text-zinc-900 shadow-2xl">
            <span className="text-5xl">🧥</span>
            <span className="mt-2 text-xs font-bold">Denim jacket</span>
            <span className="text-xs font-extrabold text-violet-600">₹2400</span>
          </div>
          <div className="swap-b flex h-36 w-28 flex-col items-center justify-center rounded-xl bg-white text-zinc-900 shadow-2xl">
            <span className="text-5xl">👗</span>
            <span className="mt-2 text-xs font-bold">Floral dress</span>
            <span className="text-xs font-extrabold text-violet-600">₹1800</span>
          </div>
        </div>

        <h2 className="relative z-10 mt-14 text-center text-3xl font-extrabold leading-tight tracking-tight">
          Swap clothes.
          <br />
          Refresh your wardrobe.
        </h2>
        <p className="relative z-10 mt-3 max-w-xs text-center text-violet-100">
          Trade what you no longer wear for something new. No cash, no waste.
        </p>
      </div>

      <div className="flex flex-col justify-center p-8 sm:p-10">
        <h1 className="rise text-3xl font-extrabold tracking-tight text-zinc-900">{title}</h1>
        <p className="rise mb-6 mt-1 text-zinc-500" style={{ animationDelay: "0.08s" }}>{subtitle}</p>
        <div className="rise" style={{ animationDelay: "0.16s" }}>{children}</div>
        <div className="rise mt-5 text-center text-sm text-zinc-600" style={{ animationDelay: "0.24s" }}>
          {footer}
        </div>
      </div>
    </div>
  );
}