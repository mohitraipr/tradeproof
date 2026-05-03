import { Router } from "express";
import { db } from "../db/index.js";
import { products, agentLogs, productQueue, categories } from "../db/schema.js";
import { eq, desc, sql, and, isNotNull } from "drizzle-orm";
import { Ranker } from "../agents/ranker.js";

const router = Router();

// GET /api/agent/rankings - Get current rankings
router.get("/rankings", async (req, res) => {
  try {
    const { limit = "100" } = req.query;

    const ranked = await db
      .select()
      .from(products)
      .where(and(eq(products.status, "ranked"), isNotNull(products.bestsellerRank)))
      .orderBy(products.bestsellerRank)
      .limit(parseInt(limit as string));

    res.json({ success: true, data: ranked });
  } catch (error) {
    console.error("Error fetching rankings:", error);
    res.status(500).json({ success: false, error: "Failed to fetch rankings" });
  }
});

// POST /api/agent/rank - Trigger ranking
router.post("/rank", async (req, res) => {
  try {
    const { categorySlug, withAI = false } = req.body;

    const ranker = new Ranker();
    const result = await ranker.rankProducts({ categorySlug, withAI });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error ranking products:", error);
    res.status(500).json({ success: false, error: "Ranking failed" });
  }
});

// GET /api/agent/logs - Get agent activity logs
router.get("/logs", async (req, res) => {
  try {
    const { limit = "50", agent } = req.query;

    let query = db
      .select()
      .from(agentLogs)
      .orderBy(desc(agentLogs.createdAt))
      .limit(parseInt(limit as string));

    const logs = await query;

    res.json({ success: true, data: logs });
  } catch (error) {
    console.error("Error fetching logs:", error);
    res.status(500).json({ success: false, error: "Failed to fetch logs" });
  }
});

// GET /api/agent/queue - Get queue status
router.get("/queue", async (req, res) => {
  try {
    const [pending] = await db
      .select({ count: sql<number>`count(*)` })
      .from(productQueue)
      .where(eq(productQueue.status, "pending"));

    const [processing] = await db
      .select({ count: sql<number>`count(*)` })
      .from(productQueue)
      .where(eq(productQueue.status, "processing"));

    const [done] = await db
      .select({ count: sql<number>`count(*)` })
      .from(productQueue)
      .where(eq(productQueue.status, "done"));

    const [failed] = await db
      .select({ count: sql<number>`count(*)` })
      .from(productQueue)
      .where(eq(productQueue.status, "failed"));

    res.json({
      success: true,
      data: {
        pending: pending?.count || 0,
        processing: processing?.count || 0,
        done: done?.count || 0,
        failed: failed?.count || 0,
      },
    });
  } catch (error) {
    console.error("Error fetching queue:", error);
    res.status(500).json({ success: false, error: "Failed to fetch queue" });
  }
});

// GET /api/agent/status - Get all agent statuses
router.get("/status", async (req, res) => {
  try {
    // Get category count
    const [catCount] = await db.select({ count: sql<number>`count(*)` }).from(categories);

    // Get product counts by status
    const [totalProducts] = await db.select({ count: sql<number>`count(*)` }).from(products);
    const [enriched] = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(eq(products.status, "enriched"));
    const [ranked] = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(eq(products.status, "ranked"));

    // Get queue stats
    const [queuePending] = await db
      .select({ count: sql<number>`count(*)` })
      .from(productQueue)
      .where(eq(productQueue.status, "pending"));

    // Get recent logs per agent
    const recentLogs = await db
      .select()
      .from(agentLogs)
      .orderBy(desc(agentLogs.createdAt))
      .limit(20);

    // Get top 10 ranked
    const top10 = await db
      .select({
        id: products.id,
        name: products.name,
        brand: products.brand,
        price: products.price,
        rating: products.rating,
        ratingCount: products.ratingCount,
        bestsellerRank: products.bestsellerRank,
        bestsellerScore: products.bestsellerScore,
        aiReasoning: products.aiReasoning,
        searchImage: products.searchImage,
      })
      .from(products)
      .where(and(eq(products.status, "ranked"), isNotNull(products.bestsellerRank)))
      .orderBy(products.bestsellerRank)
      .limit(10);

    res.json({
      success: true,
      data: {
        stats: {
          categories: catCount?.count || 0,
          totalProducts: totalProducts?.count || 0,
          enriched: enriched?.count || 0,
          ranked: ranked?.count || 0,
          queuePending: queuePending?.count || 0,
        },
        recentLogs,
        top10,
      },
    });
  } catch (error) {
    console.error("Error fetching status:", error);
    res.status(500).json({ success: false, error: "Failed to fetch status" });
  }
});

export default router;
