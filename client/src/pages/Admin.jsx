import { Fragment, useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../AuthContext";

const TABS = [
  ["overview", "Overview"], ["users", "Users"], ["items", "Listings"],
  ["swaps", "Swaps"], ["disputes", "Disputes"],
];
const PATHS = {
  overview: "/admin/stats", users: "/admin/users", items: "/admin/items",
  swaps: "/admin/swaps", disputes: "/admin/disputes",
};
const th = "p-2 text-left text-xs font-bold uppercase text-zinc-500";
const td = "border-t border-zinc-100 p-2 text-sm";
const btn = "rounded-lg border border-zinc-400 px-3 py-1 text-sm font-semibold hover:bg-zinc-100";
const searchBox = "mb-3 w-full max-w-sm rounded-lg border border-zinc-300 bg-white p-2 text-sm";

const fmt = (d) =>
  new Date(d).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function GroupedBars({ title, days, series }) {
  const W = 560, H = 200, padL = 28, padB = 24, padT = 10;
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const gw = (W - padL) / days.length;
  const bw = Math.max(2, (gw - 6) / series.length);
  const y = (v) => padT + (H - padT - padB) * (1 - v / max);
  return (
    <div className="rounded-xl border border-violet-100 bg-white p-4">
      <h3 className="mb-1 text-sm font-bold">{title}</h3>
      <div className="mb-2 flex gap-4 text-xs text-zinc-600">
        {series.map((s) => (
          <span key={s.name} className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ background: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={title}>
        {[0, 0.5, 1].map((t) => (
          <g key={t}>
            <line x1={padL} x2={W} y1={y(max * t)} y2={y(max * t)} stroke="#e4e4e7" />
            <text x={padL - 4} y={y(max * t) + 3} textAnchor="end" fontSize="9" fill="#71717a">
              {Math.round(max * t)}
            </text>
          </g>
        ))}
        {days.map((d, i) => (
          <g key={d}>
            {series.map((s, j) => (
              <rect
                key={s.name}
                x={padL + i * gw + 3 + j * bw}
                y={y(s.values[i])}
                width={bw - 1}
                height={H - padB - y(s.values[i])}
                fill={s.color}
                rx="1"
              >
                <title>{`${d}: ${s.name} ${s.values[i]}`}</title>
              </rect>
            ))}
            {i % 2 === 0 && (
              <text x={padL + i * gw + gw / 2} y={H - 8} textAnchor="middle" fontSize="9" fill="#71717a">
                {d.slice(5)}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

function HBars({ title, rows }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="rounded-xl border border-violet-100 bg-white p-4">
      <h3 className="mb-3 text-sm font-bold">{title}</h3>
      {rows.length === 0 && <p className="text-sm text-zinc-500">No data yet.</p>}
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.label} className="text-sm">
            <div className="mb-0.5 flex justify-between">
              <span>{r.label}</span>
              <span className="font-semibold">{r.count}</span>
            </div>
            <div className="h-2 rounded bg-violet-100">
              <div className="h-2 rounded bg-violet-600" style={{ width: `${(r.count / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Admin() {
  const { token } = useAuth();
  const [tab, setTab] = useState("overview");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [q, setQ] = useState("");
  const [resolving, setResolving] = useState(null);
  const [note, setNote] = useState("");

  const load = (t = tab) =>
    (t === "overview"
      ? Promise.all([api(PATHS.overview, { token }), api("/admin/analytics", { token })]).then(
          ([s, a]) => ({ ...s, analytics: a })
        )
      : api(PATHS[t], { token })
    )
      .then((d) => { setData({ tab: t, ...d }); setError(""); })
      .catch((e) => setError(e.message));

  useEffect(() => {
    setData(null);
    setOpen(null);
    setQ("");
    setResolving(null);
    setNote("");
    load(tab);
  }, [tab]);

  const run = (p) => p.then(() => load()).catch((e) => setError(e.message));

  const toggleUser = (u) =>
    run(api(`/admin/users/${u._id}/suspend`, { method: "PATCH", token, body: { suspended: !u.suspended } }));
  const toggleItem = (i) =>
    run(api(`/admin/items/${i._id}/hide`, { method: "PATCH", token, body: { hidden: i.status !== "HIDDEN" } }));
  const removeItem = (i) => {
    if (!window.confirm(`Delete "${i.title}" permanently? This cannot be undone.`)) return;
    run(api(`/admin/items/${i._id}`, { method: "DELETE", token }));
  };

  // key = row id used to open/close, swapId = swap whose chat to load
  const viewChat = async (key, swapId) => {
    if (open === key) return setOpen(null);
    try {
      const d = await api(`/admin/swaps/${swapId}/messages`, { token });
      setMsgs(d.messages);
      setOpen(key);
    } catch (e) {
      setError(e.message);
    }
  };

  const resolve = async (d) => {
    const text = note.trim();
    if (text.length < 5 || text.length > 300) return setError("Resolution note must be 5 to 300 characters.");
    try {
      await api(`/admin/disputes/${d._id}/resolve`, { method: "PATCH", token, body: { note: text } });
      setResolving(null);
      setNote("");
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  const ready = data && data.tab === tab;
  const st = ready && data.stats;
  const an = ready && data.analytics;
  const cards = st
    ? [
        ["Total users", st.users], ["Total listings", st.items], ["Available listings", st.activeItems],
        ["Active swaps", st.activeSwaps], ["Completed swaps", st.completed], ["Swap requests", st.requests],
        ["New users (7 days)", st.newUsers], ["New listings (7 days)", st.newItems],
        ["Open disputes", st.openDisputes],
        ["Active users (7 days)", st.activeUsers],
        ["Swap conversion", `${st.conversion}%`],
      ]
    : [];

  const downloadCsv = () => {
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = [
      ["Metric", "Value"], ...cards,
      [],
      ["Date", "New users", "New listings", "Swap requests", "Swaps completed"],
      ...an.days.map((d, i) => [d, an.newUsers[i], an.newListings[i], an.swapRequests[i], an.swapsCompleted[i]]),
      [], ["Category", "Count"], ...an.categories.map((c) => [c.label, c.count]),
      [], ["Section", "Count"], ...an.sections.map((c) => [c.label, c.count]),
      [], ["Swap status", "Count"], ...an.swapStatuses.map((c) => [c.label, c.count]),
    ];
    const csv = rows.map((r) => r.map(esc).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `fitswaps-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const needle = q.trim().toLowerCase();
  const has = (...f) => !needle || f.some((v) => String(v || "").toLowerCase().includes(needle));

  return (
    <div>
      <h1 className="mb-4 text-3xl font-extrabold">Admin panel</h1>
      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`rounded-lg border px-4 py-2 text-sm font-semibold ${tab === k ? "border-violet-600 bg-violet-600 text-white" : "border-zinc-300 bg-white"}`}>
            {l}
          </button>
        ))}
      </div>

      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
      {!ready && !error && <p className="text-zinc-500">Loading...</p>}

      {tab === "overview" && st && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {cards.map(([l, n]) => (
              <div key={l} className="rounded-xl border border-violet-100 bg-white p-4">
                <p className="text-3xl font-extrabold text-violet-600">{n}</p>
                <p className="text-sm text-zinc-500">{l}</p>
              </div>
            ))}
          </div>

          {an && (
            <div className="mt-6">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xl font-extrabold">Last 14 days</h2>
                <button onClick={downloadCsv} className={btn}>Download report (CSV)</button>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <GroupedBars
                  title="New users and new listings"
                  days={an.days}
                  series={[
                    { name: "New users", color: "#7c3aed", values: an.newUsers },
                    { name: "New listings", color: "#3b82f6", values: an.newListings },
                  ]}
                />
                <GroupedBars
                  title="Swap requests and completed swaps"
                  days={an.days}
                  series={[
                    { name: "Swap requests", color: "#7c3aed", values: an.swapRequests },
                    { name: "Swaps completed", color: "#10b981", values: an.swapsCompleted },
                  ]}
                />
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <HBars title="Top categories" rows={an.categories} />
                <HBars title="Listings by section" rows={an.sections} />
                <HBars title="Swaps by status" rows={an.swapStatuses} />
              </div>
            </div>
          )}
        </>
      )}

      {tab === "users" && ready && data.users && (
        <>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email or city"
            aria-label="Search users" className={searchBox} />
          <div className="overflow-x-auto rounded-xl border border-violet-100 bg-white">
            <table className="w-full">
              <thead><tr><th className={th}>Name</th><th className={th}>Email</th><th className={th}>City</th><th className={th}>Role</th><th className={th}>Status</th><th className={th}></th></tr></thead>
              <tbody>
                {data.users.filter((u) => has(u.name, u.email, u.city)).map((u) => (
                  <tr key={u._id}>
                    <td className={td}>{u.name}</td>
                    <td className={td}>{u.email}</td>
                    <td className={td}>{u.city}</td>
                    <td className={td}>{u.role}</td>
                    <td className={td}>{u.suspended ? "Suspended" : "Active"}</td>
                    <td className={td}>
                      {u.role !== "admin" && (
                        <button onClick={() => toggleUser(u)} className={btn}>{u.suspended ? "Reactivate" : "Suspend"}</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "items" && ready && data.items && (
        <>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, owner, city or ID"
            aria-label="Search listings" className={searchBox} />
          <div className="overflow-x-auto rounded-xl border border-violet-100 bg-white">
            <table className="w-full">
              <thead><tr><th className={th}>Item</th><th className={th}>Owner</th><th className={th}>City</th><th className={th}>Value</th><th className={th}>Status</th><th className={th}></th></tr></thead>
              <tbody>
                {data.items.filter((i) => has(i.title, i.owner?.name, i.city, i.code)).map((i) => (
                  <tr key={i._id}>
                    <td className={td}>{i.title}</td>
                    <td className={td}>{i.owner?.name}</td>
                    <td className={td}>{i.city}</td>
                    <td className={td}>₹{i.estimatedValue}</td>
                    <td className={td}>{i.status.replace("_", " ")}</td>
                    <td className={td}>
                      <div className="flex gap-2">
                        {(i.status === "AVAILABLE" || i.status === "HIDDEN") && (
                          <button onClick={() => toggleItem(i)} className={btn}>{i.status === "HIDDEN" ? "Unhide" : "Hide"}</button>
                        )}
                        <button onClick={() => removeItem(i)}
                          className="rounded-lg border border-red-400 px-3 py-1 text-sm font-semibold text-red-600 hover:bg-red-50">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "swaps" && ready && data.swaps && (
        <div className="overflow-x-auto rounded-xl border border-violet-100 bg-white">
          <table className="w-full">
            <thead><tr><th className={th}>People</th><th className={th}>Requested</th><th className={th}>Offered</th><th className={th}>Status</th><th className={th}></th></tr></thead>
            <tbody>
              {data.swaps.map((s) => (
                <Fragment key={s._id}>
                  <tr>
                    <td className={td}>{s.requester?.name} → {s.receiver?.name}</td>
                    <td className={td}>{s.requestedItem?.title}</td>
                    <td className={td}>{s.offeredItem?.title}</td>
                    <td className={td}>{s.status}</td>
                    <td className={td}>
                      <button onClick={() => viewChat(s._id, s._id)} className={btn}>{open === s._id ? "Hide chat" : "View chat"}</button>
                    </td>
                  </tr>
                  {open === s._id && (
                    <tr>
                      <td colSpan={5} className="bg-violet-50 p-3 text-sm">
                        {msgs.length === 0 ? (
                          <p className="text-zinc-500">No messages in this swap.</p>
                        ) : (
                          msgs.map((m) => (
                            <p key={m._id}><b>{m.sender}:</b> {m.text}</p>
                          ))
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "disputes" && ready && data.disputes && (
        <div className="space-y-4">
          {data.disputes.length === 0 && (
            <p className="rounded-lg bg-white p-8 text-center text-zinc-500">No disputes reported yet.</p>
          )}
          {data.disputes.map((d) => (
            <div key={d._id} className="rounded-xl border border-violet-100 bg-white p-5">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className={`rounded px-2 py-0.5 text-xs font-bold ${d.status === "OPEN" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                  {d.status === "OPEN" ? "Open" : "Resolved"}
                </span>
                {d.swap?.code && (
                  <span className="rounded bg-zinc-100 px-2 py-0.5 font-mono text-xs font-bold text-zinc-600">{d.swap.code}</span>
                )}
                <span className="text-sm text-zinc-600">
                  {d.swap?.requester?.name} → {d.swap?.receiver?.name}
                </span>
                <span className="text-xs text-zinc-400">{fmt(d.createdAt)}</span>
              </div>
              <p className="text-sm"><b>Reported by:</b> {d.reporter?.name} ({d.reporter?.email})</p>
              <p className="text-sm"><b>Reason:</b> {d.reason}</p>
              {d.details && <p className="mt-2 rounded-lg bg-violet-50 p-3 text-sm">"{d.details}"</p>}
              {d.status === "RESOLVED" && (
                <p className="mt-2 rounded-lg bg-emerald-50 p-3 text-sm">
                  <b>Resolution:</b> {d.resolution}
                  <span className="text-xs text-zinc-500">
                    {" "}· {d.resolvedBy?.name || "Admin"}{d.resolvedAt ? ` · ${fmt(d.resolvedAt)}` : ""}
                  </span>
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {d.swap?._id && (
                  <button onClick={() => viewChat(d._id, d.swap._id)} className={btn}>
                    {open === d._id ? "Hide chat" : "View chat"}
                  </button>
                )}
                {d.status === "OPEN" && (
                  <button onClick={() => { setResolving(resolving === d._id ? null : d._id); setNote(""); }}
                    className="rounded-lg bg-violet-600 px-3 py-1 text-sm font-semibold text-white hover:bg-violet-700">
                    Resolve
                  </button>
                )}
              </div>

              {open === d._id && (
                <div className="mt-3 rounded-lg bg-violet-50 p-3 text-sm">
                  {msgs.length === 0 ? (
                    <p className="text-zinc-500">No messages in this swap.</p>
                  ) : (
                    msgs.map((m) => (
                      <p key={m._id}><b>{m.sender}:</b> {m.text}</p>
                    ))
                  )}
                </div>
              )}

              {resolving === d._id && (
                <div className="mt-3">
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={300}
                    rows={3}
                    placeholder="Resolution note (5 to 300 characters). Both users will see this in the swap timeline."
                    aria-label="Resolution note"
                    className="w-full rounded-lg border border-zinc-300 p-2 text-sm"
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-zinc-500">{note.length}/300</span>
                    <button onClick={() => resolve(d)}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700">
                      Mark resolved
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}