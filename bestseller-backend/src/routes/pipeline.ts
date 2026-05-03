import { Router } from "express";
import { spawn } from "child_process";
import { db } from "../db/index.js";
import { agentLogs, products, categories, productQueue } from "../db/schema.js";
import { eq, sql, desc } from "drizzle-orm";

const router = Router();

let pipelineRunning = false;
let pipelineLogs: string[] = [];

// POST /api/pipeline/run - Trigger full pipeline
router.post("/run", async (req, res) => {
  if (pipelineRunning) {
    return res.status(409).json({ success: false, error: "Pipeline already running" });
  }

  pipelineRunning = true;
  pipelineLogs = [];

  // Run pipeline in background
  const child = spawn("npx", ["tsx", "src/agents/pipeline.ts"], {
    cwd: process.cwd(),
    shell: true,
  });

  child.stdout.on("data", (data) => {
    const lines = data.toString().split("\n").filter(Boolean);
    pipelineLogs.push(...lines);
    console.log(data.toString());
  });

  child.stderr.on("data", (data) => {
    pipelineLogs.push(`[ERROR] ${data.toString()}`);
    console.error(data.toString());
  });

  child.on("close", (code) => {
    pipelineRunning = false;
    pipelineLogs.push(`Pipeline finished with code ${code}`);
  });

  res.json({ success: true, message: "Pipeline started" });
});

// GET /api/pipeline/status - Get pipeline status
router.get("/status", async (req, res) => {
  try {
    // Get counts
    const [catCount] = await db.select({ count: sql<number>`count(*)` }).from(categories);
    const [productCount] = await db.select({ count: sql<number>`count(*)` }).from(products);
    const [enrichedCount] = await db.select({ count: sql<number>`count(*)` }).from(products).where(eq(products.status, "enriched"));
    const [rankedCount] = await db.select({ count: sql<number>`count(*)` }).from(products).where(eq(products.status, "ranked"));
    const [queuePending] = await db.select({ count: sql<number>`count(*)` }).from(productQueue).where(eq(productQueue.status, "pending"));

    // Get recent logs
    const logs = await db
      .select()
      .from(agentLogs)
      .orderBy(desc(agentLogs.createdAt))
      .limit(50);

    res.json({
      success: true,
      running: pipelineRunning,
      stats: {
        categories: catCount?.count || 0,
        products: productCount?.count || 0,
        enriched: enrichedCount?.count || 0,
        ranked: rankedCount?.count || 0,
        queuePending: queuePending?.count || 0,
      },
      logs: logs.map(l => ({
        id: l.id,
        agent: l.agent,
        action: l.action,
        status: l.status,
        message: l.details?.message || l.action,
        timestamp: l.createdAt,
      })),
      consoleLogs: pipelineLogs.slice(-30),
    });
  } catch (error) {
    console.error("Pipeline status error:", error);
    res.status(500).json({ success: false, error: "Failed to get status" });
  }
});

// GET /api/pipeline/logs - Stream logs (for live updates)
router.get("/logs", (req, res) => {
  res.json({
    success: true,
    running: pipelineRunning,
    logs: pipelineLogs.slice(-50),
  });
});

export default router;
