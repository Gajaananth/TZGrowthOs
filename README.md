# Tradiq Zium GrowthOS 🌱

> **AI-Powered Retail Growth, Digital Marketing, and Local SEO Assistant for Sri Lankan SMEs**  
> *Built for Google Cloud AI Builder Cup 2026 — Track: Retail and Commerce (Intelligent Customer and Business Experiences)*

---

## 🎯 What Problem Does This Solve?

Small and medium retailers in Sri Lanka face distinct challenges:
1. **Multilingual consumer base**: Customers search and converse in English, Sinhala (සිංහල), Tamil (தமிழ்), Singlish ("oya gawa tiyenawada"), and Tanglish.
2. **Cultural and festive seasonality**: Shopping peaks dramatically around Sinhala & Tamil New Year (Avurudu), Vesak, Ramazan, Deepavali, and Christmas.
3. **Hyper-local search discovery**: Micro-merchants in Colombo, Kandy, Galle, and Jaffna struggle to rank on Google Maps and Google Search without expensive marketing agencies.
4. **Inventory balancing**: Capital is tied up in slow-moving stock while high-margin products lack promotional visibility.

**Tradiq Zium GrowthOS** solves this by acting as an autonomous retail copilot answering **four fundamental questions**:

| Question | GrowthOS Feature | How It Works |
| :--- | :--- | :--- |
| **1. What should we promote?** | **AI Product Priority Engine** (`/priorities`) | Deterministic scoring based on margins, stock levels, and upcoming Sri Lankan festival calendar boosts, explained in plain language via Gemini. |
| **2. How should we promote it?** | **Multilingual Campaign Wizard & Approval Hub** (`/campaigns`) | Generates ready-to-dispatch marketing packs in 5 Sri Lankan dialects (EN, SI, TA, Singlish, Tanglish) with automated cultural sensitivity audits and WhatsApp sharing. |
| **3. How can customers find us?** | **Local SEO & Google Maps Helper** (`/seo`) | Produces Colombo/Kandy/Galle localized meta titles, keywords, Google My Business posts, and schema JSON-LD snippets. |
| **4. What should we do next?** | **Ask GrowthOS AI Retail Strategist** (`/chat` & `/`) | Interactive multi-turn strategist grounded in live inventory, sales turnover, and approaching holidays with actionable step-by-step checklists. |

---

## 🏗️ Architecture & Google Cloud AI Integration

```
  ┌────────────────────────────────────────────────────────┐
  │         React + TypeScript + Vite Frontend             │
  │    (Tradiq Green Theme • i18n EN / SI / TA • Responsive)│
  └───────────────────────────┬────────────────────────────┘
                              │ REST / JSON
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │                 Node.js + Express Backend              │
  │        (JWT Auth • Deterministic Scoring • Router)     │
  └─────────────┬────────────────────────────┬─────────────┘
                │                            │
                ▼                            ▼
  ┌──────────────────────────┐  ┌──────────────────────────┐
  │    PostgreSQL Database   │  │   Google Gemini 3.8/3.5  │
  │   13 Normalized Tables   │  │    (via @google/         │
  │   Auto-migrated schema   │  │    generative-ai SDK)    │
  │  (Products, Campaigns,   │  │   • thinkJSON validated  │
  │   Festivals, AI Audits)  │  │   • Deterministic fallback│
  └──────────────────────────┘  └──────────────────────────┘
```

### Key AI Design Principles
- **Dual-Engine Architecture (Zero Lockout)**: If `GEMINI_API_KEY` is not supplied or the offline mode triggers, every single feature (Priority Scoring, Captions, SEO, Strategist) gracefully falls back to intelligent deterministic algorithms with clear badges.
- **Strict Output Validation**: Powered by `thinkJSON` with runtime **Zod** schema enforcement. No hallucinated or broken JSON.
- **Cultural Sensitivity Guardrails**: Captions checked against religious and cultural norms for Sri Lanka (e.g., respectful Vesak/Poya day messaging, vegetarian sensitivities during Hindu festivals).
- **Merchant-in-the-Loop**: Generated content enters an approval state machine (`DRAFT` → `IN_REVIEW` → `APPROVED` / `REJECTED`) with an immutable audit trail.

---

## 🚀 Quickstart & Local Setup

