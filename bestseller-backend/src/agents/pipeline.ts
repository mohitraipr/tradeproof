/**
 * Pipeline Orchestrator
 *
 * Self-healing pipeline that chains all agents:
 * Monitor → Crawler → Enricher → Ranker (if 500+ products)
 *
 * Features:
 * - Validates methods before calling
 * - Catches and logs errors per step
 * - Continues to next step even if one fails
 * - Falls back to alternatives when primary approach fails
 *
 * Usage: npx tsx src/agents/pipeline.ts
 */

import { CategoryMonitor } from "./category-monitor.js";
import { Crawler } from "./crawler.js";
import { Enricher } from "./enricher.js";
import { Ranker } from "./ranker.js";
import { db } from "../db/index.js";
import { products, agentLogs, categories } from "../db/schema.js";
import { eq, sql, asc } from "drizzle-orm";

const RANK_THRESHOLD = 500;

async function log(agent: string, message: string, status: string = "info") {
  const prefix = status === "success" ? "✓" : status === "error" ? "✗" : "→";
  console.log(`[${agent}] ${prefix} ${message}`);

  try {
    await db.insert(agentLogs).values({
      agent: agent.toLowerCase(),
      action: "pipeline",
      details: { message },
      status,
      createdAt: new Date().toISOString(),
    });
  } catch (e) {
    // Silently fail logging - don't break pipeline
  }
}

async function getCount(status?: string): Promise<number> {
  try {
    const query = status
      ? db.select({ count: sql<number>`count(*)` }).from(products).where(eq(products.status, status))
      : db.select({ count: sql<number>`count(*)` }).from(products);
    const [result] = await query;
    return result?.count || 0;
  } catch {
    return 0;
  }
}

