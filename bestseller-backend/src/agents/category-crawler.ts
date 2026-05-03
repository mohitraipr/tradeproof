/**
 * Agent 1: Category Crawler
 *
 * Fetches style IDs from Myntra categories.
 * - Loads categories from idk/data/all-categories-full.json
 * - Filters to clothing categories only
 * - Sorts by product count (lowest first for testing)
 * - Uses ?sort=new to get newest products first
 * - Filters: new products (< 2 months) OR rating >= 4.0
 * - Skips variants (relatedStylesCount > 0)
 */

import puppeteer, { Browser, Page } from "puppeteer";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { db, products, categories, crawlerState } from "../db/index.js";
import { eq } from "drizzle-orm";

// Path to category data
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
];

// Constants
const TWO_MONTHS_MS = 60 * 24 * 60 * 60 * 1000;

interface MyntraCategory {
  title: string;
  url: string;
  path: string;
}

interface MyntraProduct {
  productId: number;
  productName: string;
  brand: string;
  mrp: number;
  price: number;
  rating: number;
  ratingCount: number;
  discount: number;
  catalogDate?: number;
  gender?: string;
  articleType?: string;
  primaryColour?: string;
  searchImage?: string;
  relatedStylesCount?: number;
}

interface CrawlResult {
  category: string;
  slug: string;
  newProducts: number;
  skipped: number;
  totalScanned: number;
}

export class CategoryCrawler {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private categories: MyntraCategory[] = [];

  /**
   * Load and filter clothing categories
   */
  loadCategories(): MyntraCategory[] {
    if (!existsSync(CATEGORIES_FILE)) {
      throw new Error(`Categories file not found: ${CATEGORIES_FILE}`);
    }

    const data = JSON.parse(readFileSync(CATEGORIES_FILE, "utf-8"));
    const allCategories: MyntraCategory[] = data.categories || [];

    // Filter to clothing categories
    const clothingCategories = allCategories.filter((cat) => {
      // Check if path starts with clothing paths
      const isClothingPath = CLOTHING_PATHS.some(
        (p) => cat.path === p || cat.path.startsWith(p + " > ")
      );

      // Check if slug contains excluded terms
      const slug = cat.url.replace("/", "").toLowerCase();
      const isExcluded = EXCLUDED_SLUGS.some((ex) => slug.includes(ex));

      return isClothingPath && !isExcluded;
    });

    console.log(`[Crawler] Loaded ${clothingCategories.length} clothing categories`);
    this.categories = clothingCategories;
    return clothingCategories;
  }

