require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const Item = require("./models/Item");
const { estimate } = require("./utils/value");

const PALETTE = [
  ["#7B3FF2", "#4F7CF0"], ["#a99bff", "#c2d3fb"], ["#4F7CF0", "#4fd0f0"],
  ["#9b6bff", "#e04fd0"], ["#6D4AE0", "#a99bff"], ["#3a1fa6", "#6D4AE0"],
];

const svg = (emoji, i) => {
  const [c1, c2] = PALETTE[i % PALETTE.length];
  const s = `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='500'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${c1}'/><stop offset='1' stop-color='${c2}'/></linearGradient></defs><rect width='400' height='500' fill='url(#g)'/><text x='200' y='290' font-size='170' text-anchor='middle'>${emoji}</text></svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(s);
};

const USERS = [
  ["Ananya Reddy", "ananya@seed.swap", "Vijayawada", "Andhra Pradesh"],
  ["Ravi Teja", "ravi@seed.swap", "Guntur", "Andhra Pradesh"],
  ["Meena Kumari", "meena@seed.swap", "Hyderabad", "Telangana"],
  ["Karthik Rao", "karthik@seed.swap", "Bengaluru", "Karnataka"],
  ["Sneha Varma", "sneha@seed.swap", "Visakhapatnam", "Andhra Pradesh"],
  ["Arjun Nair", "arjun@seed.swap", "Chennai", "Tamil Nadu"],
  ["Divya ", "divya@seed.swap", "Vijayawada", "Andhra Pradesh"],
  ["Sai Krishna", "saikrishna@seed.swap", "Vijayawada", "Andhra Pradesh"],
  ["kanaka durga", "kanakadurga@seed.swap", "Vijayawada", "Andhra Pradesh"],
  ["Harika Reddy", "harika@seed.swap", "Hyderabad", "Telangana"],
  ["Rohit Sharma", "rohit@seed.swap", "Hyderabad", "Telangana"],
  ["krishna", "krishna@seed.swap", "Visakhapatnam", "Andhra Pradesh"],
  ["Neha Gowda", "neha@seed.swap", "Bengaluru", "Karnataka"],
  ["Karthika Raman", "karthika@seed.swap", "Chennai", "Tamil Nadu"],
];

const ITEMS = [
  [0, "Vintage Denim Jacket", "Jackets", "Levi's", "M", "Excellent", "Classic washed blue trucker jacket. Worn a handful of times, no fading or tears.", "🧥"],
  [2, "Floral Midi Dress", "Dresses", "H&M", "S", "Like New", "Light floral print, perfect for summer. Worn once for a wedding function.", "👗"],
  [3, "Oversized Cotton Shirt", "Shirts", "Uniqlo", "L", "Good", "Soft white cotton shirt with a relaxed fit. Great for layering.", "👔"],
  [1, "Straight Fit Blue Jeans", "Jeans", "Levi's", "30", "Good", "Mid-rise straight fit. Comfortable stretch, minor wear at the hem.", "👖"],
  [0, "Printed Cotton Kurta", "Ethnic Wear", "Fabindia", "M", "Like New", "Block print kurta in indigo. Breathable cotton, easy to style.", "👘"],
  [2, "Grey Zip Hoodie", "Hoodies", "H&M", "L", "Fair", "Cosy fleece-lined hoodie. Some pilling on the cuffs.", "🧶"],
  [5, "White Running Sneakers", "Shoes", "Nike", "8", "Good", "Lightweight everyday runners. Cleaned and ready to wear.", "👟"],
  [0, "Black Track Jacket", "Jackets", "Adidas", "L", "Good", "Zip-up track jacket with white side stripes. No flaws.", "🧥"],
  [4, "Striped Linen Shirt", "Shirts", "Zara", "M", "Excellent", "Blue and white striped linen. Cool and crisp for hot days.", "👔"],
  [0, "Black Skinny Jeans", "Jeans", "Zara", "28", "Good", "High-rise skinny jeans with a bit of stretch.", "👖"],
  [3, "Graphic Print T-Shirt", "T-Shirts", "Puma", "M", "Good", "Black cotton tee with a bold front print.", "👕"],
  [4, "Pleated Midi Skirt", "Skirts", "Max", "S", "Like New", "Flowy pleated skirt in dusty pink. Worn twice.", "👗"],
  [1, "Cotton Chinos", "Trousers", "Pantaloons", "32", "Good", "Beige slim-fit chinos, ideal for office or casual wear.", "👖"],
  [3, "Woollen Cardigan", "Sweaters", "Uniqlo", "M", "Excellent", "Soft merino blend cardigan in charcoal. Hardly worn.", "🧶"],
  [2, "Silk Blend Saree", "Ethnic Wear", "Fabindia", "Free size", "Excellent", "Maroon saree with a gold border. Includes matching blouse piece.", "🥻"],
  [5, "Training Shorts", "Shorts", "Nike", "M", "Good", "Quick-dry shorts with zip pockets, great for the gym.", "🩳"],
  [4, "Leather Sling Bag", "Accessories", "Zara", "One size", "Good", "Tan faux-leather sling bag with adjustable strap.", "👜"],
  [1, "Denim Shorts", "Shorts", "H&M", "28", "Fair", "Light wash denim shorts, comfortable fit.", "🩳"],
  [5, "Classic Polo T-Shirt", "T-Shirts", "U.S. Polo", "L", "Excellent", "Navy pique polo with embroidered logo.", "👕"],
  [2, "Embroidered Anarkali", "Ethnic Wear", "Biba", "M", "Like New", "Teal anarkali set with delicate thread work. Worn at one event.", "👗"],
  [3, "Yoga Leggings", "Activewear", "Adidas", "S", "Good", "High-waist leggings, stretchy and non-see-through.", "🏃"],
  [5, "Puffer Jacket", "Jackets", "Roadster", "L", "Good", "Warm black puffer, perfect for winter travel.", "🧥"],
  [4, "Everyday Sports Shoes", "Shoes", "Puma", "9", "Fair", "Comfortable trainers with some sole wear.", "👟"],
  [1, "Casual Sneakers", "Shoes", "Adidas", "7", "Like New", "White low-top sneakers, worn only a few times.", "👟"],
];

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const old = await User.find({ email: /@seed\.swap$/ });
    await Item.deleteMany({ owner: { $in: old.map((u) => u._id) } });
    await User.deleteMany({ email: /@seed\.swap$/ });

    const hash = await bcrypt.hash("Swap@123", 10);
    const users = await User.insertMany(
      USERS.map(([name, email, city, state]) => ({ name, email, password: hash, city, state }))
    );
    await User.create({
      name: "Admin", email: "admin@seed.swap", password: hash,
      city: "Vijayawada", state: "Andhra Pradesh", role: "admin",
    });

    const items = ITEMS.map(([o, title, category, brand, size, condition, description, emoji], i) => ({
      owner: users[o]._id, title, category, brand, size, condition, description,
      estimatedValue: estimate(category, brand, condition),
      city: users[o].city, state: users[o].state,
      images: [svg(emoji, i)],
    }));
    await Item.insertMany(items);

    console.log(`Seeded ${users.length} users and ${items.length} items.`);
  } catch (err) {
    console.error("Seed failed:", err.message);
  } finally {
    await mongoose.disconnect();
  }
})();