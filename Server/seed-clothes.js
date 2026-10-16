require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");
const Item = require("./models/Item");
const Swap = require("./models/Swap");
const Message = require("./models/Message");
const { estimate } = require("./utils/value");


const SOURCES = [

  ["tops", "T-Shirts"],
  ["mens-shirts", "Shirts"],
  ["womens-shoes", "Shoes"],
  ["mens-shoes", "Shoes"],
  ["womens-bags", "Accessories"],
  ["womens-jewellery", "Accessories"],
  ["mens-watches", "Accessories"],
  ["womens-watches", "Accessories"],
  ["sunglasses", "Accessories"],
  ["womens-dresses", "Dresses"]

];

const CONDITIONS = ["New", "Like New", "Excellent", "Good", "Good", "Fair"];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const sizeFor = (cat) =>
  cat === "Shoes" ? pick(["6", "7", "8", "9", "10"])
  : cat === "Accessories" ? "One size"
  : pick(["XS", "S", "M", "L", "XL"]);

const isDummy = { "images.0": /^https:\/\/cdn\.dummyjson\.com/ };
const isEmoji = { "images.0": /^data:image\/svg\+xml/ };

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const owners = await User.find({ email: /@seed\.swap$/, role: "user" });
    if (owners.length === 0) throw new Error("No seed users found. Run node seed.js first.");

    if (process.argv.includes("--replace")) {
      await Message.deleteMany({});
      await Swap.deleteMany({});
      const r = await Item.deleteMany(isEmoji);
      console.log(`Removed ${r.deletedCount} emoji items and all test swaps and messages.`);
    }

    await Item.deleteMany(isDummy);

    const items = [];
    for (const [slug, category] of SOURCES) {
      const res = await fetch(`https://dummyjson.com/products/category/${slug}?limit=20`);
      if (!res.ok) throw new Error(`Could not fetch ${slug} (status ${res.status})`);
      const { products } = await res.json();

      for (const p of products) {
        const imgs = (p.images && p.images.length ? p.images : [p.thumbnail]).filter(Boolean).slice(0, 3);
        if (imgs.length === 0) continue;

        const owner = owners[items.length % owners.length];
        const condition = pick(CONDITIONS);
        const brand = (p.brand || "Unbranded").trim();

        items.push({
          owner: owner._id,
          title: p.title.slice(0, 80),
          description: (p.description || "").slice(0, 480),
          category,
          brand,
          size: sizeFor(category),
          condition,
          estimatedValue: estimate(category, brand, condition),
          city: owner.city,
          state: owner.state,
          images: imgs,
        });
      }
    }

    await Item.insertMany(items);
    console.log(`Added ${items.length} items with real product photos.`);
  } catch (err) {
    console.error("Seed failed:", err.message);
  } finally {
    await mongoose.disconnect();
  }
})();