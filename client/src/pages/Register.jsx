import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import AuthShell from "../components/AuthShell";

const field =
  "mt-1 w-full rounded-lg border border-zinc-300 p-3 font-normal outline-violet-500 transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200";

export default function Register() {
  const { saveSession } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", city: "", state: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.name.trim().length < 2) return setError("Name must be at least 2 characters.");
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setError("Enter a valid email address.");
    if (form.password.length < 6) return setError("Password must be at least 6 characters.");
    if (form.password !== form.confirm) return setError("Passwords do not match.");
    if (!form.city.trim()) return setError("City is required.");

    setBusy(true);
    try {
      const { confirm, ...body } = form;
      const data = await api("/auth/register", { method: "POST", body });
      saveSession(data);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start swapping clothes instead of buying new."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-violet-600">Log in</Link>
        </>
      }
    >
      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>
      )}
      <form onSubmit={submit} className="space-y-3">
        <label className="block text-sm font-semibold">
          Full name
          <input name="name" value={form.name} onChange={change} className={field} />
        </label>
        <label className="block text-sm font-semibold">
          Email
          <input name="email" type="email" value={form.email} onChange={change} className={field} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-semibold">
            Password
            <input name="password" type="password" value={form.password} onChange={change} className={field} />
          </label>
          <label className="block text-sm font-semibold">
            Confirm
            <input name="confirm" type="password" value={form.confirm} onChange={change} className={field} />
          </label>
        </div>
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
        <button
          disabled={busy}
          className="w-full rounded-lg bg-linear-to-r from-violet-600 to-blue-500 py-3 font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50"
        >
          {busy ? "Creating account..." : "Create account"}
        </button>
      </form>
    </AuthShell>
  );
}