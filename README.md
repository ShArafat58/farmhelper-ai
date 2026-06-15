# 🌱 FarmHelper — Your Smart Farming Companion

**AI-powered farming companion for crop diagnosis, profit planning, smart calendars, and a direct farmer-to-buyer marketplace — region & season aware, bilingual (Bangla / English).**

🔗 **Live app:** https://farmhelper-ai.lovable.app/

---

## 🚜 The Problem

Smallholder farmers around the world make high-stakes decisions with almost no timely, localized guidance. They struggle to:

- **Identify crop diseases** before they spread.
- **Choose which crop to plant** for the best profit in their region and season.
- **Remember the right farming tasks** at the right time.
- **Sell their produce fairly**, often losing margin to middlemen.

FarmHelper puts an AI agronomist, a profit advisor, a smart calendar, and a direct marketplace into one simple, mobile-first app — usable in **Bengali or English**, and built to work **in any country** because the AI handles region and season automatically.

---

## ✨ What FarmHelper Does

### 🩺 AI Crop Doctor
Upload a photo of an affected crop and describe the symptoms. The AI returns a structured diagnosis — **disease name, cause, organic treatment, chemical treatment, dosage, prevention, and a confidence level** — and saves it to your diagnosis history.

### 📈 AI Profit Planner
Enter your land size and pick a region. The AI ranks the **most profitable crops** for that region and the current season, with **estimated cost, revenue, profit, demand, and season-fit** — all in your local currency. A **region switcher** lets you compare different countries instantly, proving the platform works globally.

### 📅 Smart Farming Calendar
Add tasks manually, or let the AI **generate a full task plan** (sowing → irrigation → fertilizer → harvest) for any crop and region, with due dates auto-scheduled. One tap to mark tasks done.

### 🛒 Direct Marketplace
A classifieds-style marketplace where farmers list produce and connect **directly with buyers** — no middlemen. Includes image uploads, a throttled **"Reveal contact"** flow to protect sellers, and a **report** option for safety.

### 💬 Community Q&A
Ask farming questions and get an **instant AI answer**, plus replies from other farmers.

### 📊 Reporting Dashboard & Gamification
A personal dashboard with activity charts, upcoming tasks, and counts — plus a **Krishi Score** and **badges** (First Diagnosis, Planner, Seller, Green Thumb) that reward active use.

### 🛡️ Admin & Moderation
A role-gated admin panel with platform-wide stats and a **moderation queue** to review reports and hide or resolve flagged content.

### 🌐 Bilingual by Design
Users in **Bangladesh** can switch the entire interface between **Bengali and English**. Users in every other country get a clean **English** experience. AI answers are returned in the user's chosen language.

---

## 🤖 How the AI Works

FarmHelper never hardcodes seasons or crop lists. Instead:

```
Your input  ──►  Server function (createServerFn)  ──►  Lovable AI Gateway  ──►  Localized, structured result
(crop, region,        (adds your country, region,           (LLM reasoning)         (in your language & currency)
 season, language)     current month, currency)
```

Because the **region and current month are passed into every AI call**, the same app gives locally-correct advice anywhere on earth — with **no per-country content team** required. That is the platform's core scalability advantage.

Every AI feature includes **graceful fallbacks** (friendly error + retry, plus static guidance for Crop Doctor) and a **per-user daily rate limit**, so it never crashes or shows a blank screen.

---

## 🧑‍🌾 Getting Started (Using the App)

1. Open **https://farmhelper-ai.lovable.app/**
2. Click **Get started free** and create an account (name, email, password, country).
3. If you select **Bangladesh**, choose Bengali or English.
4. Set your **region, area unit, and currency** in Settings for the most accurate advice.
5. Explore: add a farm plot, diagnose a crop, run the profit planner, generate a calendar, or list produce in the market.

---

## 🛠️ Tech Stack

| Layer | Technology |
|------|-------------|
| Frontend | **TanStack Start v1** (React 19, file-based routing, SSR) + **Tailwind CSS** |
| Backend | **Lovable Cloud (Supabase)** — Postgres, Auth, Row-Level Security, Storage |
| App logic | **TanStack server functions** (`createServerFn`) — secrets stay server-side |
| AI | **Lovable AI Gateway** (no user-provided API keys) |
| i18n | **i18next** (en / bn) |
| Hosting | **Lovable** (build, deploy, publish) |

---

## 🔒 Architecture & Security Highlights

- **Row-Level Security (RLS) on every table** — users can only access their own data.
- **Roles without recursion** — a dedicated `user_roles` table with a `has_role()` `SECURITY DEFINER` function used in all admin policies.
- **Privilege escalation blocked** — regular users cannot grant themselves admin.
- **Protected contact info** — phone numbers are only revealed through a throttled, logged flow.
- **Owner-scoped storage** — uploaded images are isolated per user.
- **AI rate limiting** — per-user daily quota with clear handling for rate-limit and credit errors.
- **Soft-delete + moderation** — reported listings and community content go through an admin queue.

---

## 💰 Business Model ($100M Path)

- **Freemium subscription** — premium AI usage, advanced profit planning, and price alerts.
- **B2B for agri-input companies** — verified product recommendations and ads.
- **Marketplace commission** — a small fee on facilitated sales.
- **Aggregated data** — anonymized crop, disease, and yield insights for lenders and insurers.

The global, low-content-cost, AI-localized model is the moat: one platform, every country.

---

## 🗺️ Roadmap

- In-app messaging and payments in the marketplace
- Real-time market prices via data partnerships
- Weather-aware calendar and alerts
- Proactive image moderation
- More languages beyond Bengali / English

---

## 💻 Development

This is a **Lovable** project (synced two-way with GitHub).

```bash
# install dependencies
npm install

# start the dev server
npm run dev
```

> The backend (Lovable Cloud / Supabase) connection is managed by Lovable. To run fully locally you'll need the project's Supabase URL and anon key configured as environment variables. The easiest way to edit and redeploy is through the Lovable editor, which keeps this repo in sync.

---

## 🙌 Built With

Built with [Lovable](https://lovable.dev) by **Shahriar Hossain Arafat** ([@ShArafat58](https://github.com/ShArafat58)).

---

## 📄 License

Released under the MIT License. See `LICENSE` for details.
