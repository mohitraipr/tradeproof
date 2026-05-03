/**
 * Style ID Collector
 *
 * Purpose: Collect style IDs from ALL clothing categories using both popularity and new sort.
 *
 * Strategy:
 * - For each clothing category:
 *   - Fetch 500 style IDs sorted by popularity (10 pages × 50)
 *   - Fetch 100 style IDs sorted by new (2 pages × 50)
 *   - Deduplicate and save to styleIdQueue table
 *
 * After collection, run enricher and ranker on all collected IDs.
 */

import puppeteer, { Browser, Page } from "puppeteer";
import { db } from "../db/index.js";
import { categories, styleIdQueue, agentLogs, products } from "../db/schema.js";
import { eq, sql, and, inArray } from "drizzle-orm";

// Clothing category paths to include (specific paths, not top-level)
const CLOTHING_PATHS = [
  "Men > Topwear",
  "Men > Bottomwear",
  "Men > Indian & Festive Wear",
  "Men > Innerwear & Sleepwear",
  "Men > Sportswear",
  "Women > Western Wear",
  "Women > Ethnic Wear",
  "Women > Lingerie & Sleepwear",
  "Women > Plus Size",
  "Women > Maternity",
  "Women > Sportswear",
  "Kids > Boys Clothing",
  "Kids > Girls Clothing",
  "Kids > Infants",
];

// Non-clothing categories to exclude
const EXCLUDED_SLUGS = [
  "accessories",
  "jewellery",
  "watches",
  "bags",
  "footwear",
  "beauty",
  "home",
  "gadgets",
  "sports",
  "fragrance",
  "personal-care",
  "sunglasses",
  "belts",
  "wallets",
  "headwear",
  "ties",
  "socks",
  "caps",
  "gloves",
  "shoe-care",
  "shoe-accessories",
  "bag-accessories",
  "travel-accessories",
  "eyewear",
];

interface CollectorResult {
  category: string;
  popularityCount: number;
  newCount: number;
  uniqueCount: number;
  alreadyInDb: number;
}

