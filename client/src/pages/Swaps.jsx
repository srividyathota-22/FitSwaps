import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext";

const ACTIVE = ["PENDING", "ACCEPTED"];
const TONE = {
  PENDING: "bg-amber-100 text-amber-800",
  ACCEPTED: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-700",
  CANCELLED: "bg-zinc-200 text-zinc-700",
};
const LABEL = {
  PENDING: "Pending", ACCEPTED: "Accepted", COMPLETED: "Completed",
  REJECTED: "Rejected", CANCELLED: "Cancelled",
};
const COURIERS = ["Meet in person", "DTDC", "Delhivery", "India Post", "Blue Dart", "Other"];
const REASONS = [
  "Item not received",
  "Item not as described",
  "Other person is not responding",
  "Rude or abusive behaviour",
  "Other",
];
const STEPS = ["Requested", "Accepted", "Completed"];
const stepIndex = (status) => (status === "PENDING" ? 0 : status === "ACCEPTED" ? 1 : status === "COMPLETED" ? 2 : -1);

const fmt = (d) =>
  new Date(d).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function Mini({ item }) {
  return (
    <Link to={`/items/${item._id}`} className="flex items-center gap-3">
      <div className="h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-violet-100">
        {item.images?.[0] && <img src={item.images[0]} alt={item.title} className="h-full w-full object-cover" />}
      </div>
      <div>
        <p className="font-bold leading-tight">{item.title}</p>
        <p className="text-sm text-zinc-500">₹{item.estimatedValue} · {item.brand}</p>
        {item.code && <p className="font-mono text-xs text-zinc-400">{item.code}</p>}
      </div>
    </Link>
  );
}