async function runPipeline() {
  console.log("\n" + "═".repeat(60));
  console.log("  BESTSELLER AGENT PIPELINE");
  console.log("═".repeat(60) + "\n");

  let categoriesWithChanges: { slug: string; name: string; newCount: number }[] = [];
  let smallestCategories: { slug: string; name: string; count: number }[] = [];

  // ═══════════════════════════════════════════════════════════════
  // STEP 1: MONITOR
  // ═══════════════════════════════════════════════════════════════
  await log("Monitor", "Starting category monitor...");
  const monitor = new CategoryMonitor();

  try {
    // Check if method exists before calling
    if (typeof monitor.initialize !== "function") {
      throw new Error("Monitor.initialize is not a function");
    }
    await monitor.initialize();

    // Try syncCategories (the actual method name)
    if (typeof monitor.syncCategories === "function") {
      const result = await monitor.syncCategories();
      await log("Monitor", `Synced ${result.total} categories, ${result.changed} have changes`, "success");

      if (typeof monitor.getCategoriesWithChanges === "function") {
        categoriesWithChanges = await monitor.getCategoriesWithChanges();
      }
    } else {
      await log("Monitor", "syncCategories not available, will use fallback", "warning");
    }

    // Get smallest categories as fallback
    if (typeof monitor.getCategoriesBySize === "function") {
      smallestCategories = await monitor.getCategoriesBySize();
      if (smallestCategories.length > 0) {
        await log("Monitor", `Found ${smallestCategories.length} categories by size`, "info");
      }
    }

    await monitor.close();
  } catch (error: any) {
    await log("Monitor", `Error: ${error.message}`, "error");
    try { await monitor.close(); } catch {}

    // Fallback: get categories directly from DB
    try {
      const dbCategories = await db
        .select({ slug: categories.slug, name: categories.name, count: categories.productCount })
        .from(categories)
        .where(eq(categories.isActive, true))
        .orderBy(asc(categories.productCount))
        .limit(10);

      smallestCategories = dbCategories.map(c => ({
        slug: c.slug,
        name: c.name || c.slug,
        count: c.count || 0,
      }));

      if (smallestCategories.length > 0) {
        await log("Monitor", `Fallback: Found ${smallestCategories.length} categories in DB`, "info");
      }
    } catch (dbError) {
      await log("Monitor", "No categories available. Run monitor manually first.", "error");
    }
  }

  // Decide what to crawl
  const toCrawl = categoriesWithChanges.length > 0
    ? categoriesWithChanges.slice(0, 3).map(c => ({ slug: c.slug, name: c.name }))
    : smallestCategories.slice(0, 3).map(c => ({ slug: c.slug, name: c.name }));

  if (toCrawl.length === 0) {
    await log("Monitor", "No categories to crawl. Pipeline complete.", "info");
    return;
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 2: CRAWLER
  // ═══════════════════════════════════════════════════════════════
  await log("Crawler", "Starting crawler...");
  const crawler = new Crawler();

  let totalFetched = 0;
  let totalQueued = 0;

  try {
    if (typeof crawler.initialize !== "function") {
      throw new Error("Crawler.initialize is not a function");
    }
    await crawler.initialize();

    // Try crawling each category
    for (const cat of toCrawl) {
      try {
        await log("Crawler", `Crawling ${cat.name}...`);

        if (typeof crawler.crawlCategory === "function") {
          const result = await crawler.crawlCategory(cat.slug, 10);
          totalFetched += result.fetched;
          totalQueued += result.queued;
          await log("Crawler", `  ${cat.name}: ${result.fetched} fetched, ${result.queued} queued`, "success");
        } else if (typeof crawler.crawlSmallestFirst === "function") {
          const results = await crawler.crawlSmallestFirst(1);
          for (const r of results) {
            totalFetched += r.fetched;
            totalQueued += r.queued;
          }
        } else {
          throw new Error("No crawl method available");
        }
      } catch (catError: any) {
        await log("Crawler", `  ${cat.name} failed: ${catError.message}`, "error");
        // Continue to next category
      }
    }

    await log("Crawler", `Total: ${totalFetched} fetched, ${totalQueued} queued`, "success");
    await crawler.close();
  } catch (error: any) {
    await log("Crawler", `Error: ${error.message}`, "error");
    try { await crawler.close(); } catch {}
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 3: ENRICHER
  // ═══════════════════════════════════════════════════════════════
  await log("Enricher", "Starting enricher...");
  const enricher = new Enricher();

  try {
    if (typeof enricher.initialize !== "function") {
      throw new Error("Enricher.initialize is not a function");
    }
    await enricher.initialize();

    if (typeof enricher.processQueue === "function") {
      const result = await enricher.processQueue(300);
      await log("Enricher", `Processed ${result.processed} products (${result.failed} failed)`, "success");
    } else {
      throw new Error("Enricher.processQueue is not a function");
    }

    await enricher.close();
  } catch (error: any) {
    await log("Enricher", `Error: ${error.message}`, "error");
    try { await enricher.close(); } catch {}
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 4: RANKER
  // ═══════════════════════════════════════════════════════════════
  const enrichedCount = await getCount("enriched");

  if (enrichedCount >= RANK_THRESHOLD) {
    await log("Ranker", `Threshold met (${enrichedCount}/${RANK_THRESHOLD}). Starting ranker...`);
    const ranker = new Ranker();

    try {
      if (typeof ranker.rankProducts === "function") {
        const result = await ranker.rankProducts({ withAI: false });
        await log("Ranker", `Ranked ${result.ranked} products`, "success");

        if (result.top10.length > 0) {
          console.log("\nTop 5 Bestsellers:");
          result.top10.slice(0, 5).forEach((p, i) => {
            console.log(`  ${i + 1}. ${p.name.slice(0, 50)}... (score: ${p.score})`);
          });
        }
      } else {
        throw new Error("Ranker.rankProducts is not a function");
      }
    } catch (error: any) {
      await log("Ranker", `Error: ${error.message}`, "error");
    }
  } else {
    const needed = RANK_THRESHOLD - enrichedCount;
    await log("Ranker", `Skipped - need ${needed} more products (${enrichedCount}/${RANK_THRESHOLD})`, "info");
  }

  // ═══════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════
  const totalProducts = await getCount();
  const finalEnriched = await getCount("enriched");
  const finalRanked = await getCount("ranked");

  console.log("\n" + "═".repeat(60));
  console.log("  PIPELINE COMPLETE");
  console.log("═".repeat(60));
  console.log(`  Total Products: ${totalProducts}`);
  console.log(`  Enriched: ${finalEnriched}`);
  console.log(`  Ranked: ${finalRanked}`);
  console.log("═".repeat(60) + "\n");
}

// Run with top-level error handler
runPipeline().catch((error) => {
  console.error("\n[Pipeline] Fatal error:", error.message);
  process.exit(1);
});
