# Bestseller AI Backend

AI-powered B2B fashion bestseller API.

## Setup

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your credentials:
# - DATABASE_URL: Get from Neon (https://neon.tech)
# - ANTHROPIC_API_KEY: Get from Anthropic Console

# Push database schema
npm run db:push

# Start development server
npm run dev
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Build for production |
| `npm start` | Run production build |
| `npm run db:push` | Push schema to database |
| `npm run db:studio` | Open Drizzle Studio (DB GUI) |
| `npm run crawler` | Run category crawler |

## API Endpoints

### Products

- `GET /api/products` - List products with filters
  - Query: `category`, `brand`, `origin`, `minRating`, `minPrice`, `maxPrice`, `sort`, `limit`, `offset`
- `GET /api/products/:id` - Single product
- `GET /api/products/top/:count` - Top N bestsellers

### Brands

- `GET /api/brands` - List all brands
- `GET /api/brands/:name` - Single brand with products
- `POST /api/brands/refresh` - Recalculate brand stats

### AI Agent

- `POST /api/agent/analyze` - Run AI ranking
  - Body: `{ productIds?: number[], count?: number, skipEnrich?: boolean }`
- `POST /api/agent/enrich` - Enrich product details
  - Body: `{ productIds: number[] }`
- `GET /api/agent/rankings` - Get current rankings
- `GET /api/agent/history/:productId` - Ranking history

## Architecture

```
src/
├── index.ts           # Express server
├── db/
│   ├── index.ts       # Database connection
│   └── schema.ts      # Drizzle schema
├── routes/
│   ├── products.ts    # Product endpoints
│   ├── brands.ts      # Brand endpoints
│   └── agent.ts       # AI agent endpoints
├── agents/
│   ├── crawler.ts     # Category crawler (Agent 1)
│   ├── enricher.ts    # Product enricher (Agent 2)
│   └── ranker.ts      # AI ranker (Agent 3)
└── types/
    └── index.ts       # TypeScript types
```

## Crawler Usage

```bash
# Crawl specific categories
npm run crawler men-tshirts women-dresses

# The crawler will:
# 1. Fetch new products (sorted by newest)
# 2. Stop when reaching previously seen products
# 3. Filter: new OR rating >= 4.0
# 4. Skip variants (only main styles)
```

## Database

Using Neon Postgres with Drizzle ORM.

Tables:
- `products` - Main product data
- `brands` - Aggregated brand stats
- `categories` - Category metadata
- `rankings_history` - Track rank changes
- `crawler_state` - Incremental crawl tracking
