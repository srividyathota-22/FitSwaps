import { useState } from "react";
import { api } from "../api";
import { useAuth } from "../AuthContext";

const field = "mt-1 w-full rounded-lg border border-zinc-300 p-3 font-normal outline-violet-500";

export default function Profile() {
  const { user, token, setUser } = useAuth();
  const [form, setForm] = useState({
    name: user.name || "",
    phone: user.phone || "",
    city: user.city || "",
    state: user.state || "",
  });
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setOk("");
    if (form.name.trim().length < 2) return setError("Name must be at least 2 characters.");
    if (!form.city.trim()) return setError("City is required.");
    setBusy(true);
    try {
      const d = await api("/auth/profile", { method: "PUT", token, body: form });
      setUser(d.user);
      setOk("Profile updated.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md rounded-xl border border-violet-100 bg-white p-8 shadow-sm">
      <h1 className="mb-1 text-3xl font-extrabold">Your profile</h1>
      <p className="mb-6 text-sm text-zinc-500">
        Your phone number is private. Other users cannot see it. Your city is used to show nearby swaps.
      </p>
      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
      {ok && <p role="status" className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{ok}</p>}
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm font-semibold">
          Full name
          <input name="name" value={form.name} onChange={change} className={field} />
        </label>
        <label className="block text-sm font-semibold">
          Email
          <input value={user.email} disabled className={`${field} bg-zinc-100 text-zinc-500`} />
        </label>
        <label className="block text-sm font-semibold">
          Phone (optional)
          <input name="phone" value={form.phone} onChange={change} placeholder="e.g. 9876543210" className={field} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-semibold">
            City
            <input name="city" value={form.city} onChange={change} className={field} />
          </label>
          <label className="block text-sm font-semibold">
            State
            <input name="state" value={form.state} onChange={change} className={field} />
          </label>
        </div>
        <button disabled={busy} className="w-full rounded-lg bg-violet-600 py-3 font-bold text-white hover:bg-violet-700 disabled:opacity-50">
          {busy ? "Saving..." : "Save profile"}
        </button>
      </form>
    </div>
  );
}