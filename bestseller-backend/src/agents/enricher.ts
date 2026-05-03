/**
 * Agent 2: Enricher
 *
 * Purpose: Fetch detailed product data for each style ID in queue.
 *
 * Process:
 * 1. Read from product_queue (action = 'enrich')
 * 2. Fetch product page from Myntra
 * 3. Extract detailed fields (images, sizes, fabric, origin, etc.)
 * 4. Update product in DB
 * 5. Mark as enriched
 * 6. Check if threshold reached → trigger ranker
 */

import puppeteer, { Browser, Page } from "puppeteer";
import { db } from "../db/index.js";
import { products, productQueue, agentLogs } from "../db/schema.js";
import { eq, and, sql } from "drizzle-orm";

const RANK_THRESHOLD = 500;

export class Enricher {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async initialize(): Promise<void> {
    console.log("[Enricher] → Launching browser...");
    this.browser = await puppeteer.launch({
      headless: false,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    this.page = await this.browser.newPage();
    await this.page.goto("https://www.myntra.com", { waitUntil: "domcontentloaded", timeout: 60000 });
    await new Promise((r) => setTimeout(r, 2000));
    console.log("[Enricher] → Browser ready");
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  async fetchProductDetails(styleId: number): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!this.page) return { success: false, error: "No page" };

    try {
      const result = await this.page.evaluate(async (id) => {
        try {
          const res = await fetch(`https://www.myntra.com/gateway/v2/product/${id}`, {
            headers: { accept: "application/json", "x-myntraweb": "Yes" },
          });
          if (res.status === 404) return { success: false, error: "not_found" };
          const text = await res.text();
          if (text.startsWith("<")) return { success: false, error: "blocked" };

          const data = JSON.parse(text);
          const style = data.style || data;

          return {
            success: true,
            data: {
              images: (style.media?.albums?.default?.images || []).map((img: any) => img.imageURL),
              sizes: (style.sizes || []).map((s: any) => s.label),
              availableSizes: (style.sizes || []).filter((s: any) => s.available).map((s: any) => s.label),
              fabricType: style.articleAttributes?.["Fabric"] || style.articleAttributes?.["Material"] || null,
              fit: style.articleAttributes?.["Fit"] || null,
              pattern: style.articleAttributes?.["Pattern"] || null,
              sleeveLength: style.articleAttributes?.["Sleeve Length"] || null,
              occasion: style.articleAttributes?.["Occasion"] || null,
              countryOfOrigin: style.articleAttributes?.["Country of Origin"] || style.manufacturerInfo?.countryOfOrigin || null,
              description: style.productDescriptors?.description?.value || null,
            },
          };
        } catch (e: any) {
          return { success: false, error: e.message };
        }
      }, styleId);
      return result;
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async processQueueItem(item: { id: number; styleId: number }): Promise<boolean> {
    await db.update(productQueue).set({ status: "processing" }).where(eq(productQueue.id, item.id));

    const result = await this.fetchProductDetails(item.styleId);

    if (!result.success) {
      if (result.error === "not_found") {
        await db.update(products).set({ isActive: false, status: "error" }).where(eq(products.id, item.styleId));
      }
      await db.update(productQueue).set({ status: "failed", error: result.error, attempts: sql`${productQueue.attempts} + 1` }).where(eq(productQueue.id, item.id));
      return false;
    }

    await db.update(products).set({
      images: result.data.images,
      sizes: result.data.sizes,
      availableSizes: result.data.availableSizes,
      fabricType: result.data.fabricType,
      fit: result.data.fit,
      pattern: result.data.pattern,
      sleeveLength: result.data.sleeveLength,
      occasion: result.data.occasion,
      countryOfOrigin: result.data.countryOfOrigin,
      description: result.data.description,
      status: "enriched",
      enrichedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).where(eq(products.id, item.styleId));

    await db.update(productQueue).set({ status: "done", processedAt: new Date().toISOString() }).where(eq(productQueue.id, item.id));
    return true;
  }

  async processQueue(limit = 100): Promise<{ processed: number; failed: number }> {
    const pending = await db.select().from(productQueue).where(and(eq(productQueue.action, "enrich"), eq(productQueue.status, "pending"))).limit(limit);
    console.log(`[Enricher] → Processing ${pending.length} items`);

    let processed = 0, failed = 0;
    for (const item of pending) {
      const success = await this.processQueueItem({ id: item.id, styleId: item.styleId });
      if (success) { processed++; if (processed % 10 === 0) console.log(`[Enricher] → ${processed}/${pending.length}`); }
      else failed++;
      await new Promise((r) => setTimeout(r, 200));
    }
    return { processed, failed };
  }

  async getEnrichedCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(products).where(eq(products.status, "enriched"));
    return result[0]?.count || 0;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const enricher = new Enricher();
  (async () => {
    try {
      await enricher.initialize();
      const result = await enricher.processQueue(100);
      console.log(`\nComplete: ${result.processed} processed, ${result.failed} failed`);
      console.log(`Total enriched: ${await enricher.getEnrichedCount()}`);
    } finally {
      await enricher.close();
    }
  })();
}

export default Enricher;
