require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const User = require("./models/User");
const Item = require("./models/Item");
const Swap = require("./models/Swap");
const Message = require("./models/Message");
const { estimate } = require("./utils/value");
const Dispute = require("./models/Dispute");

let sharp;
try {
  sharp = require("sharp");
} catch {
  console.error('The "sharp" package is missing. Run this once, then run the seed again:\n  npm install sharp');
  process.exit(1);
}
const MY_PHOTOS = {
  "jacket1.jpg": {
    section: "Women", type: "jacket",
    title: "Terracotta Bomber Jacket",
    description: "Lightweight bomber jacket with ribbed cuffs and a zip pocket on the sleeve.",
  },
  "tshirt4.jpg": {
    section: "Men", type: "sweater",
    title: "Green and Mustard Colour-Block Sweatshirt",
    brand: "Erigo",
    description: "Soft fleece sweatshirt with a colour-block design and a small logo print.",
  },
  "t-shirt3.jpg": {
    section: "Men", type: "sweater",
    title: "Grey Sweatshirt with Pineapple Print",
    description: "Comfortable grey sweatshirt with a small pineapple print on the chest.",
  },
  "shoe.jpg": {
    section: "Men", type: "shoes",
    title: "White Nike Sneakers",
    brand: "Nike",
    description: "White running sneakers with cushioned soles, in great shape.",
  },
  "sweater1.jpg": {
    section: "Women", type: "sweater",
    title: "Red Chunky Knit Sweater",
    description: "Warm and cosy ribbed knit sweater in a bright red.",
  },
};

const SECTIONS = { men: "Men", women: "Women", kids: "Kids" };
const TYPES = {
  hoodie: { category: "Hoodies", titles: ["Zip-Up Hoodie", "Pullover Hoodie", "Fleece Hoodie", "Oversized Hoodie"], brands: ["Nike", "Puma", "H&M", "Adidas", "Zara"], desc: "Warm, soft hoodie in great shape. Perfect for cool evenings." },
  tshirt: { category: "T-Shirts", titles: ["Cotton T-Shirt", "Graphic Tee", "Polo T-Shirt", "Round Neck Tee"], brands: ["U.S. Polo", "Levi's", "H&M", "Zara", "Puma"], desc: "Soft cotton tee that goes with everything." },
  shirt: { category: "Shirts", titles: ["Casual Shirt", "Linen Shirt", "Checked Shirt", "Printed Shirt"], brands: ["Zara", "Uniqlo", "Pantaloons", "Roadster"], desc: "Comfortable shirt for work or weekends." },
  dress: { category: "Dresses", titles: ["Floral Dress", "Party Dress", "Summer Dress", "Midi Dress"], brands: ["Biba", "H&M", "Zara", "Max"], desc: "Pretty dress, worn only a few times." },
  track: { category: "Trackwear", titles: ["Track Pants", "Jogger Track Pants", "Sports Track Pants"], brands: ["Adidas", "Puma", "Nike"], desc: "Comfortable track pants, great for the gym or lounging." },
  night: { category: "Nightwear", titles: ["Night Suit Set", "Pyjama Set", "Cotton Night Suit"], brands: ["Jockey", "Max", "Zivame", "H&M"], desc: "Soft and breathable night set for a good sleep." },
  designer: { category: "Designer Wear", titles: ["Designer Outfit", "Embroidered Festive Set", "Designer Party Wear"], brands: ["Biba", "Manyavar", "Libas"], desc: "Designer piece with detailed work, worn only once or twice." },
  jeans: { category: "Jeans", titles: ["Straight Fit Jeans", "Slim Fit Jeans", "Relaxed Fit Jeans"], brands: ["Levi's", "Roadster", "Zara"], desc: "Comfortable denim in a great fit." },
  kurta: { category: "Ethnic Wear", titles: ["Cotton Kurta", "Printed Kurta", "Festive Kurta Set"], brands: ["Fabindia", "Biba", "Libas"], desc: "Lovely ethnic wear for festivals and functions." },
  jacket: { category: "Jackets", titles: ["Denim Jacket", "Bomber Jacket", "Puffer Jacket"], brands: ["Levi's", "Roadster", "Zara"], desc: "Stylish jacket in great condition." },
  sweater: { category: "Sweaters", titles: ["Knit Sweater", "Woollen Sweater", "Cardigan"], brands: ["Uniqlo", "H&M", "Zara"], desc: "Cosy sweater for cooler days." },
  shoes: { category: "Shoes", titles: ["Running Shoes", "Casual Sneakers", "Everyday Shoes"], brands: ["Nike", "Adidas", "Puma"], desc: "Comfortable pair, cleaned and ready to wear." },
  skirt: { category: "Skirts", titles: ["Pleated Skirt", "A-Line Skirt", "Midi Skirt"], brands: ["Zara", "H&M", "Max"], desc: "Easy-to-style skirt, worn only a few times." },
  saree: { category: "Ethnic Wear", titles: ["Silk Saree", "Cotton Saree", "Festive Saree"], brands: ["Fabindia", "Biba", "Libas"], desc: "Beautiful saree for festivals and functions." },
  lehenga: { category: "Designer Wear", titles: ["Designer Lehenga", "Embroidered Lehenga", "Festive Lehenga Set"], brands: ["Biba", "Manyavar", "Libas"], desc: "Embroidered lehenga set, worn only once or twice." },
  pants: { category: "Trousers", titles: ["Formal Trousers", "Casual Pants", "Cotton Chinos"], brands: ["Pantaloons", "Zara", "Roadster"], desc: "Comfortable pants in a great fit." },
  shorts: { category: "Shorts", titles: ["Cotton Shorts", "Denim Shorts", "Sports Shorts"], brands: ["Nike", "H&M", "Puma"], desc: "Light and comfortable shorts for summer." },
};


