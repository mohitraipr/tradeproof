# TradeProof - B2B Fashion Marketplace

## What is TradeProof?

TradeProof is a **B2B fashion marketplace** designed for **offline retailers** who currently buy inventory on gut feeling. The platform provides **data-backed product sourcing** using Myntra market intelligence (ratings, reviews, bestseller rankings) combined with manufacturer fulfillment capabilities.

### The Opportunity

- 10M+ offline fashion retailers in India have no access to trend data
- They rely on wholesalers who push slow-moving inventory
- TradeProof shows them what's *actually* selling online, reducing dead stock risk
- Retailers can make smarter sourcing decisions backed by real market data

---

## Current State (May 2026)

### Database
- **17,000+ enriched products** with Myntra data (ratings, reviews, prices)
- SQLite database at `/data/bestseller.db`
- Product categories: Men, Women, Kids apparel

### Frontend (Next.js + Tailwind)
| Page | Status | Key Features |
|------|--------|--------------|
| Homepage (`/`) | ✅ Complete | Animated hero, trust badges, category grid, trending products |
| Product Listing (`/products`) | ✅ Complete | Animated hero, price slider, filters, pagination |
| Product Detail (`/products/[id]`) | ✅ Complete | Image gallery, size guide modal, profit calculator, bank offers |
| Login (`/login`) | ✅ Exists | Basic form |
| Register (`/register`) | ✅ Exists | Seller registration form |
| Dashboard (`/dashboard`) | ✅ Exists | Seller dashboard shell |

### Backend API
- `GET /api/products` - Product listing with filters (category, sort, price range)
- `GET /api/products/[id]` - Single product detail
- Running on port 3001

### Design System
- **Primary accent**: Coral (#E07A5F)
- **Background**: Warm cream (#FFFBF7)
- **Typography**: Outfit (headings), DM Sans (body)
- **Animations**: Hero fade-up, gradient text, price slider, slide-in modals

---

## Business Rules

| Rule | Value |
|------|-------|
| MOQ | 100 pieces per style |
| Pricing | Non-negotiable |
| Samples | One per product per seller |
| Fulfillment | Platform handles |
| Returns | Defects only |
| GST | Optional for sellers |

---

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS 4 + custom CSS variables
- **UI Components**: shadcn/ui
- **Database**: SQLite (via better-sqlite3)
- **Icons**: Lucide React

---

## Running Locally

```bash
# Install dependencies
npm install

# Start the backend API (port 3001)
cd ../bestseller-backend && npm run dev

# Start the frontend (port 3000)
npm run dev
```

---

## What's Next

### Phase 2: Authentication & Orders
- [ ] Seller authentication (phone/OTP)
- [ ] Sample order flow
- [ ] Bulk order flow
- [ ] Order history

### Phase 3: AI Agents
- [ ] Pricing Agent - Suggest optimal B2B price
- [ ] Trend Agent - "This is rising fast" alerts
- [ ] Seller Agent - Chat-based product discovery
