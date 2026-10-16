import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import { CATEGORIES, CONDITIONS, SECTIONS } from "../constants";

const field = "mt-1 w-full rounded-lg border border-zinc-300 p-3 font-normal outline-violet-500";

function resizeImage(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) return reject(new Error("Please choose image files only."));
    const img = new Image();
    img.onload = () => {
      const max = 800;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.75));
    };
    img.onerror = () => reject(new Error("Could not read that image."));
    img.src = URL.createObjectURL(file);
  });
}

export default function AddItem() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "", description: "", section: "Women", category: "Shirts", brand: "", size: "",
    condition: "Good", city: user.city || "", state: user.state || "",
  });
  const [images, setImages] = useState([]);
  const [value, setValue] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  useEffect(() => {
    if (!form.brand.trim()) return setValue(null);
    const t = setTimeout(() => {
      const qs = new URLSearchParams({ category: form.category, brand: form.brand, condition: form.condition });
      api(`/items/estimate?${qs}`).then((d) => setValue(d.value)).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [form.category, form.brand, form.condition]);

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
    if (images.length === 0) return setError("Add at least one photo.");
    setBusy(true);
    try {
      const d = await api("/items", { method: "POST", token, body: { ...form, images } });
      navigate(`/items/${d.item._id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-violet-100 bg-white p-8 shadow-sm">
      <h1 className="mb-6 text-3xl font-extrabold">List an item</h1>
      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm font-semibold">
          Title
          <input name="title" value={form.title} onChange={change} placeholder="e.g. Black Zip-Up Hoodie" className={field} />
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
            <input name="brand" value={form.brand} onChange={change} placeholder="e.g. Levi's" className={field} />
          </label>
          <label className="block text-sm font-semibold">
            Size
            <input name="size" value={form.size} onChange={change} placeholder="e.g. M, 30 or 6-7 yrs" className={field} />
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
                <img src={src} alt={`Upload ${i + 1}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setImages(images.filter((_, j) => j !== i))}
                  className="absolute right-1 top-1 rounded bg-white px-1.5 text-xs font-bold"
                  aria-label="Remove photo"
                >
                  ✕
                </button>
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
            <span className="text-zinc-500">(an estimate based on category, brand and condition, not a selling price)</span>
          </p>
        )}

        <button disabled={busy} className="w-full rounded-lg bg-violet-600 py-3 font-bold text-white hover:bg-violet-700 disabled:opacity-50">
          {busy ? "Saving..." : "Publish listing"}
        </button>
      </form>
    </div>
  );
}