  /**
   * Initialize browser
   */
  async initialize(): Promise<void> {
    console.log("[Crawler] Launching browser...");
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

    // Navigate to Myntra to establish session
    await this.page.goto("https://www.myntra.com", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await new Promise((r) => setTimeout(r, 2000));
    console.log("[Crawler] Browser ready");
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
   * Extract slug from URL
   */
  private getSlug(url: string): string {
    return url.replace(/^\//, "").split("?")[0];
  }

  /**
   * Fetch a single page of products
   */
  private async fetchPage(
    slug: string,
    offset: number,
    paginationContext: string | null
  ): Promise<{
    products: MyntraProduct[];
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

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        try {
          // Use sort=new for newest first
          const url = `https://www.myntra.com/gateway/v4/search/${q}?rows=50&o=${o}&sort=new&p=${Math.floor(o / 50) + 1}`;
          const res = await fetch(url, { headers, signal: controller.signal });
          clearTimeout(timeoutId);

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
              relatedStylesCount: p.relatedStylesCount || 0,
            })),
            totalCount: data.totalCount || 0,
            hasNextPage: data.hasNextPage,
            paginationContext: newPCtx || undefined,
          };
        } catch (e: any) {
          clearTimeout(timeoutId);
          return { products: [], totalCount: 0, hasNextPage: false, error: e.message };
        }
      },
      slug,
      offset,
      paginationContext
    );
  }

  /**
   * Crawl a single category
   */
  async crawlCategory(
    category: MyntraCategory,
    options: { maxPages?: number; onProgress?: (msg: string) => void } = {}
  ): Promise<CrawlResult> {
    const { maxPages = 20, onProgress } = options;
    const slug = this.getSlug(category.url);

    onProgress?.(`Starting ${category.title} (${slug})`);

    // Get last crawl state
    const [state] = await db
      .select()
      .from(crawlerState)
      .where(eq(crawlerState.categorySlug, slug));

    const lastCatalogDate = state?.lastCatalogDate || 0;
    const now = Date.now();
    const twoMonthsAgo = now - TWO_MONTHS_MS;

    const newProducts: MyntraProduct[] = [];
    let totalScanned = 0;
    let skipped = 0;
    let pageNum = 1;
    let paginationContext: string | null = null;
    let shouldStop = false;
    let newestCatalogDate = lastCatalogDate;

    while (!shouldStop && pageNum <= maxPages) {
      const offset = (pageNum - 1) * 50;

      const result = await this.fetchPage(slug, offset, paginationContext);

      if (result.error === "blocked") {
        onProgress?.(`⚠️ Blocked on ${slug}, refreshing...`);
        // Session expired, need to refresh
        break;
      }

      if (result.error) {
        onProgress?.(`Error: ${result.error}`);
        break;
      }

      paginationContext = result.paginationContext || null;

      for (const product of result.products) {
        totalScanned++;
        // Parse catalogDate as number (comes as string from API)
        const catalogDate = typeof product.catalogDate === 'string'
          ? parseInt(product.catalogDate)
          : (product.catalogDate || 0);

        // Track newest catalog date
        if (catalogDate > newestCatalogDate) {
          newestCatalogDate = catalogDate;
        }

        // Stop if we've reached products we've already seen
        if (catalogDate <= lastCatalogDate && lastCatalogDate > 0) {
          shouldStop = true;
          break;
        }

        // Skip variants (only get main style)
        if (product.relatedStylesCount > 0) {
          skipped++;
          continue;
        }

        // Filter: new OR high rating
        const isNew = catalogDate > twoMonthsAgo;
        const hasGoodRating = (product.rating || 0) >= 4.0;

        if (isNew || hasGoodRating) {
          newProducts.push({
            ...product,
            catalogDate, // Store as number
          });
        } else {
          skipped++;
        }
      }

      onProgress?.(`  Page ${pageNum}: ${newProducts.length} new, ${skipped} skipped`);

      if (!result.hasNextPage || result.products.length === 0) {
        break;
      }

      pageNum++;
      await new Promise((r) => setTimeout(r, 100)); // Rate limit
    }

    // Update crawler state
    await db
      .insert(crawlerState)
      .values({
        categorySlug: slug,
        lastCatalogDate: newestCatalogDate,
        lastRun: new Date().toISOString(),
        totalFetched: newProducts.length,
        status: "completed",
      })
      .onConflictDoUpdate({
        target: crawlerState.categorySlug,
        set: {
          lastCatalogDate: newestCatalogDate,
          lastRun: new Date().toISOString(),
          totalFetched: newProducts.length,
          status: "completed",
        },
      });

    // Save products to database
    let saved = 0;
    for (const p of newProducts) {
      try {
        if (!p.productId || !p.productName) continue;
        const discount = p.mrp > p.price ? p.mrp - p.price : 0;
        const discountPercent = p.mrp > 0 ? Math.round((discount / p.mrp) * 100) : 0;

        // Calculate days since listing and velocity
        let daysSinceListing: number | undefined;
        let salesVelocity: number | undefined;
        let catalogDateStr: string | undefined;

        // Validate catalogDate is a valid timestamp
        if (p.catalogDate && p.catalogDate > 1000000000000 && p.catalogDate < 2000000000000) {
          catalogDateStr = new Date(p.catalogDate).toISOString();
          daysSinceListing = Math.floor((now - p.catalogDate) / (1000 * 60 * 60 * 24));
          if (daysSinceListing > 0 && p.ratingCount > 0) {
            salesVelocity = Math.round((p.ratingCount / daysSinceListing) * 100) / 100;
          }
        }

        const insertValues = {
          id: p.productId,
          name: p.productName,
          brand: p.brand || "Unknown",
          category: category.title,
          categorySlug: slug,
          mrp: p.mrp ?? null,
          price: p.price ?? null,
          discount: discount ?? null,
          discountPercent: discountPercent ?? null,
          rating: p.rating ?? null,
          ratingCount: p.ratingCount ?? null,
          catalogDateMs: p.catalogDate ?? null,
          catalogDate: catalogDateStr ?? null,
          daysSinceListing: daysSinceListing ?? null,
          salesVelocity: salesVelocity ?? null,
          gender: p.gender ?? null,
          articleType: p.articleType ?? null,
          colors: p.primaryColour ? [p.primaryColour] : null,
          searchImage: p.searchImage ?? null,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await db
          .insert(products)
          .values(insertValues)
          .onConflictDoNothing();
        saved++;
      } catch (err) {
        // Skip individual product errors
      }
    }

    onProgress?.(`✅ ${category.title}: ${newProducts.length} new products saved`);

    return {
      category: category.title,
      slug,
      newProducts: newProducts.length,
      skipped,
      totalScanned,
    };
  }

  /**
   * Crawl all clothing categories (sorted by size, smallest first)
   */
  async crawlAll(options: { maxCategories?: number; maxPagesPerCategory?: number } = {}) {
    const { maxCategories = 10, maxPagesPerCategory = 20 } = options;

    if (this.categories.length === 0) {
      this.loadCategories();
    }

    // Sort by path depth (leaf categories first)
    const sortedCategories = [...this.categories].sort(
      (a, b) => b.path.split(">").length - a.path.split(">").length
    );

    const categoriesToCrawl = sortedCategories.slice(0, maxCategories);

    console.log(`\n[Crawler] Will crawl ${categoriesToCrawl.length} categories\n`);

    const results: CrawlResult[] = [];

    for (let i = 0; i < categoriesToCrawl.length; i++) {
      const cat = categoriesToCrawl[i];
      console.log(`\n[${i + 1}/${categoriesToCrawl.length}] ${cat.title}`);

      try {
        const result = await this.crawlCategory(cat, {
          maxPages: maxPagesPerCategory,
          onProgress: console.log,
        });
        results.push(result);
      } catch (error) {
        console.error(`Error crawling ${cat.title}:`, error);
      }

      // Rate limit between categories
      if (i < categoriesToCrawl.length - 1) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    // Summary
    const totalNew = results.reduce((sum, r) => sum + r.newProducts, 0);
    console.log("\n" + "=".repeat(50));
    console.log("CRAWL COMPLETE");
    console.log("=".repeat(50));
    console.log(`Categories: ${results.length}`);
    console.log(`New Products: ${totalNew}`);
    console.log("=".repeat(50));

    return results;
  }
}

// CLI runner
if (import.meta.url === `file://${process.argv[1]}`) {
  const crawler = new CategoryCrawler();

  const args = process.argv.slice(2);
  const maxCategories = parseInt(args[0]) || 5;

  (async () => {
    try {
      crawler.loadCategories();
      await crawler.initialize();
      await crawler.crawlAll({ maxCategories, maxPagesPerCategory: 10 });
    } catch (error) {
      console.error("Crawler error:", error);
    } finally {
      await crawler.close();
    }
  })();
}

export default CategoryCrawler;