const KEYWORDS = [
  [/desin|design/, "designer"], [/lehenga/, "lehenga"], [/saree/, "saree"], [/skirt/, "skirt"],
  [/pants|trouser|chino/, "pants"], [/shorts/, "shorts"], [/jeans|denim/, "jeans"], [/hoodie/, "hoodie"],
  [/jacket|coat|blazer/, "jacket"], [/sweater|sweatshirt|cardigan/, "sweater"], [/tshirt|tee/, "tshirt"],
  [/shirt/, "shirt"], [/dress|frock|gown/, "dress"], [/track|jogger/, "track"], [/night|pyjama|pajama/, "night"],
  [/kurta|kurti/, "kurta"], [/shoe|sneaker|heel/, "shoes"],
];
const WOMEN_BY_DEFAULT = ["skirt", "saree", "lehenga", "dress", "designer"];

const CONDITIONS = ["New", "Like New", "Excellent", "Good", "Good", "Fair"];
const hash = (str) => {
  let h = 0;
  for (const ch of str) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
};
const sizeFor = (section, type, h) => {
  if (type === "saree") return "Free size";
  if (section === "Kids") return ["4-5 yrs", "6-7 yrs", "8-9 yrs", "10-11 yrs"][h % 4];
  if (type === "shoes") return (section === "Men" ? ["7", "8", "9", "10"] : ["4", "5", "6", "7"])[h % 4];
  if (type === "jeans") return (section === "Men" ? ["30", "32", "34"] : ["26", "28", "30"])[h % 3];
  return (section === "Men" ? ["S", "M", "L", "XL"] : ["XS", "S", "M", "L"])[h % 4];
};
const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1);
function describePhoto(fileName) {
  const own = MY_PHOTOS[fileName];
  const h = hash(fileName.toLowerCase());
  const words = fileName.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z]+/g, " ").trim().split(" ");
  const joined = words.join("");

  let section, type, title;
  if (own) {
    section = own.section;
    type = own.type;
  } else {
    const hit = KEYWORDS.find(([re]) => re.test(joined));
    if (!hit) return null;
    type = hit[1];
    if (type === "designer" && /skirt/.test(joined)) title = "Designer Skirt";
    const prefix = SECTIONS[words[0]];
    section = prefix || (WOMEN_BY_DEFAULT.includes(type) ? "Women" : type === "pants" || type === "shorts" ? "Men" : h % 2 ? "Men" : "Women");
  }
  const t = TYPES[type];
  if (!t) return null;

  const brandWord = words.find((w, i) => i > 0 && w.length > 2 && !KEYWORDS.some(([re]) => re.test(w)));
  const named = !own && brandWord ? capital(brandWord) : null;
  return {
    section,
    category: t.category,
    title: (own && own.title) || title || `${section === "Kids" ? "Kids" : section + "'s"} ${t.titles[h % t.titles.length]}`,
    brand: (own && own.brand) || named || t.brands[h % t.brands.length],
    size: (own && own.size) || sizeFor(section, type, h),
    condition: (own && own.condition) || CONDITIONS[h % CONDITIONS.length],
    description: (own && own.description) || t.desc,
  };
}
const CATALOG = [
  ["womens-dresses", "Women", "Dresses", ["S", "M", "L"]],
  ["tops", "Women", "T-Shirts", ["XS", "S", "M", "L"]],
  ["mens-shirts", "Men", "Shirts", ["M", "L", "XL"]],
  ["womens-shoes", "Women", "Shoes", ["4", "5", "6", "7", "8"]],
  ["mens-shoes", "Men", "Shoes", ["7", "8", "9", "10"]],
  ["womens-bags", "Women", "Accessories", ["One size"]],
  ["womens-jewellery", "Women", "Accessories", ["One size"]],
  ["sunglasses", "Men", "Accessories", ["One size"]],
  ["womens-watches", "Women", "Accessories", ["One size"]],
  ["mens-watches", "Men", "Accessories", ["One size"]],
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const value = (category, brand, condition, section) => {
  const v = estimate(category, brand, condition);
  return section === "Kids" ? Math.max(100, Math.round((v * 0.7) / 10) * 10) : v;
};

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const owners = await User.find({ email: /@seed\.swap$/, role: "user" });
    if (owners.length === 0) throw new Error("No seed users found. Run node seed.js first.");
    const ownerIds = owners.map((o) => o._id);
    const old = await Item.find({ owner: { $in: ownerIds } }).select("_id");
    const oldIds = old.map((i) => i._id);
    const oldSwaps = await Swap.find({
      $or: [{ requestedItem: { $in: oldIds } }, { offeredItem: { $in: oldIds } }],
    }).select("_id");
    const swapIds = oldSwaps.map((s) => s._id);
    await Dispute.deleteMany({ swap: { $in: swapIds } });
    await Message.deleteMany({ swap: { $in: swapIds } });
    await Message.deleteMany({ swap: { $in: swapIds } });
    await Swap.deleteMany({ _id: { $in: swapIds } });
    await Item.deleteMany({ _id: { $in: oldIds } });
    console.log(`Cleared ${oldIds.length} old demo items and ${swapIds.length} related test swaps.`);

    const items = [];
    const nextOwner = () => owners[items.length % owners.length];
    const dir = path.join(__dirname, "seed-photos");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    const files = fs.readdirSync(dir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort();
    if (files.length === 0) console.warn("No photos found in server/seed-photos.");
    let mine = 0;
    for (const file of files) {
      const info = describePhoto(file);
      if (!info) {
        console.warn(`Skipped "${file}": could not tell what this is. Rename it like jeans1.jpg, saree.jpg or men-hoodie.jpg`);
        continue;
      }
      const buf = await sharp(path.join(dir, file))
        .resize({ width: 700, height: 875, fit: "cover", position: sharp.strategy.attention })
        .jpeg({ quality: 72 })
        .toBuffer();
      const owner = nextOwner();
      items.push({
        owner: owner._id,
        ...info,
        estimatedValue: value(info.category, info.brand, info.condition, info.section),
        city: owner.city,
        state: owner.state,
        images: ["data:image/jpeg;base64," + buf.toString("base64")],
      });
      mine++;
    }
    let catalogCount = 0;
    for (const [slug, section, category, sizes] of CATALOG) {
      try {
        const res = await fetch(`https://dummyjson.com/products/category/${slug}?limit=20`);
        if (!res.ok) throw new Error(`status ${res.status}`);
        const { products } = await res.json();
        for (const p of products) {
          const imgs = (p.images && p.images.length ? p.images : [p.thumbnail]).filter(Boolean).slice(0, 3);
          if (imgs.length === 0) continue;
          const owner = nextOwner();
          const condition = pick(CONDITIONS);
          const brand = (p.brand || "Unbranded").trim();
          items.push({
            owner: owner._id,
            title: p.title.slice(0, 80),
            description: (p.description || "").slice(0, 480),
            section, category, brand,
            size: pick(sizes),
            condition,
            estimatedValue: value(category, brand, condition, section),
            city: owner.city, state: owner.state,
            images: imgs,
          });
          catalogCount++;
        }
      } catch (err) {
        console.warn(`Skipped catalog items for ${slug}: ${err.message} (check your internet)`);
      }
    }

    await Item.insertMany(items);
    console.log(`Added ${items.length} items: ${mine} from your photos, ${catalogCount} from the catalog. No illustrations.`);
  } catch (err) {
    console.error("Seed failed:", err.message);
  } finally {
    await mongoose.disconnect();
  }
})();