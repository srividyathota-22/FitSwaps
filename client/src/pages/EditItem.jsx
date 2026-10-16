import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import { CATEGORIES, CONDITIONS, SECTIONS } from "../constants";
import { resizeImage } from "../utils";

const field = "mt-1 w-full rounded-lg border border-zinc-300 p-3 font-normal outline-violet-500";

export default function EditItem() {
  const { id } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [images, setImages] = useState([]);
  const [value, setValue] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api(`/items/${id}`)
      .then(({ item }) => {
        if (String(item.owner?._id) !== String(user.id)) return setError("You can only edit your own listings.");
        if (item.status !== "AVAILABLE") return setError("Only available items can be edited.");
        const { title, description, section, category, brand, size, condition, city, state } = item;
        setForm({ title, description, section: section || "Women", category, brand, size, condition, city, state });
        setImages(item.images);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  useEffect(() => {
    if (!form || !form.brand.trim()) return;
    const t = setTimeout(() => {
      const qs = new URLSearchParams({ category: form.category, brand: form.brand, condition: form.condition });
      api(`/items/estimate?${qs}`).then((d) => setValue(d.value)).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [form?.category, form?.brand, form?.condition]);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const pickImages = async (e) => {
    setError("");
    const files = Array.from(e.target.files).slice(0, 3 - images.length);
    try {
      const out = await Promise.all(files.map(resizeImage));
      setImages([...images, ...out].slice(0, 3));
    } catch (err) {
      setError(err.message);
    }
    e.target.value = "";
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.title.trim().length < 3) return setError("Title must be at least 3 characters.");
    if (!form.brand.trim()) return setError("Brand is required.");
    if (!form.size.trim()) return setError("Size is required.");
    if (images.length === 0) return setError("Keep at least one photo.");
    setBusy(true);
    try {
      await api(`/items/${id}`, { method: "PUT", token, body: { ...form, images } });
      navigate(`/items/${id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!form)
    return error ? (
      <div>
        <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-600">{error}</p>
        <Link to="/dashboard" className="mt-3 inline-block font-semibold text-violet-600">← Back to dashboard</Link>
      </div>
    ) : (
      <p className="text-zinc-500">Loading...</p>
    );

  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-violet-100 bg-white p-8 shadow-sm">
      <h1 className="mb-6 text-3xl font-extrabold">Edit listing</h1>
      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm font-semibold">
          Title
          <input name="title" value={form.title} onChange={change} className={field} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-semibold">
            For
            <select name="section" value={form.section} onChange={change} className={field}>
              {SECTIONS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label className="block text-sm font-semibold">
            Category
            <select name="category" value={form.category} onChange={change} className={field}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="block text-sm font-semibold">
            Condition
            <select name="condition" value={form.condition} onChange={change} className={field}>
              {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="block text-sm font-semibold">
            Brand
            <input name="brand" value={form.brand} onChange={change} className={field} />
          </label>
          <label className="block text-sm font-semibold">
            Size
            <input name="size" value={form.size} onChange={change} className={field} />
          </label>
          <label className="block text-sm font-semibold">
            City
            <input name="city" value={form.city} onChange={change} className={field} />
          </label>
          <label className="block text-sm font-semibold">
            State
            <input name="state" value={form.state} onChange={change} className={field} />
          </label>
        </div>
        <label className="block text-sm font-semibold">
          Description (optional)
          <textarea name="description" value={form.description} onChange={change} rows={3} maxLength={500} className={field} />
        </label>

        <div>
          <p className="text-sm font-semibold">Photos (1 to 3)</p>
          <div className="mt-2 flex flex-wrap gap-3">
            {images.map((src, i) => (
              <div key={i} className="relative h-24 w-20 overflow-hidden rounded-lg">
                <img src={src} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                <button type="button" onClick={() => setImages(images.filter((_, j) => j !== i))}
                  className="absolute right-1 top-1 rounded bg-white px-1.5 text-xs font-bold" aria-label="Remove photo">✕</button>
              </div>
            ))}
            {images.length < 3 && (
              <label className="flex h-24 w-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-violet-300 text-2xl text-violet-500">
                +
                <input type="file" accept="image/*" multiple onChange={pickImages} className="hidden" />
              </label>
            )}
          </div>
        </div>

        {value && (
          <p className="rounded-lg bg-violet-50 p-3 text-sm">
            Estimated swap value: <b className="text-violet-700">₹{value}</b>{" "}
            <span className="text-zinc-500">(an estimate, not a selling price)</span>
          </p>
        )}

        <div className="flex gap-3">
          <button disabled={busy} className="rounded-lg bg-violet-600 px-6 py-3 font-bold text-white hover:bg-violet-700 disabled:opacity-50">
            {busy ? "Saving..." : "Save changes"}
          </button>
          <Link to={`/items/${id}`} className="rounded-lg border border-zinc-400 px-6 py-3 font-bold">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
