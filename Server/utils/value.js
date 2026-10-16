const CATEGORIES = [
  "T-Shirts", "Shirts", "Jeans", "Trousers", "Dresses", "Jackets", "Hoodies",
  "Sweaters", "Skirts", "Shorts", "Ethnic Wear", "Activewear", "Trackwear",
  "Nightwear", "Designer Wear", "Shoes", "Accessories", "Other",
];
const SECTIONS = ["Men", "Women", "Kids"];
const CONDITIONS = ["New", "Like New", "Excellent", "Good", "Fair"];

const BASE = {
  "T-Shirts": 500, Shirts: 700, Jeans: 1100, Trousers: 900, Dresses: 1300,
  Jackets: 1800, Hoodies: 1200, Sweaters: 1000, Skirts: 800, Shorts: 600,
  "Ethnic Wear": 1400, Activewear: 900, Trackwear: 800, Nightwear: 500,
  "Designer Wear": 3200, Shoes: 1800, Accessories: 600, Other: 500,
};
const PREMIUM = ["levi's", "levis", "nike", "adidas", "puma", "zara", "uniqlo", "tommy hilfiger", "u.s. polo", "fabindia"];
const BUDGET = ["h&m", "max", "pantaloons", "roadster", "no brand", "unbranded"];
const COND = { New: 1, "Like New": 0.9, Excellent: 0.8, Good: 0.65, Fair: 0.4 };

function estimate(category, brand, condition) {
  const base = BASE[category] || 500;
  const b = (brand || "").trim().toLowerCase();
  const brandMult = PREMIUM.includes(b) ? 1.4 : BUDGET.includes(b) ? 0.8 : 1;
  const condMult = COND[condition] || 0.5;
  return Math.max(100, Math.round((base * brandMult * condMult) / 10) * 10);
}

module.exports = { CATEGORIES, SECTIONS, CONDITIONS, estimate };
