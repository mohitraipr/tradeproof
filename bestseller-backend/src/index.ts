import express from "express";
import cors from "cors";
import "dotenv/config";
import { db, products, categories, styleIdQueue } from "./db/index.js";
import { and, eq, isNotNull, sql } from "drizzle-orm";

import productsRouter from "./routes/products.js";
import agentRouter from "./routes/agent.js";
import pipelineRouter from "./routes/pipeline.js";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Stats endpoint
app.get("/api/stats", async (req, res) => {
  try {
    const [productStats] = await db
      .select({
        total: sql<number>`count(*)`,
        enriched: sql<number>`sum(case when status = 'enriched' then 1 else 0 end)`,
        ranked: sql<number>`sum(case when status = 'ranked' then 1 else 0 end)`,
      })
      .from(products);

    const [categoryStats] = await db
      .select({ count: sql<number>`count(*)` })
      .from(categories);

    res.json({
      totalProducts: productStats?.total || 0,
      totalCategories: categoryStats?.count || 0,
      enrichedProducts: productStats?.enriched || 0,
      rankedProducts: productStats?.ranked || 0,
    });
  } catch (error) {
    console.error("Stats error:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// Queue stats endpoint - for monitoring collection progress
app.get("/api/queue-stats", async (req, res) => {
  try {
    const queueStats = await db
      .select({
        status: styleIdQueue.status,
        count: sql<number>`count(*)`,
      })
      .from(styleIdQueue)
      .groupBy(styleIdQueue.status);

    const categoryProgress = await db
      .select({
        categorySlug: styleIdQueue.categorySlug,
        count: sql<number>`count(*)`,
      })
      .from(styleIdQueue)
      .groupBy(styleIdQueue.categorySlug)
      .orderBy(sql`count(*) desc`);

    const stats = { pending: 0, enriched: 0, failed: 0 };
    for (const row of queueStats) {
      if (row.status === "pending") stats.pending = row.count;
      if (row.status === "enriched") stats.enriched = row.count;
      if (row.status === "failed") stats.failed = row.count;
    }

    res.json({
      queue: stats,
      total: stats.pending + stats.enriched + stats.failed,
      categoriesCollected: categoryProgress.length,
      categories: categoryProgress.slice(0, 20),
    });
  } catch (error) {
    console.error("Queue stats error:", error);
    res.json({ queue: { pending: 0, enriched: 0, failed: 0 }, total: 0, categoriesCollected: 0, categories: [] });
  }
});

// Categories endpoint — returns counts of products actually present in the local
// enriched DB (the cohort the listing API serves), not Myntra's industry-wide
// counts. This prevents the frontend from offering categories with 0 results.
app.get("/api/categories", async (req, res) => {
  try {
    const result = await db
      .select({
        slug: products.categorySlug,
        name: categories.name,
        productCount: sql<number>`count(*)`,
      })
      .from(products)
      .leftJoin(categories, eq(categories.slug, products.categorySlug))
      .where(and(eq(products.isActive, true), isNotNull(products.rating), isNotNull(products.categorySlug)))
      .groupBy(products.categorySlug)
      .orderBy(sql`count(*) desc`);

    res.json({
      categories: result.map(c => ({
        slug: c.slug,
        name: c.name || c.slug,
        productCount: Number(c.productCount) || 0,
      })),
    });
  } catch (error) {
    console.error("Categories error:", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// API Routes
app.use("/api/products", productsRouter);
app.use("/api/agent", agentRouter);
app.use("/api/pipeline", pipelineRouter);

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Error:", err);
  res.status(500).json({ success: false, error: err.message });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║           BESTSELLER AI BACKEND                            ║
╠════════════════════════════════════════════════════════════╣
║  Server running on http://localhost:${PORT}                   ║
║                                                            ║
║  Endpoints:                                                ║
║  GET  /health              - Health check                  ║
║  GET  /api/products        - List products                 ║
║  GET  /api/products/:id    - Single product                ║
║  GET  /api/products/top/:n - Top N bestsellers             ║
║  GET  /api/brands          - List brands                   ║
║  GET  /api/brands/:name    - Single brand                  ║
║  POST /api/brands/refresh  - Refresh brand stats           ║
║  POST /api/agent/analyze   - Run AI analysis               ║
║  POST /api/agent/enrich    - Enrich products               ║
║  GET  /api/agent/rankings  - Current rankings              ║
╚════════════════════════════════════════════════════════════╝
  `);
});

export default app;