### 1. Prerequisites
- **Node.js**: v18+ (v20+ recommended)
- **PostgreSQL**: Local instance or remote URL (Neon, Supabase, Cloud SQL)

### 2. Install Dependencies
```bash
npm install
npm --prefix client install
```

### 3. Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Configure your settings:
```ini
PORT=3001
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tradiq_growthos
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.5-flash
JWT_SECRET=your_super_secret_jwt_key_here
```

### 4. Run Development Servers
```bash
# Runs both backend (:3001) and frontend (:5173) concurrently
npm run dev:all
```
Visit **`http://localhost:5173`** in your browser.

### 5. Seed Realistic Demo Data
1. Register a test merchant account at `http://localhost:5173/register`.
2. In **Settings** (`/settings`), click **"Seed 8 Demo Items"**.
3. Real Sri Lankan retail products will populate immediately (Organic Ceylon Cinnamon, Batik Linen Shirts, Sinharaja Kithul Treacle, Nuwara Eliya Pekoe Tea).

---

## 🧪 Testing & Validation

Run unit tests:
```bash
npm test
```
All 14 core unit tests test:
- `backend/tests/scoring.test.ts`: Margin tiers, stock velocity penalties, festival category boost algorithms.
- `backend/tests/approval.test.ts`: Merchant approval state machine lifecycle.
- `backend/tests/thinkJSON.test.ts`: Markdown fence stripping and Zod schema validation.

Production client bundle build:
```bash
npm run build
```

---

## 📂 Project Structure

```
d:/Tradiq Zium GrowthOs/
├── backend/
│   ├── db/connection.ts       # PostgreSQL connection & auto-migrations
│   ├── lib/scoring.ts         # Deterministic priority engine
│   ├── middleware/auth.ts     # JWT authorization
│   ├── routes/                # 11 Express routes
│   │   ├── auth.ts            # Auth & store profile update
│   │   ├── products.ts        # Product catalog & CSV import
│   │   ├── priorities.ts      # Priority reasoning
│   │   ├── festivals.ts       # Festival calendar
│   │   ├── campaigns.ts       # Multi-language campaign creation
│   │   ├── assets.ts          # Content review & regeneration
│   │   ├── seo.ts             # Local SEO & Google Maps helper
│   │   ├── insights.ts        # Analytics & approval funnel
│   │   ├── chat.ts            # Ask GrowthOS AI chat strategist
│   │   └── demo.ts            # Sri Lankan retail seeder
│   ├── services/ai/           # Gemini client & thinkJSON validator
│   └── tests/                 # Vitest test suites
├── client/                    # React 18 + Vite + TypeScript frontend
│   ├── src/
│   │   ├── components/        # Sidebar, BottomTabBar, Badges, EmptyState
│   │   ├── context/           # AuthContext & I18nContext (EN/SI/TA)
│   │   ├── pages/             # 11 rich responsive views
│   │   └── services/api.ts    # Fully typed client API client
├── Dockerfile                 # Production multi-stage Docker build
├── DEPLOY.md                  # Google Cloud Run deployment guide
└── README.md                  # System documentation
```

---

## ⚠️ Known Limitations & Scope Disclosures

As per project guidelines, unfinished or out-of-scope items are explicitly documented:
1. **Live Meta / Google Ads Direct Publishing**: GrowthOS generates approved copy, hashtags, and WhatsApp share links. Direct programmatic publishing to Meta Graph API or Google Ads API requires live OAuth app approval from Meta/Google and is currently manual-copy/share.
2. **Direct Image File Generation**: AI poster concepts and image generation prompts are fully detailed; direct Imagen / Imagen 3 byte streaming outputs are mocked via structured text concepts pending Google Cloud Imagen enterprise quotas.
3. **SMS Gateway Integration**: WhatsApp direct link integration is functional (`wa.me`); direct Dialog/Mobitel SMS gateway integration requires Sri Lankan enterprise telco agreements.

---

## 🏆 Hackathon Submission Metadata

- **Event**: Google Cloud AI Builder Cup 2026
- **Track**: Retail and Commerce (Intelligent Customer and Business Experiences)
- **Primary AI Service**: Google Gemini (gemini-3.5-flash) via Google GenAI SDK
- **Region**: Sri Lanka (Western, Central, Southern & Northern Provinces)
- **License**: MIT