export class StyleIdCollector {
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
    const prefix =
      level === "warning" ? "⚠️" : level === "error" ? "❌" : level === "success" ? "✅" : "→";
    console.log(`[Collector] ${prefix} ${msg}`);
  }

  /**
   * Check if a category is clothing-related
   */
  private isClothingCategory(cat: { path: string | null; slug: string }): boolean {
    const path = cat.path || "";
    const slug = cat.slug.toLowerCase();

    // Check if excluded
    if (EXCLUDED_SLUGS.some((ex) => slug.includes(ex))) {
      return false;
    }

    // Check if path matches clothing paths
    return CLOTHING_PATHS.some((p) => path === p || path.startsWith(p + " > "));
  }

  /**
   * Get all clothing categories from database
   */
  async getClothingCategories(): Promise<{ slug: string; name: string; path: string | null }[]> {
    const allCats = await db
      .select({ slug: categories.slug, name: categories.name, path: categories.path })
      .from(categories)
      .where(eq(categories.isActive, true));

    const clothingCats = allCats.filter((cat) => this.isClothingCategory(cat));
    this.log(`Found ${clothingCats.length} clothing categories out of ${allCats.length} total`);
    return clothingCats;
  }

  /**
   * Fetch style IDs from a category page
   */
  private async fetchStyleIds(
    slug: string,
    sort: "popularity" | "new",
    limit: number
  ): Promise<number[]> {
    if (!this.page) {
      throw new Error("Browser not initialized");
    }

    const styleIds: number[] = [];
    const pages = Math.ceil(limit / 50);

    for (let pageNum = 1; pageNum <= pages; pageNum++) {
      const offset = (pageNum - 1) * 50;

      const result = await this.page.evaluate(
        async (q, o, s, p) => {
          try {
            const res = await fetch(
              `https://www.myntra.com/gateway/v4/search/${q}?rows=50&o=${o}&sort=${s}&p=${p}`,
              {
                headers: {
                  accept: "application/json",
                  "x-myntraweb": "Yes",
                  "x-location-context": "pincode=110002;source=IP",
                },
              }
            );

            const text = await res.text();
            if (text.startsWith("<")) {
              return { ids: [], error: "blocked" };
            }

            const data = JSON.parse(text);
            const ids = (data.products || []).map((p: any) => p.productId || p.styleId);
            return { ids, totalCount: data.totalCount || 0 };
          } catch (e: any) {
            return { ids: [], error: e.message };
          }
        },
        slug,
        offset,
        sort,
        pageNum
      );

      if (result.error) {
        this.log(`Page ${pageNum} error: ${result.error}`, "warning");
        if (result.error === "blocked") {
          await new Promise((r) => setTimeout(r, 5000));
        }
        continue;
      }

      styleIds.push(...result.ids);

      // Rate limiting
      await new Promise((r) => setTimeout(r, 300));
    }

    return styleIds.slice(0, limit);
  }

  /**
   * Collect style IDs for a single category
   */
  async collectCategory(slug: string): Promise<CollectorResult> {
    this.log(`Collecting ${slug}...`);

    // Fetch 500 from popularity
    const popularityIds = await this.fetchStyleIds(slug, "popularity", 500);
    this.log(`  Popularity: ${popularityIds.length} IDs`);

    // Fetch 100 from new
    const newIds = await this.fetchStyleIds(slug, "new", 100);
    this.log(`  New: ${newIds.length} IDs`);

    // Deduplicate
    const allIds = [...new Set([...popularityIds, ...newIds])];
    this.log(`  Unique: ${allIds.length} IDs`);

    // Check which ones already exist in products table
    const existingProducts = await db
      .select({ id: products.id })
      .from(products)
      .where(inArray(products.id, allIds));
    const existingIds = new Set(existingProducts.map((p) => p.id));

    // Check which ones already exist in queue
    const existingQueue = await db
      .select({ styleId: styleIdQueue.styleId })
      .from(styleIdQueue)
      .where(inArray(styleIdQueue.styleId, allIds));
    const queuedIds = new Set(existingQueue.map((q) => q.styleId));

    // Filter to only new IDs
    const newStyleIds = allIds.filter((id) => !existingIds.has(id) && !queuedIds.has(id));

    // Insert into queue
    if (newStyleIds.length > 0) {
      const now = new Date().toISOString();
      const values = newStyleIds.map((styleId, index) => ({
        styleId,
        categorySlug: slug,
        source: index < popularityIds.length ? "popularity" : "new",
        sourceRank: index + 1,
        status: "pending",
        createdAt: now,
      }));

      // Insert in batches of 100
      for (let i = 0; i < values.length; i += 100) {
        const batch = values.slice(i, i + 100);
        await db.insert(styleIdQueue).values(batch).onConflictDoNothing();
      }
    }

    this.log(
      `  Saved ${newStyleIds.length} new IDs (${existingIds.size} already in DB, ${queuedIds.size} already in queue)`,
      "success"
    );

    return {
      category: slug,
      popularityCount: popularityIds.length,
      newCount: newIds.length,
      uniqueCount: allIds.length,
      alreadyInDb: existingIds.size + queuedIds.size,
    };
  }

  /**
   * Collect style IDs from all clothing categories
   */
  async collectAll(): Promise<{
    totalCategories: number;
    totalStyleIds: number;
    results: CollectorResult[];
  }> {
    await this.initialize();

    const clothingCategories = await this.getClothingCategories();
    const results: CollectorResult[] = [];
    let totalNew = 0;

    this.log(`\n${"=".repeat(60)}`);
    this.log(`Starting collection for ${clothingCategories.length} categories`);
    this.log(`${"=".repeat(60)}\n`);

    for (let i = 0; i < clothingCategories.length; i++) {
      const cat = clothingCategories[i];
      this.log(`\n[${i + 1}/${clothingCategories.length}] ${cat.name} (${cat.slug})`);

      try {
        const result = await this.collectCategory(cat.slug);
        results.push(result);
        totalNew += result.uniqueCount - result.alreadyInDb;
      } catch (error: any) {
        this.log(`Error: ${error.message}`, "error");
        results.push({
          category: cat.slug,
          popularityCount: 0,
          newCount: 0,
          uniqueCount: 0,
          alreadyInDb: 0,
        });
      }

      // Longer pause between categories
      if (i < clothingCategories.length - 1) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    await this.close();

    // Log summary
    await db.insert(agentLogs).values({
      agent: "style-id-collector",
      action: "collect_all",
      details: {
        totalCategories: clothingCategories.length,
        totalNewStyleIds: totalNew,
        categorySummary: results.map((r) => ({
          slug: r.category,
          unique: r.uniqueCount,
          new: r.uniqueCount - r.alreadyInDb,
        })),
      },
      status: "success",
      createdAt: new Date().toISOString(),
    });

    // Get total in queue
    const [queueCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(styleIdQueue)
      .where(eq(styleIdQueue.status, "pending"));

    this.log(`\n${"=".repeat(60)}`);
    this.log(`Collection complete!`);
    this.log(`  Categories processed: ${clothingCategories.length}`);
    this.log(`  New style IDs added: ${totalNew}`);
    this.log(`  Total pending in queue: ${queueCount?.count || 0}`);
    this.log(`${"=".repeat(60)}\n`);

    return {
      totalCategories: clothingCategories.length,
      totalStyleIds: totalNew,
      results,
    };
  }

  /**
   * Get queue stats
   */
  async getQueueStats(): Promise<{ pending: number; enriched: number; failed: number }> {
    const stats = await db
      .select({
        status: styleIdQueue.status,
        count: sql<number>`count(*)`,
      })
      .from(styleIdQueue)
      .groupBy(styleIdQueue.status);

    const result = { pending: 0, enriched: 0, failed: 0 };
    for (const row of stats) {
      if (row.status === "pending") result.pending = row.count;
      if (row.status === "enriched") result.enriched = row.count;
      if (row.status === "failed") result.failed = row.count;
    }
    return result;
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const collector = new StyleIdCollector();

  (async () => {
    const args = process.argv.slice(2);

    if (args.includes("--stats")) {
      const stats = await collector.getQueueStats();
      console.log("\nQueue Stats:");
      console.log(`  Pending: ${stats.pending}`);
      console.log(`  Enriched: ${stats.enriched}`);
      console.log(`  Failed: ${stats.failed}`);
      process.exit(0);
    }

    // Single category mode
    if (args.length > 0 && !args[0].startsWith("--")) {
      const slug = args[0];
      await collector.initialize();
      const result = await collector.collectCategory(slug);
      await collector.close();
      console.log("\nResult:", result);
      process.exit(0);
    }

    // Full collection mode
    console.log("\n=== Style ID Collector ===\n");
    console.log("This will collect 600 style IDs per clothing category.");
    console.log("(500 from popularity + 100 from new, deduplicated)\n");

    const result = await collector.collectAll();
    console.log("\nFinal Results:");
    console.log(`  Total categories: ${result.totalCategories}`);
    console.log(`  Total new style IDs: ${result.totalStyleIds}`);
  })();
}

export default StyleIdCollector;
