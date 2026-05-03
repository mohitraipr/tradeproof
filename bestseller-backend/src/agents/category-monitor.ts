/**
 * Agent 0: Category Count Monitor
 *
 * Purpose: Track product counts per category, detect new products.
 *
 * Process:
 * 1. Load categories from JSON file
 * 2. Fetch current product count from Myntra API
 * 3. Compare with stored count
 * 4. If changed, mark for crawling
 *
 * Self-healing:
 * - Retry on API block
 * - Skip invalid categories
 * - Log anomalies (count decreased)
 */

import puppeteer, { Browser, Page } from "puppeteer";
import { readFileSync, existsSync } from "fs";
import { db } from "../db/index.js";
import { categories, agentLogs } from "../db/schema.js";
import { eq, asc } from "drizzle-orm";

const CATEGORIES_FILE = "/Users/mohitrai/Library/CloudStorage/OneDrive-Personal/Personal/idk/data/all-categories-full.json";

// Clothing-related paths (include these)
const CLOTHING_PATHS = [
  "Men",
  "Women",
  "Kids",
  "Men > Topwear",
  "Men > Bottomwear",
  "Men > Indian & Festive Wear",
  "Men > Innerwear & Sleepwear",
  "Women > Western Wear",
  "Women > Ethnic Wear",
  "Women > Lingerie & Sleepwear",
  "Women > Plus Size",
  "Kids > Boys Clothing",
  "Kids > Girls Clothing",
];

// Exclude these categories (not clothing)
const EXCLUDED_SLUGS = [
  "accessories", "jewellery", "watches", "bags", "footwear",
  "beauty", "home", "gadgets", "sports", "fragrance",
  "personal-care", "sunglasses", "belts", "wallets",
];

interface CategoryData {
  title: string;
  url: string;
  path: string;
}

export class CategoryMonitor {
  private browser: Browser | null = null;
  private page: Page | null = null;

  /**
   * Load clothing categories from JSON
   */
  loadCategories(): CategoryData[] {
    if (!existsSync(CATEGORIES_FILE)) {
      throw new Error(`Categories file not found: ${CATEGORIES_FILE}`);
    }

    const data = JSON.parse(readFileSync(CATEGORIES_FILE, "utf-8"));
    const allCategories: CategoryData[] = data.categories || [];

    const clothingCategories = allCategories.filter((cat) => {
      const isClothingPath = CLOTHING_PATHS.some(
        (p) => cat.path === p || cat.path.startsWith(p + " > ")
      );
      const slug = cat.url.replace("/", "").toLowerCase();
      const isExcluded = EXCLUDED_SLUGS.some((ex) => slug.includes(ex));
      return isClothingPath && !isExcluded;
    });

    return clothingCategories;
  }

  /**
   * Initialize browser
   */
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

