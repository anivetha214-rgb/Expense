# 🌾 FarmPrice AI — AI-Powered Farmer Market Price Assistant

**Live mandi price intelligence for Tamil Nadu farmers.** Compare real-time crop prices across nearby wholesale markets, discover which market gives the **highest net profit after transport and spoilage**, forecast prices with machine learning, and get instant price alerts — in a fully bilingual **English / தமிழ் (Tamil)** interface with a built-in **voice assistant**.

Built with **Next.js 16 · React 19 · Flask · scikit-learn · Prisma · Socket.IO** (SQLite for development, MySQL-ready for production).

---

## ✨ Features

| Feature | Description |
| --- | --- |
| 📈 **Live price ticker** | Intraday price simulator (sine-wave drift + 10-second jitter, ±6%) keeps every connected client in sync; socket.io broadcasts `price-tick` + `alerts` events every 8 seconds |
| 🏆 **Best-market ranking** | For every crop, markets are ranked by **net profit**, not raw price — transport cost, spoilage in transit, market fees and handling charges are all deducted |
| 🚚 **Transport & profit engine** | Haversine distance × 1.28 road-network factor, 5 vehicle rate tiers, crop-specific spoilage per 10 km, 1.5% market fee, loading / weighing / toll charges |
| 🤖 **AI price forecast** | Flask micro-service trains a `HistGradientBoostingRegressor` **per crop** (12 models) with **97.8 – 99.2% accuracy**; recursive multi-day forecast with confidence band and a plain-language *Sell now / Wait* recommendation |
| 🔔 **Price alerts** | Set ABOVE / BELOW targets per crop + market; evaluated on every live tick, fires once (idempotent) and writes bilingual notifications to the bell inbox |
| 🎙️ **Voice assistant** | Web Speech API — ask *“What is the tomato price in Salem?”* or *“தம்பாரம் விலை என்ன?”*; bilingual keyword intents with spoken (TTS) answers |
| 🌐 **Full i18n** | Every screen, label, toast and notification in **English ↔ தமிழ்** with Noto Sans Tamil typography |
| 📱 **Mobile-first** | Responsive layout with a bottom navigation bar for phone use in the field |
| 🗓️ **2 years of history** | Deterministic seed generates **87,600 daily price records** (12 crops × 10 markets × 730 days) with seasonal cycles |

---

## 🧱 Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Recharts, Framer Motion |
| State / realtime | Zustand-style hooks, `useSyncExternalStore`, Socket.IO client |
| Backend | Next.js API routes (Node runtime) |
| ML micro-service | Python Flask + scikit-learn (`HistGradientBoostingRegressor`), joblib model cache |
| Realtime broadcaster | Socket.IO (Bun) mini-service |
| Database | Prisma ORM — SQLite (dev) / **MySQL 8 (production, migration kit included)** |
| Speech | Web Speech API (`SpeechRecognition` + `speechSynthesis`) |

---

## 🏗️ Architecture

```mermaid
flowchart LR
    subgraph browser["Browser (farmer)"]
        UI["Next.js 16 UI — EN / தமிழ்"]
        VOICE["Web Speech API voice assistant"]
    end

    subgraph nextjs["Next.js server :3000"]
        ROUTES["API routes<br/>/api/prices · /api/predict<br/>/api/transport · /api/alerts"]
        ORCH["ensure-services<br/>self-healing orchestrator"]
    end

    subgraph micro["Micro-services"]
        ML["Flask + scikit-learn :5001<br/>HistGradientBoosting × 12 crops"]
        WS["Socket.IO :3030<br/>price-tick broadcast every 8 s"]
    end

    DB[("Prisma ORM<br/>SQLite dev / MySQL prod")]

    UI --> ROUTES
    VOICE --> UI
    UI <-->|"live prices + alerts"| WS
    ROUTES --> DB
    ORCH --> ML
    ORCH --> WS
    ML --> DB
```

On first boot the orchestrator (`src/lib/ensure-services.ts`):

