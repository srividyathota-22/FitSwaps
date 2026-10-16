import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext";

const fmt = (d) =>
  new Date(d).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function Mini({ item, label }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-14 w-12 shrink-0 overflow-hidden rounded-lg bg-violet-100">
        {item.images?.[0] && <img src={item.images[0]} alt={item.title} className="h-full w-full object-cover" />}
      </div>
      <div>
        <p className="text-xs font-bold uppercase text-zinc-400">{label}</p>
        <p className="text-sm font-bold leading-tight">{item.title}</p>
        <p className="text-xs text-zinc-500">₹{item.estimatedValue}</p>
      </div>
    </div>
  );
}

export default function Chat() {
  const { swapId } = useParams();
  const { user, token } = useAuth();
  const [swap, setSwap] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottom = useRef(null);
  const lastCount = useRef(0);

  const load = () =>
    api(`/chat/${swapId}`, { token })
      .then((d) => {
        setSwap(d.swap);
        setMessages(d.messages);
        setError("");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [swapId]);

  useEffect(() => {
    if (messages.length !== lastCount.current) {
      bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      lastCount.current = messages.length;
    }
  }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setSending(true);
    try {
      const d = await api(`/chat/${swapId}`, { method: "POST", token, body: { text: body } });
      setMessages((m) => [...m, d.message]);
      setText("");
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  if (loading) return <p className="text-zinc-500">Loading chat...</p>;
  if (!swap)
    return (
      <div>
        <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-600">{error || "Conversation not found."}</p>
        <Link to="/swaps" className="mt-3 inline-block font-semibold text-violet-600">← Back to my swaps</Link>
      </div>
    );

  const iAmReceiver = String(swap.receiver._id) === String(user.id);
  const other = iAmReceiver ? swap.requester : swap.receiver;
  const open = ["PENDING", "ACCEPTED"].includes(swap.status);

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/swaps" className="text-sm font-semibold text-violet-600">← Back to my swaps</Link>

      <div className="mt-3 rounded-xl border border-violet-100 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-extrabold">Chat with {other.name}</h1>
          <span className="rounded bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-700">
            {swap.status.charAt(0) + swap.status.slice(1).toLowerCase()}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Mini item={swap.requestedItem} label={iAmReceiver ? "Your item" : "You get"} />
          <Mini item={swap.offeredItem} label={iAmReceiver ? "They offer" : "You give"} />
        </div>
      </div>

      <div className="mt-4 flex h-105 flex-col gap-3 overflow-y-auto rounded-xl border border-violet-100 bg-white p-4" aria-live="polite">
        {messages.length === 0 && (
          <p className="m-auto text-center text-zinc-500">No messages yet. Say hello and discuss the swap!</p>
        )}
        {messages.map((m) => {
          const mine = m.sender === String(user.id);
          return (
            <div key={m._id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
              <div className={`max-w-[80%] rounded-xl px-4 py-2 ${mine ? "bg-violet-600 text-white" : "bg-violet-50 text-zinc-900"}`}>
                {m.text}
              </div>
              <span className="mt-1 text-xs text-zinc-400">{mine ? "You" : other.name} · {fmt(m.createdAt)}</span>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>

      {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

      {open ? (
        <form onSubmit={send} className="mt-3 flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            placeholder="Type a message"
            aria-label="Message"
            className="flex-1 rounded-lg border border-zinc-300 bg-white p-3 outline-violet-500"
          />
          <button disabled={sending} className="rounded-lg bg-violet-600 px-6 font-bold text-white hover:bg-violet-700 disabled:opacity-50">
            Send
          </button>
        </form>
      ) : (
        <p className="mt-3 rounded-lg bg-zinc-100 p-3 text-sm text-zinc-600">
          This swap is closed, so the chat is read only.
        </p>
      )}
    </div>
  );
}