  /**
   * Close browser
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  /**
   * Get slug from URL
   */
  private getSlug(url: string): string {
    return url.replace(/^\//, "").split("?")[0];
  }

  /**
   * Fetch product count for a category
   */
  async fetchCount(slug: string, retries = 3): Promise<number | null> {
    if (!this.page) return null;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const result = await this.page.evaluate(async (q) => {
          const res = await fetch(
            `https://www.myntra.com/gateway/v4/search/${q}?rows=1&o=0`,
            {
              headers: {
                accept: "application/json",
                "x-myntraweb": "Yes",
              },
            }
          );
          const text = await res.text();
          if (text.startsWith("<")) return { error: "blocked" };
          const data = JSON.parse(text);
          return { count: data.totalCount || 0 };
        }, slug);

        if (result.error === "blocked") {
          this.log(`  Blocked on ${slug}, waiting...`, "warning");
          await new Promise((r) => setTimeout(r, 5000));
          continue;
        }

        return result.count;
      } catch (e) {
        if (attempt === retries) return null;
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
    return null;
  }

  /**
   * Log agent action
   */
  private async logAction(
    action: string,
    categorySlug?: string,
    details?: Record<string, any>,
    status: string = "success",
    error?: string
  ) {
    await db.insert(agentLogs).values({
      agent: "monitor",
      action,
      categorySlug,
      details,
      status,
      errorMessage: error,
      createdAt: new Date().toISOString(),
    });
  }

  private log(msg: string, level: string = "info") {
    const prefix = level === "warning" ? "⚠️" : level === "error" ? "❌" : "→";
    console.log(`[Monitor] ${prefix} ${msg}`);
  }

  /**
   * Sync all categories - fetch counts and detect changes
   */
  async syncCategories(): Promise<{
    total: number;
    changed: number;
    categories: { slug: string; name: string; count: number; diff: number }[];
  }> {
    const categoryList = this.loadCategories();
    this.log(`Loaded ${categoryList.length} clothing categories`);

    const changed: { slug: string; name: string; count: number; diff: number }[] = [];
    let processed = 0;

    for (const cat of categoryList) {
      const slug = this.getSlug(cat.url);
      const count = await this.fetchCount(slug);

      if (count === null) {
        this.log(`  Failed to fetch ${slug}`, "error");
        continue;
      }

      // Get existing category
      const [existing] = await db
        .select()
        .from(categories)
        .where(eq(categories.slug, slug));

      const previousCount = existing?.productCount || 0;
      const diff = count - previousCount;

      // Upsert category
      await db
        .insert(categories)
        .values({
          slug,
          name: cat.title,
          path: cat.path,
          url: cat.url,
          productCount: count,
          previousCount,
          lastCheckedAt: new Date().toISOString(),
          lastChangedAt: diff !== 0 ? new Date().toISOString() : existing?.lastChangedAt,
          status: "idle",
          isActive: true,
        })
        .onConflictDoUpdate({
          target: categories.slug,
          set: {
            productCount: count,
            previousCount,
            lastCheckedAt: new Date().toISOString(),
            lastChangedAt: diff !== 0 ? new Date().toISOString() : existing?.lastChangedAt,
          },
        });

      processed++;

      if (diff > 0) {
        changed.push({ slug, name: cat.title, count, diff });
        this.log(`  ${cat.title}: ${count} (+${diff} new)`);
      } else if (diff < 0) {
        this.log(`  ${cat.title}: ${count} (${diff} - anomaly)`, "warning");
        await this.logAction("count_decreased", slug, { previousCount, count, diff }, "warning");
      } else {
        // No change, just log every 10th
        if (processed % 10 === 0) {
          this.log(`  Processed ${processed}/${categoryList.length}...`);
        }
      }

      // Rate limit
      await new Promise((r) => setTimeout(r, 100));
    }

    await this.logAction("sync_complete", undefined, {
      total: processed,
      changed: changed.length,
    });

    return { total: processed, changed: changed.length, categories: changed };
  }

  /**
   * Get categories sorted by product count (smallest first)
   */
  async getCategoriesBySize(): Promise<{ slug: string; name: string; count: number }[]> {
    const result = await db
      .select({
        slug: categories.slug,
        name: categories.name,
        count: categories.productCount,
      })
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(asc(categories.productCount));

    return result.map((r) => ({
      slug: r.slug,
      name: r.name || r.slug,
      count: r.count || 0,
    }));
  }

  /**
   * Get categories with changes (new products)
   */
  async getCategoriesWithChanges(): Promise<{ slug: string; name: string; newCount: number }[]> {
    const result = await db
      .select()
      .from(categories)
      .where(eq(categories.isActive, true));

    return result
      .filter((c) => (c.productCount || 0) > (c.previousCount || 0))
      .map((c) => ({
        slug: c.slug,
        name: c.name || c.slug,
        newCount: (c.productCount || 0) - (c.previousCount || 0),
      }))
      .sort((a, b) => a.newCount - b.newCount); // Smallest changes first
  }
}

// CLI runner
if (import.meta.url === `file://${process.argv[1]}`) {
  const monitor = new CategoryMonitor();

  (async () => {
    try {
      await monitor.initialize();
      console.log("\n=== Syncing Category Counts ===\n");
      const result = await monitor.syncCategories();

      console.log("\n" + "=".repeat(50));
      console.log("SYNC COMPLETE");
      console.log("=".repeat(50));
      console.log(`Total categories: ${result.total}`);
      console.log(`Categories with changes: ${result.changed}`);

      if (result.categories.length > 0) {
        console.log("\nCategories with new products:");
        for (const cat of result.categories.slice(0, 10)) {
          console.log(`  ${cat.name}: +${cat.diff} (total: ${cat.count})`);
        }
      }

      // Show smallest categories
      console.log("\n=== Smallest Categories (for testing) ===");
      const smallest = await monitor.getCategoriesBySize();
      for (const cat of smallest.slice(0, 10)) {
        console.log(`  ${cat.name}: ${cat.count} products`);
      }
    } catch (error) {
      console.error("Monitor error:", error);
    } finally {
      await monitor.close();
    }
  })();
}

export default CategoryMonitor;