1. **Seeds the database** if empty (idempotent, deterministic PRNG → identical 87,600-row history),
2. **Spawns the Flask ML service** (port 5001) with the correct `PORT` env — models train in a background thread while `/health` responds immediately,
3. **Spawns the Socket.IO broadcaster** (port 3030),
4. **Self-heals**: both services are respawned with a 20-second cooldown if they ever go down.

---

## 📂 Project Structure

```
├── prisma/
│   ├── schema.prisma          # SQLite schema (types are MySQL-compatible)
│   └── schema.mysql.prisma    # MySQL 8 schema (production)
├── database/
│   ├── mysql-schema.sql       # Raw MySQL 8 DDL (utf8mb4, FKs, indexes)
│   └── MYSQL_SETUP.md         # Step-by-step migration guide
├── mini-services/
│   ├── ml-service/            # Flask + scikit-learn forecast API (:5001)
│   │   ├── app.py             #   /health /predict /best-market /metrics
│   │   ├── requirements.txt
│   │   └── models/            # 12 trained joblib models
│   └── price-socket/          # Socket.IO live-price broadcaster (:3030)
├── src/
│   ├── app/api/               # Next.js API routes
│   ├── components/farmer/     # Feature UI: dashboard, prices, predict, sell, alerts, voice
│   ├── components/ui/         # shadcn/ui primitives
│   └── lib/                   # db, seed, simulator, transport/profit engine, i18n
└── db/                        # SQLite file (auto-created & seeded on first run)
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js 20+** (or Bun) — for the Next.js app and the socket service
- **Python 3.10+** — for the Flask ML micro-service
- (optional) **MySQL 8** — only if you deploy with MySQL instead of SQLite

### 1. Install & configure

```bash
git clone https://github.com/anivetha214-rgb/Expense.git farmprice-ai
cd farmprice-ai
npm install                      # or: bun install

cp .env.example .env             # SQLite by default — zero setup
```

> If your `python3` is not at `/home/z/.venv/bin/python3`, set `PYTHON_BIN` in `.env`.

### 2. Create the database

```bash
npx prisma db push               # creates tables from prisma/schema.prisma
```

### 3. Run

```bash
npm run dev                      # http://localhost:3000
```

The first request will:

- seed 12 crops × 10 Tamil Nadu markets × 730 days of prices (≈ 87,600 rows, deterministic),
- install Python deps if needed (`pip install -r mini-services/ml-service/requirements.txt`),
- start the Flask ML service on **:5001** and the Socket.IO broadcaster on **:3030**.

You'll see the ML badge on the dashboard switch from *training* → *ready* within a minute.

### npm scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Next.js dev server on port 3000 (auto-starts mini-services) |
| `npm run build` / `npm start` | Production build & standalone server |
| `npm run lint` | ESLint (0 errors) |
| `npm run db:push` | Sync Prisma schema to the database |
| `npm run db:generate` | Regenerate the Prisma client |

---

## 🐬 MySQL Migration (production)

SQLite is used in development for zero setup, but every model, type and index is MySQL-ready. Two paths:

**A. Let Prisma create the schema**

```bash
# 1. point .env at MySQL
echo 'MYSQL_URL="mysql://USER:PASSWORD@localhost:3306/farmprice"' >> .env

