const express = require("express");
const Item = require("../models/Item");
const Swap = require("../models/Swap");
const auth = require("../middleware/auth");
const { CATEGORIES, SECTIONS, CONDITIONS, estimate } = require("../utils/value");

const router = express.Router();
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function withImageUrls(req, doc) {
  const o = doc.toObject();
  const base = `${req.protocol}://${req.get("host")}`;
  const v = new Date(o.updatedAt).getTime();
  o.images = (o.images || []).map((img, i) =>
    typeof img === "string" && img.startsWith("data:") ? `${base}/api/items/${o._id}/image/${i}?v=${v}` : img
  );
  return o;
}


const OWN_IMAGE = /\/api\/items\/([a-f0-9]{24})\/image\/(\d+)/;
function resolveImages(images, item) {
  if (!Array.isArray(images)) return images;
  return images.map((img) => {
    const m = typeof img === "string" && img.match(OWN_IMAGE);
    if (m && m[1] === String(item._id)) return item.images[Number(m[2])] || img;
    return img;
  });
}

function validate(b) {
  if (!b.title || b.title.trim().length < 3 || b.title.trim().length > 80)
    return "Title must be 3 to 80 characters.";
  if (!SECTIONS.includes(b.section)) return "Choose Men, Women or Kids.";
  if (!CATEGORIES.includes(b.category)) return "Choose a valid category.";
  if (!CONDITIONS.includes(b.condition)) return "Choose a valid condition.";
  if (!b.brand || !b.brand.trim()) return "Brand is required.";
  if (!b.size || !b.size.trim()) return "Size is required.";
  if (b.description && b.description.length > 500)
    return "Description can be at most 500 characters.";
  if (!Array.isArray(b.images) || b.images.length < 1 || b.images.length > 3)
    return "Add 1 to 3 photos.";
  for (const img of b.images) {
    const ok =
      typeof img === "string" &&
      (img.startsWith("data:image/") || img.startsWith("https://cdn.dummyjson.com/")) &&
      img.length <= 700000;
    if (!ok) return "Each photo must be a valid image under 500 KB.";
  }
  return null;
}

router.get("/", async (req, res) => {
  try {
    const { q, section, category, condition, city, sort } = req.query;
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 24, 1), 48);
    const page = Math.max(parseInt(req.query.page) || 1, 1);

    const filter = { status: "AVAILABLE" };
    if (section) filter.section = section;
    if (category) filter.category = category;
    if (condition) filter.condition = condition;
    if (city) filter.city = new RegExp(esc(city.trim()), "i");
    if (/^[a-f0-9]{24}$/i.test(req.query.owner || "")) filter.owner = req.query.owner;
    if (q) {
      const r = new RegExp(esc(q.trim()), "i");
      filter.$or = [{ title: r }, { brand: r }, { category: r }];
    }
    const order =
      sort === "low" ? { estimatedValue: 1 } : sort === "high" ? { estimatedValue: -1 } : { createdAt: -1 };

    const docs = await Item.find(filter)
      .select({ images: { $slice: 1 } })
      .populate("owner", "name city")
      .sort({ ...order, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit + 1);

    res.json({
      items: docs.slice(0, limit).map((d) => withImageUrls(req, d)),
      hasMore: docs.length > limit,
    });
  } catch {
    res.status(500).json({ message: "Could not load items." });
  }
});

router.get("/mine", auth, async (req, res) => {
  try {
    const docs = await Item.find({ owner: req.user._id })
      .select({ images: { $slice: 1 } })
      .sort({ createdAt: -1 });
    res.json({ items: docs.map((d) => withImageUrls(req, d)) });
  } catch {
    res.status(500).json({ message: "Could not load your listings." });
  }
});

router.get("/estimate", (req, res) => {
  const { category, brand, condition } = req.query;
  res.json({ value: estimate(category, brand, condition) });
});

router.get("/:id/image/:n", async (req, res) => {
  try {
    const item = await Item.findById(req.params.id).select("images");
    const img = item && item.images[Number(req.params.n)];
    if (!img) return res.status(404).end();
    if (img.startsWith("http")) return res.redirect(302, img);

    res.set("Cache-Control", "public, max-age=31536000, immutable");
    const svgPrefix = "data:image/svg+xml;utf8,";
    if (img.startsWith(svgPrefix)) {
      return res.type("image/svg+xml").send(decodeURIComponent(img.slice(svgPrefix.length)));
    }
    const m = img.match(/^data:(image\/[a-z+.-]+);base64,(.+)$/i);
    if (!m) return res.status(404).end();
    res.type(m[1]).send(Buffer.from(m[2], "base64"));
  } catch {
    res.status(404).end();
  }
});

router.get("/:id", async (req, res) => {
  try {
    const item = await Item.findById(req.params.id).populate("owner", "name city state");
    if (!item) return res.status(404).json({ message: "Item not found." });
    res.json({ item: withImageUrls(req, item) });
  } catch {
    res.status(404).json({ message: "Item not found." });
  }
});

router.post("/", auth, async (req, res) => {
  try {
    const b = req.body;
    const error = validate(b);
    if (error) return res.status(400).json({ message: error });

    const item = await Item.create({
      owner: req.user._id,
      title: b.title.trim(),
      description: (b.description || "").trim(),
      section: b.section,
      category: b.category,
      brand: b.brand.trim(),
      size: b.size.trim(),
      condition: b.condition,
      estimatedValue: estimate(b.category, b.brand, b.condition),
      city: (b.city || req.user.city || "").trim() || "Unknown",
      state: (b.state || req.user.state || "").trim(),
      images: b.images,
    });
    res.status(201).json({ item });
  } catch {
    res.status(500).json({ message: "Could not save the listing." });
  }
});

router.put("/:id", auth, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found." });
    if (String(item.owner) !== String(req.user._id))
      return res.status(403).json({ message: "You can only edit your own listings." });
    if (item.status !== "AVAILABLE")
      return res.status(409).json({ message: "Only available items can be edited." });

    const b = req.body;
    b.images = resolveImages(b.images, item);
    const error = validate(b);
    if (error) return res.status(400).json({ message: error });

    item.title = b.title.trim();
    item.description = (b.description || "").trim();
    item.section = b.section;
    item.category = b.category;
    item.brand = b.brand.trim();
    item.size = b.size.trim();
    item.condition = b.condition;
    item.estimatedValue = estimate(b.category, b.brand, b.condition);
    item.city = (b.city || item.city).trim();
    item.state = (b.state || "").trim();
    item.images = b.images;
    await item.save();
    res.json({ item });
  } catch {
    res.status(500).json({ message: "Could not update the listing." });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found." });
    const isOwner = String(item.owner) === String(req.user._id);
    if (!isOwner && req.user.role !== "admin")
      return res.status(403).json({ message: "You can only delete your own listings." });

    const used = await Swap.exists({ $or: [{ requestedItem: item._id }, { offeredItem: item._id }] });
    if (used)
      return res.status(409).json({ message: "This item is part of a swap, so it cannot be deleted." });

    await item.deleteOne();
    res.json({ ok: true });
  } catch {
    res.status(500).json({ message: "Could not delete the listing." });
  }
});

module.exports = router;