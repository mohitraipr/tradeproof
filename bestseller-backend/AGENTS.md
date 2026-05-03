# Bestseller Marketplace - Agent Architecture

## Overview

Real-time pipeline that detects new products on Myntra, enriches them, ranks bestsellers, and displays on marketplace UI.

```
Category Monitor → Crawler → Enricher → Ranker → UI
     (daily)       (on change)  (stream)   (threshold)
```

---

## Agent 0: Category Count Monitor

**Purpose:** Track product counts per category. Detect when new products are added.

**Runs:** Daily (cron) or on-demand

**Process:**
1. Fetch product count for each category from Myntra API
2. Compare with stored count
3. If count increased → trigger Crawler for that category
4. Store new count + timestamp

**Input:**
- List of category slugs

**Output:**
- Updated category counts in DB
- Trigger signal to Crawler (category slug + new product count)

**Database:**
```sql
categories (
  slug TEXT PRIMARY KEY,
  name TEXT,
  product_count INTEGER,
  previous_count INTEGER,
  last_checked_at TIMESTAMP,
  last_changed_at TIMESTAMP
)
```

**Self-healing:**
- If API blocked → wait 5 min, retry with new session
- If category not found → mark as inactive, alert admin
- If count decreased → log anomaly, don't trigger crawl

**Signals to capture:**
- Big count jumps = brand pushing catalog (demand signal)
- Consistent growth = trending category

---

## Agent 1: Crawler

**Purpose:** Fetch style IDs for new products in a category.

**Runs:** Triggered by Category Monitor when count changes

**Process:**
1. Receive category slug + expected new count
2. Fetch products sorted by newest first (sort=new)
3. Stop when reaching products already in DB (by catalogDate)
4. Push each style ID to Enricher immediately (stream, not batch)

**Input:**
- Category slug
- Number of new products expected

**Output:**
- Style IDs pushed to Enricher queue
- Basic product data saved to DB (id, name, brand, price, catalogDate)

**Database:**
```sql
products (
  id INTEGER PRIMARY KEY,        -- Myntra style ID
  name TEXT,
  brand TEXT,
  category_slug TEXT,
  mrp INTEGER,
  price INTEGER,
  rating REAL,
  rating_count INTEGER,
  catalog_date_ms INTEGER,
  status TEXT DEFAULT 'pending', -- pending, enriched, ranked
  created_at TIMESTAMP
)
```

**Self-healing:**
- If blocked → refresh browser session, retry
- If pagination breaks → use pagination-context header
- If product already exists → skip (onConflictDoNothing)

---

## Agent 2: Enricher

**Purpose:** Fetch detailed product data (44 fields) for each style ID.

**Runs:** Triggered when Crawler pushes a style ID

**Process:**
1. Receive style ID
2. Fetch product page from Myntra
3. Extract: images, sizes, inventory, fabric, fit, pattern, country of origin, colors, etc.
4. Update product in DB with enriched data
5. Mark status = 'enriched'
6. Check if threshold reached → notify Ranker

**Input:**
- Style ID

**Output:**
- Enriched product data in DB
- Trigger to Ranker (when 500 products enriched OR category complete)

**Fields to extract:**
| Field | Use |
|-------|-----|
| images[] | Display |
| sizes[] | Inventory signal |
| availableSizes[] | In-stock = demand |
| fabricType | Manufacturing spec |
| fit | Product spec |
| pattern | Product spec |
| sleeveLength | Product spec |
| countryOfOrigin | India vs China sourcing |
| primaryColour | Color demand tracking |
| description | Search/filter |

**Self-healing:**
- If product page 404 → mark as inactive
- If blocked → wait, refresh session
- If field missing → use null, don't fail

---

## Agent 3: Ranker

**Purpose:** Score and rank products as bestsellers.

**Runs:** 
- After 500 products enriched (first pass)
- After category fully crawled (final pass)
- Can be triggered manually

**Process:**
1. Fetch all enriched products (status = 'enriched')
2. Calculate bestseller score:
   ```
   score = (ratingCount * log(ratingCount)) * (rating/5) * (1 + discount%) * velocity
   velocity = ratingCount / daysSinceListing
   ```
3. Use Claude API for reasoning on top 100
4. Update rankings in DB
5. Push to UI (websocket or polling)

**Input:**
- Category slug (optional, for category-specific ranking)
- Threshold trigger (500 products or category complete)

**Output:**
- bestseller_rank on each product
- bestseller_score on each product
- ai_reasoning for top products
- UI refresh signal

**Scoring factors:**
| Factor | Weight | Why |
|--------|--------|-----|
| ratingCount | High | Proxy for sales volume |
| rating | Medium | Quality signal |
| discount% | Low | Demand signal (but also clearance) |
| velocity | High | Recent sales momentum |
| daysListed | Normalize | New vs established |

**Self-healing:**
- If Claude API fails → use formula-only ranking
- If score calculation errors → log, skip product
- If UI push fails → retry 3x, then queue for next cycle

---

## Agent 4: UI Sync (Future)

**Purpose:** Keep marketplace UI updated in real-time.

**Process:**
1. Listen for new products (from Enricher)
2. Listen for ranking updates (from Ranker)
3. Push to frontend via WebSocket or Server-Sent Events
4. Handle offline/reconnect gracefully

---

## Triggers Summary

| Event | Triggers |
|-------|----------|
| Daily cron | Category Monitor |
| Count changed | Crawler for that category |
| Style ID received | Enricher |
| 500 products enriched | Ranker (first pass) |
| Category complete | Ranker (final pass) |
| Manual request | Any agent |

---

## Error Handling

| Error | Action |
|-------|--------|
| API blocked | Wait 5 min, new session, retry |
| Network timeout | Retry 3x with backoff |
| Invalid data | Log, skip, continue |
| DB error | Retry, if persistent alert admin |
| Agent crash | Auto-restart, log state for resume |

---

## Admin Alerts

Agent should alert admin when:
- Blocked for >30 min
- Category count decreased significantly
- >10% products failing enrichment
- Claude API quota exhausted
- Any unrecoverable error

---

## Execution Order (Fresh Start)

1. Clear existing products (keep categories table structure)
2. Run Category Monitor → get all counts
3. Start with smallest category
4. Crawler fetches products → streams to Enricher
5. Enricher processes → after 500, triggers Ranker
6. Ranker scores → updates UI
7. Repeat for next category

---

## Files Structure

```
bestseller-backend/
├── src/
│   ├── agents/
│   │   ├── category-monitor.ts    # Agent 0
│   │   ├── crawler.ts             # Agent 1
│   │   ├── enricher.ts            # Agent 2
│   │   └── ranker.ts              # Agent 3
│   ├── db/
│   │   ├── schema.ts
│   │   └── index.ts
│   ├── queues/                    # Agent communication
│   │   └── product-queue.ts
│   └── index.ts                   # API server
```