# 2. generate + push the MySQL schema
npx prisma generate --schema prisma/schema.mysql.prisma
npx prisma db push   --schema prisma/schema.mysql.prisma
```

**B. Import raw SQL DDL**

```bash
mysql -u root -p < database/mysql-schema.sql
```

On first boot against an **empty** MySQL database the app re-seeds itself with the *same deterministic dataset* (the price history is generated by a seeded PRNG), so no historical data needs to be copied. Full step-by-step guide: **[database/MYSQL_SETUP.md](database/MYSQL_SETUP.md)**.

---

## 🤖 ML Micro-Service API (Flask, port 5001)

| Endpoint | Description |
| --- | --- |
| `GET /health` | Readiness, model name, row count, per-crop accuracy map |
| `GET /predict?cropId=…&marketId=…&horizon=7` | Recursive multi-day forecast: trend array, confidence band, sell/wait advice |
| `GET /best-market?cropId=…&horizon=…` | Markets ranked by predicted modal price |
| `GET /metrics` | Training metrics for all 12 models |

**Model** — one `HistGradientBoostingRegressor` per crop.

**Features** — market one-hot encoding, seasonality (`sin`/`cos` of day-of-year), lag-1 / lag-7 / lag-30 price statistics.

**Accuracy** — 97.8% – 99.2% R² across the 12 crops (tomato ≈ 98.2%).

---

## 💰 Net-Profit Engine

For each crop × market × vehicle combination the app computes:

```
road distance   = haversine(farm, market) × 1.28      # road-network factor
transport cost  = distance × vehicle rate tier        # 5 tiers: bicycle → lorry
spoilage loss   = quantity × price × spoilage% × (distance / 10 km)
market charges  = 1.5% market fee + loading + weighing + tolls
net profit      = (modal price − deductions) × quantity − transport − charges
```

Markets are then ranked by **net profit per trip**, so a slightly cheaper market 80 km away can correctly lose to a nearby one — exactly the decision a farmer actually faces.

---

## 📡 Next.js API Routes

| Route | Purpose |
| --- | --- |
| `GET /api/prices/live` | Current simulated prices + evaluates active alerts |
| `GET /api/prices/history?cropId&marketId&days` | Historical OHLC-style series |
| `GET /api/predict` | Proxy to Flask forecast (with ML status) |
| `POST /api/transport` | Transport cost + net-profit ranking for a shipment |
| `GET/POST/DELETE /api/alerts` (`/api/alerts/[id]`) | Price alert CRUD |
| `GET /api/notifications` | Bell inbox (bilingual) |
| `GET /api/meta` | Crops, markets, districts, vehicle tiers |
| `GET /api/ml-status` | Flask health/accuracy snapshot |
| `GET/POST /api/profile` | Device profile (name, district, language) |
| `POST /api/bootstrap` | Force seed + service boot check |

---

## 🔔 Alerts & Notifications

1. Farmer creates an alert: crop + market + direction (**ABOVE** / **BELOW**) + target price.
2. Every `/api/prices/live` tick evaluates all active alerts.
3. A crossed threshold flips the alert to *Triggered* and creates **one** bilingual notification (idempotent — no duplicates).
4. The bell icon shows the unread count; tapping opens the inbox.

---

## 🎙️ Voice Assistant

- **Input**: Web Speech API `SpeechRecognition` (mic button on every tab header).
- **Intents** (bilingual keyword matching): *price lookup*, *best market*, *forecast*, *help*.
- **Output**: spoken answer via `speechSynthesis` in the selected language + a chat-style transcript panel.
- Example (Tamil): *“தக்காளி விலை சேலம்”* → spoken reply with the live modal price.

---

## ✅ Verified End-to-End

The following flows were exercised in a real browser session (desktop 1280 px + mobile 390×844):

- Dashboard ticker, best-trade card, top gainers/losers
- Price table with *Best market* badges + 30-day sparklines
- AI forecast: 98.2% accuracy badge, confidence band, *Sell now* advice
- Sell flow: 20 quintals tomato ex-Salem → market ranking with itemised cost sheet
- Alerts: create ABOVE ₹2,500 → toast; BELOW ₹3,000 → instant trigger + unread bell badge
- Full Tamil UI rendering; voice Q&A in English and Tamil

---

## 🗺️ Roadmap

- [ ] Real data ingestion (AGMARKNET / eNAM feeds)
- [ ] Push notifications (Web Push / SMS via gateway)
- [ ] Farmer-to-farmer price posting
- [ ] Multilingual expansion (Hindi, Kannada, Telugu)
- [ ] Docker compose for one-command MySQL deployment

---

## 👤 Author

**Nivetha A** — [anivetha214@gmail.com](mailto:anivetha214@gmail.com)

## 📄 License

[MIT](LICENSE) © 2026 Nivetha A