function Progress({ status }) {
  const idx = stepIndex(status);
  if (idx === -1)
    return (
      <p className={`inline-block rounded px-2 py-1 text-xs font-bold ${TONE[status]}`}>
        This swap was {LABEL[status].toLowerCase()}
      </p>
    );
  return (
    <ol className="flex items-center gap-2" aria-label="Swap progress">
      {STEPS.map((s, i) => (
        <li key={s} className="flex items-center gap-2">
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
              i <= idx ? "bg-violet-600 text-white" : "bg-zinc-200 text-zinc-500"
            }`}
          >
            {i < idx ? "✓" : i + 1}
          </span>
          <span className={`text-sm ${i <= idx ? "font-semibold text-zinc-900" : "text-zinc-400"}`}>{s}</span>
          {i < STEPS.length - 1 && <span className={`h-0.5 w-6 ${i < idx ? "bg-violet-600" : "bg-zinc-200"}`} />}
        </li>
      ))}
    </ol>
  );
}
function ReportProblem({ swap, token, onDone }) {
  const [show, setShow] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api("/disputes", { method: "POST", token, body: { swapId: swap._id, reason, details } });
      setSent(true);
      setShow(false);
      setDetails("");
      await onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        onClick={() => { setShow(!show); setError(""); }}
        aria-expanded={show}
        className="rounded-lg border border-amber-400 px-4 py-2 text-sm font-bold text-amber-700 hover:bg-amber-50"
      >
        Report a problem
      </button>
      {sent && <p className="self-center text-sm text-emerald-700">Report sent. Our team will review it.</p>}
      {show && (
        <form onSubmit={submit} className="w-full rounded-lg bg-amber-50 p-4">
          {error && <p role="alert" className="mb-2 rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>}
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            aria-label="Reason"
            className="mb-2 w-full rounded-lg border border-zinc-300 bg-white p-2 text-sm"
          >
            {REASONS.map((r) => <option key={r}>{r}</option>)}
          </select>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Tell us what happened (optional)"
            aria-label="Details"
            className="w-full rounded-lg border border-zinc-300 bg-white p-2 text-sm"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-zinc-500">{details.length}/500</span>
            <button disabled={busy} className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
              {busy ? "Sending..." : "Submit report"}
            </button>
          </div>
        </form>
      )}
    </>
  );
}

function Tracker({ swap, token, onChange }) {
  const [courier, setCourier] = useState("Meet in person");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const events = swap.events?.length
    ? swap.events
    : [
        { _id: "created", label: "Swap requested", at: swap.createdAt, by: swap.requester },
        ...(swap.status !== "PENDING"
          ? [{ _id: "latest", label: `Swap ${LABEL[swap.status].toLowerCase()}`, at: swap.updatedAt }]
          : []),
      ];

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api(`/swaps/${swap._id}/shipment`, { method: "POST", token, body: { courier, trackingNumber } });
      setTrackingNumber("");
      await onChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 rounded-lg bg-violet-50 p-4">
      <h3 className="mb-3 text-sm font-bold">Tracking timeline</h3>
      <ol className="space-y-3 border-l-2 border-violet-200 pl-4">
        {events.map((ev) => (
          <li key={ev._id} className="relative text-sm">
            <span className="absolute top-1 h-3 w-3 rounded-full bg-violet-600" style={{ left: -23 }} />
            <p className="font-semibold">{ev.label}</p>
            <p className="text-xs text-zinc-500">
              {fmt(ev.at)}
              {ev.by?.name ? ` · ${ev.by.name}` : ""}
            </p>
          </li>
        ))}
      </ol>

      {swap.status === "ACCEPTED" && (
        <form onSubmit={submit} className="mt-4 border-t border-violet-100 pt-4">
          <p className="mb-2 text-sm font-bold">How are you sending your item?</p>
          {error && <p role="alert" className="mb-2 rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <select
              value={courier}
              onChange={(e) => setCourier(e.target.value)}
              aria-label="Courier"
              className="rounded-lg border border-zinc-300 bg-white p-2 text-sm"
            >
              {COURIERS.map((c) => <option key={c}>{c}</option>)}
            </select>
            {courier !== "Meet in person" && (
              <input
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                maxLength={40}
                placeholder="Tracking number"
                aria-label="Tracking number"
                className="min-w-160px flex-1 rounded-lg border border-zinc-300 bg-white p-2 text-sm"
              />
            )}
            <button disabled={busy} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
              {busy ? "Saving..." : "Add to timeline"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function Swaps() {
  const { user, token } = useAuth();
  const [swaps, setSwaps] = useState([]);
  const [tab, setTab] = useState("incoming");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(null);

  const load = () =>
    api("/swaps/mine", { token })
      .then((d) => setSwaps(d.swaps))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const act = async (id, status) => {
    setError("");
    try {
      await api(`/swaps/${id}/status`, { method: "PATCH", token, body: { status } });
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  const isIn = (s) => String(s.receiver._id) === String(user.id);
  const lists = {
    incoming: swaps.filter((s) => isIn(s) && ACTIVE.includes(s.status)),
    outgoing: swaps.filter((s) => !isIn(s) && ACTIVE.includes(s.status)),
    history: swaps.filter((s) => !ACTIVE.includes(s.status)),
  };
  const tabs = [["incoming", "Incoming"], ["outgoing", "Outgoing"], ["history", "History"]];
  const btn = "rounded-lg px-4 py-2 text-sm font-bold";

  return (
    <div>
      <h1 className="mb-4 text-3xl font-extrabold">My swaps</h1>
      <div className="mb-5 flex gap-2">
        {tabs.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`rounded-lg border px-4 py-2 text-sm font-semibold ${tab === k ? "border-violet-600 bg-violet-600 text-white" : "border-zinc-300 bg-white"}`}>
            {l} ({lists[k].length})
          </button>
        ))}
      </div>

      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
      {loading && <p className="text-zinc-500">Loading swaps...</p>}
      {!loading && lists[tab].length === 0 && (
        <p className="rounded-lg bg-white p-8 text-center text-zinc-500">
          {tab === "incoming" && "No swap requests yet."}
          {tab === "outgoing" && "You have no active requests. Browse clothes and request a swap!"}
          {tab === "history" && "Finished swaps will appear here."}
        </p>
      )}

      <div className="space-y-4">
        {lists[tab].map((s) => {
          const incoming = isIn(s);
          const other = incoming ? s.requester : s.receiver;
          return (
            <div key={s._id} className="rounded-xl border border-violet-100 bg-white p-5">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className={`rounded px-2 py-0.5 text-xs font-bold ${TONE[s.status]}`}>{LABEL[s.status]}</span>
                {s.code && <span className="rounded bg-zinc-100 px-2 py-0.5 font-mono text-xs font-bold text-zinc-600">{s.code}</span>}
                <span className="text-sm text-zinc-600">
                  {incoming ? `${other.name} wants your item` : `You asked ${other.name} for their item`}
                  {other.city ? ` · ${other.city}` : ""}
                </span>
              </div>

              <div className="mb-4"><Progress status={s.status} /></div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-xs font-bold uppercase text-zinc-400">{incoming ? "They want" : "You get"}</p>
                  <Mini item={s.requestedItem} />
                </div>
                <div>
                  <p className="mb-1 text-xs font-bold uppercase text-zinc-400">{incoming ? "They offer" : "You give"}</p>
                  <Mini item={s.offeredItem} />
                </div>
              </div>
              {s.message && <p className="mt-3 rounded-lg bg-violet-50 p-3 text-sm">"{s.message}"</p>}

              <div className="mt-4 flex flex-wrap gap-2">
                <Link to={`/chat/${s._id}`} className={`${btn} border border-violet-600 text-violet-700 hover:bg-violet-50`}>
                  Chat
                </Link>
                <button
                  onClick={() => setOpen(open === s._id ? null : s._id)}
                  className={`${btn} border border-zinc-300 hover:bg-zinc-50`}
                  aria-expanded={open === s._id}
                >
                  {open === s._id ? "Hide tracking" : "Track swap"}
                </button>
                {(s.status === "ACCEPTED" || s.status === "COMPLETED") && (
                  <ReportProblem swap={s} token={token} onDone={load} />
                )}
                {s.status === "PENDING" && incoming && (
                  <>
                    <button onClick={() => act(s._id, "ACCEPTED")} className={`${btn} bg-violet-600 text-white hover:bg-violet-700`}>Accept</button>
                    <button onClick={() => act(s._id, "REJECTED")} className={`${btn} border border-zinc-400`}>Reject</button>
                  </>
                )}
                {s.status === "PENDING" && !incoming && (
                  <button onClick={() => act(s._id, "CANCELLED")} className={`${btn} border border-zinc-400`}>Cancel request</button>
                )}
                {s.status === "ACCEPTED" && (
                  <>
                    <button onClick={() => act(s._id, "COMPLETED")} className={`${btn} bg-emerald-600 text-white hover:bg-emerald-700`}>Mark completed</button>
                    <button onClick={() => act(s._id, "CANCELLED")} className={`${btn} border border-red-400 text-red-600`}>Cancel swap</button>
                  </>
                )}
              </div>

              {open === s._id && <Tracker swap={s} token={token} onChange={load} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
