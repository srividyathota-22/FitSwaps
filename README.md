# FitSwaps: Clothing Exchange & Swap Marketplace

FitSwaps is a peer-to-peer marketplace where people swap clothes they no longer wear instead of buying new ones. Members list clothing, send swap requests, negotiate in chat and track the exchange. An admin panel manages users, listings, disputes and platform analytics.

**Live app:** https://fitswaps.vercel.app

> The backend runs on a free hosting plan and sleeps when idle. The first request after a break can take up to a minute, so open the link once and give it a moment.

## Features

- **Accounts:** register, log in, edit profile (phone number stays private), suspended users are blocked.
- **Listings:** Men, Women and Kids sections, 18 categories, 1 to 3 photos, condition, size, brand, estimated swap value, edit and delete, readable item IDs (FS-XXXXXX).
- **Browse:** search, category, condition, city and sort filters, Near me, nearby swappers, fair swap suggestions, 24 items per page.
- **Swap requests:** offer one of your items, compare values, accept, reject, cancel or complete.
- **Swap tracking:** progress bar, timeline of every step, courier and tracking number entry, readable swap IDs (SW-XXXXXX).
- **Chat:** private conversation for each swap, visible only to its two members.
- **Disputes:** report a problem on an accepted or completed swap, admin resolves it with a note that appears in the swap timeline.
- **Community:** impact numbers, swap stories with likes, top swappers, sustainable fashion tips.
- **Admin panel:** overview with 14-day charts and a CSV report, user and listing search, suspend, hide, delete, swap and chat monitoring, disputes.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite), React Router, Tailwind CSS |
| Backend | Node.js, Express |
| Database | MongoDB Atlas, Mongoose |
| Authentication | JSON Web Tokens, bcrypt |
| Hosting | Vercel (frontend), Render (backend) |

## Project structure

```
FitSwaps/
├── Server/    Express API: models, routes, middleware, utils and seed scripts
└── client/    React app: pages, components, auth context
```
## Run it locally

You need Node.js and a free MongoDB Atlas database.

**1. Backend**

```bash
cd server
npm install
```

Create `server/.env` with:

```
MONGO_URI=your MongoDB Atlas connection string
JWT_SECRET=any long random text
CLIENT_URL=http://localhost:5173
```

Then start it:

```bash
node index.js
```

**2. Frontend**

```bash
cd client
npm install
```

Create `client/.env` with:

```
VITE_API_URL=http://localhost:5000
```

Then start it:

```bash
npm run dev
```

Open http://localhost:5173.

**3. Demo data (optional)**

```bash
cd server
node seed.js
node seed-people.js
node seed-wardrobe.js
node seed-stories.js
```
## API overview

All routes are under `/api`.

- **auth:** register, login, me, profile
- **items:** list with filters and pagination, mine, estimate, detail, photo, create, update, delete
- **swaps:** create, mine, change status, add shipping details
- **chat:** read and send messages for a swap
- **disputes:** report a problem on a swap
- **community:** stats, leaders, nearby swappers, stories, likes
- **admin:** stats, analytics, users, listings, swaps, disputes (admin only)

## Known limitations

- Courier tracking numbers are typed in by hand; there is no live courier API.
- Location matching compares cities and does not show distance in kilometres.
- Chat refreshes every few seconds instead of using real-time sockets.
- Photos are stored in the database, which suits a demo but not a large platform.

## Author

Built by Sri Vidya Thota as part of the Unified Mentor Fullstack Web Development internship.
