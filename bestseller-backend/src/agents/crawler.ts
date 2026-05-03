/**
 * Agent 1: Crawler
 *
 * Purpose: Fetch new products from a category, push style IDs to enricher queue.
 *
 * Triggered by: Category Monitor (when count changes)
 *
 * Process:
 * 1. Receive category slug
 * 2. Fetch products sorted by newest (sort=new)
 * 3. Stop when reaching already-seen products
 * 4. Save basic product data to DB
 * 5. Push style ID to enricher queue immediately
 *
 * Self-healing:
 * - Retry on block
 * - Skip duplicates
 * - Resume from last position
 */

import puppeteer, { Browser, Page } from "puppeteer";
import { db } from "../db/index.js";
import { products, categories, productQueue, agentLogs } from "../db/schema.js";
import { eq, desc, asc } from "drizzle-orm";

interface CrawlerResult {
  category: string;
  fetched: number;
  queued: number;
  skipped: number;
}

export class Crawler {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async initialize(): Promise<void> {
    this.log("Launching browser...");
    this.browser = await puppeteer.launch({
      headless: false,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
        "--window-size=1200,800",
      ],
    });
    this.page = await this.browser.newPage();
    await this.page.goto("https://www.myntra.com", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await new Promise((r) => setTimeout(r, 2000));
    this.log("Browser ready");
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  private log(msg: string, level: string = "info") {
    const prefix = level === "warning" ? "⚠️" : level === "error" ? "❌" : "→";
    console.log(`[Crawler] ${prefix} ${msg}`);
  }

  private async logAction(
    action: string,
    categorySlug?: string,
    details?: Record<string, any>,
    status: string = "success",
    error?: string
  ) {
    await db.insert(agentLogs).values({
      agent: "crawler",
      action,
      categorySlug,
      details,
      status,
      errorMessage: error,
      createdAt: new Date().toISOString(),
    });
  }

  /**
   * Fetch a page of products from Myntra
   */
  private async fetchPage(
    slug: string,
    offset: number,
    paginationContext: string | null
  ): Promise<{
    products: any[];
    totalCount: number;
    hasNextPage: boolean;
    paginationContext?: string;
    error?: string;
  }> {
    if (!this.page) {
      return { products: [], totalCount: 0, hasNextPage: false, error: "No page" };
    }

    return await this.page.evaluate(
      async (q, o, pCtx) => {
        const headers: Record<string, string> = {
          accept: "application/json",
          "x-myntraweb": "Yes",
          "x-location-context": "pincode=110002;source=IP",
        };
        if (pCtx) headers["pagination-context"] = pCtx;

        try {
          const res = await fetch(
            `https://www.myntra.com/gateway/v4/search/${q}?rows=50&o=${o}&sort=new&p=${Math.floor(o / 50) + 1}`,
            { headers }
          );

          const newPCtx = res.headers.get("pagination-context");
          const text = await res.text();

          if (text.startsWith("<")) {
            return { products: [], totalCount: 0, hasNextPage: false, error: "blocked" };
          }

          const data = JSON.parse(text);

          return {
            products: (data.products || []).map((p: any) => ({
              productId: p.productId || p.styleId,
              productName: p.productName,
              brand: p.brand,
              mrp: p.mrp,
              price: p.price,
              rating: p.rating || 0,
              ratingCount: p.ratingCount || 0,
              discount: p.discount || 0,
              catalogDate: p.catalogDate,
              gender: p.gender,
              articleType: p.articleType?.typeName || p.articleType,
              primaryColour: p.primaryColour,
              searchImage: p.searchImage,
            })),
            totalCount: data.totalCount || 0,
            hasNextPage: data.hasNextPage,
            paginationContext: newPCtx || undefined,
          };
        } catch (e: any) {
          return { products: [], totalCount: 0, hasNextPage: false, error: e.message };
        }
      },
      slug,
      offset,
      paginationContext
    );
  }

  /**
   * Crawl a category and push products to queue
   */
  async crawlCategory(slug: string, maxPages = 100): Promise<CrawlerResult> {
    this.log(`Starting ${slug}`);

    // Update category status
    await db
      .update(categories)
      .set({ status: "crawling" })
      .where(eq(categories.slug, slug));

    // Get newest product we already have for this category
    const [newest] = await db
      .select({ catalogDateMs: products.catalogDateMs })
      .from(products)
      .where(eq(products.categorySlug, slug))
      .orderBy(desc(products.catalogDateMs))
      .limit(1);

    const lastCatalogDate = newest?.catalogDateMs || 0;

    let fetched = 0;
    let queued = 0;
    let skipped = 0;
    let pageNum = 1;
    let paginationContext: string | null = null;
    let shouldStop = false;

    while (!shouldStop && pageNum <= maxPages) {
      const offset = (pageNum - 1) * 50;
      const result = await this.fetchPage(slug, offset, paginationContext);

      if (result.error === "blocked") {
        this.log(`Blocked, waiting 5s...`, "warning");
        await new Promise((r) => setTimeout(r, 5000));
        continue;
      }

      if (result.error) {
        this.log(`Error: ${result.error}`, "error");
        break;
      }

      paginationContext = result.paginationContext || null;

      for (const p of result.products) {
        const catalogDate = typeof p.catalogDate === "string"
          ? parseInt(p.catalogDate)
          : (p.catalogDate || 0);

        // Stop if we've reached products we already have
        if (catalogDate <= lastCatalogDate && lastCatalogDate > 0) {
          shouldStop = true;
          break;
        }

        fetched++;

        // Check if product already exists
        const [existing] = await db
          .select({ id: products.id })
          .from(products)
          .where(eq(products.id, p.productId));

        if (existing) {
          skipped++;
          continue;
        }

        // Save product with basic data
        const now = Date.now();
        const daysSinceListing = catalogDate > 0
          ? Math.floor((now - catalogDate) / (1000 * 60 * 60 * 24))
          : null;

        await db.insert(products).values({
          id: p.productId,
          name: p.productName,
          brand: p.brand || "Unknown",
          categorySlug: slug,
          mrp: p.mrp,
          price: p.price,
          discount: p.mrp > p.price ? p.mrp - p.price : 0,
          discountPercent: p.mrp > 0 ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0,
          rating: p.rating,
          ratingCount: p.ratingCount,
          catalogDateMs: catalogDate,
          daysSinceListing,
          gender: p.gender,
          articleType: p.articleType,
          primaryColour: p.primaryColour,
          searchImage: p.searchImage,
          status: "pending",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        // Push to enricher queue immediately
        await db.insert(productQueue).values({
          styleId: p.productId,
          categorySlug: slug,
          action: "enrich",
          status: "pending",
          createdAt: new Date().toISOString(),
        });

        queued++;
      }

      this.log(`  Page ${pageNum}: ${fetched} fetched, ${queued} queued`);

      if (!result.hasNextPage || result.products.length === 0) {
        break;
      }

      pageNum++;
      await new Promise((r) => setTimeout(r, 100));
    }

    // Update category status
    await db
      .update(categories)
      .set({
        status: "complete",
        previousCount: await this.getProductCount(slug),
      })
      .where(eq(categories.slug, slug));

    await this.logAction("crawl_complete", slug, { fetched, queued, skipped });

    this.log(`Complete: ${fetched} fetched, ${queued} queued, ${skipped} skipped`);

    return { category: slug, fetched, queued, skipped };
  }

  /**
   * Get product count for a category
   */
  private async getProductCount(slug: string): Promise<number> {
    const result = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.categorySlug, slug));
    return result.length;
  }

  /**
   * Crawl multiple categories (smallest first)
   */
  async crawlSmallestFirst(limit = 5): Promise<CrawlerResult[]> {
    const cats = await db
      .select()
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(asc(categories.productCount))
      .limit(limit);

    const results: CrawlerResult[] = [];

    for (const cat of cats) {
      try {
        const result = await this.crawlCategory(cat.slug);
        results.push(result);
      } catch (error) {
        this.log(`Failed ${cat.slug}: ${error}`, "error");
      }
    }

    return results;
  }
}

// CLI runner
if (import.meta.url === `file://${process.argv[1]}`) {
  const crawler = new Crawler();
  const args = process.argv.slice(2);

  (async () => {
    try {
      await crawler.initialize();

      if (args.length > 0) {
        // Crawl specific category
        for (const slug of args) {
          await crawler.crawlCategory(slug);
        }
      } else {
        // Crawl smallest categories
        console.log("\n=== Crawling Smallest Categories ===\n");
        const results = await crawler.crawlSmallestFirst(3);

        console.log("\n" + "=".repeat(50));
        console.log("CRAWL COMPLETE");
        console.log("=".repeat(50));
        for (const r of results) {
          console.log(`  ${r.category}: ${r.queued} queued`);
        }
      }
    } catch (error) {
      console.error("Crawler error:", error);
    } finally {
      await crawler.close();
    }
  })();
}

export default Crawler;
