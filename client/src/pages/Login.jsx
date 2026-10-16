import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import AuthShell from "../components/AuthShell";

const field =
  "mt-1 w-full rounded-lg border border-zinc-300 p-3 font-normal outline-violet-500 transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200";

export default function Login() {
  const { saveSession } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.email || !form.password) return setError("Email and password are required.");
    setBusy(true);
    try {
      const data = await api("/auth/login", { method: "POST", body: form });
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
      title="Welcome back"
      subtitle="Log in to swap clothes with people near you."
      footer={
        <>
          New here?{" "}
          <Link to="/register" className="font-semibold text-violet-600">Create an account</Link>
        </>
      }
    >
      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>
      )}
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm font-semibold">
          Email
          <input name="email" type="email" value={form.email} onChange={change} className={field} />
        </label>
        <label className="block text-sm font-semibold">
          Password
          <div className="relative">
            <input
              name="password"
              type={show ? "text" : "password"}
              value={form.password}
              onChange={change}
              className={`${field} pr-16`}
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-violet-600"
            >
              {show ? "Hide" : "Show"}
            </button>
          </div>
        </label>
        <button
          disabled={busy}
          className="w-full rounded-lg bg-linear-to-r from-violet-600 to-blue-500 py-3 font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50"
        >
          {busy ? "Logging in..." : "Log in"}
        </button>
        <button
          type="button"
          onClick={() => setForm({ email: "ananya@seed.swap", password: "Swap@123" })}
          className="w-full rounded-lg border border-violet-200 py-2.5 text-sm font-semibold text-violet-700 hover:bg-violet-50"
        >
          Try a demo account
        </button>
      </form>
    </AuthShell>
  );
}