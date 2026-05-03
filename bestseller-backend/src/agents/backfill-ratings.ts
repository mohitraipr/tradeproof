/**
 * Backfill Ratings
 *
 * Fetches rating/price data from search API for products missing this data
 */

import puppeteer, { Browser, Page } from "puppeteer";
import { db } from "../db/index.js";
import { products, styleIdQueue } from "../db/schema.js";
import { eq, sql, isNull, and, inArray } from "drizzle-orm";

class RatingBackfiller {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private processed = 0;
  private updated = 0;

  async initialize(): Promise<void> {
    console.log("[Backfill] Launching browser...");
    this.browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    this.page = await this.browser.newPage();
    await this.page.goto("https://www.myntra.com", { waitUntil: "domcontentloaded", timeout: 30000 });
    await new Promise((r) => setTimeout(r, 1000));
    console.log("[Backfill] Browser ready");
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async fetchCategoryProducts(slug: string, limit: number = 500): Promise<Map<number, any>> {
    if (!this.page) return new Map();

    const productMap = new Map<number, any>();
    const pages = Math.ceil(limit / 50);

    for (let pageNum = 1; pageNum <= pages; pageNum++) {
      const offset = (pageNum - 1) * 50;

      const result = await this.page.evaluate(
        async (q, o, p) => {
          try {
            const res = await fetch(
              `https://www.myntra.com/gateway/v4/search/${q}?rows=50&o=${o}&sort=popularity&p=${p}`,
              {
                headers: {
                  accept: "application/json",
                  "x-myntraweb": "Yes",
                },
              }
            );
            const text = await res.text();
            if (text.startsWith("<")) return { products: [], error: "blocked" };
            const data = JSON.parse(text);
            return {
              products: (data.products || []).map((p: any) => ({
                id: p.productId || p.styleId,
                rating: p.rating,
                ratingCount: p.ratingCount,
                price: p.price,
                mrp: p.mrp,
                discount: p.discount,
                discountPercent: p.discountDisplayLabel ? parseInt(p.discountDisplayLabel) : null,
                searchImage: p.searchImage,
              })),
            };
          } catch (e: any) {
            return { products: [], error: e.message };
          }
        },
        slug,
        offset,
        pageNum
      );

      for (const p of result.products) {
        productMap.set(p.id, p);
      }

      await new Promise((r) => setTimeout(r, 300));
    }

    return productMap;
  }

  async backfillCategory(categorySlug: string): Promise<{ updated: number; total: number }> {
    console.log(`[Backfill] Processing ${categorySlug}...`);

    // Get products in this category missing ratings
    const missingRatings = await db
      .select({ id: products.id })
      .from(products)
      .where(
        and(
          eq(products.categorySlug, categorySlug),
          isNull(products.rating)
        )
      );

    if (missingRatings.length === 0) {
      console.log(`[Backfill]   No products missing ratings`);
      return { updated: 0, total: 0 };
    }

    console.log(`[Backfill]   ${missingRatings.length} products missing ratings`);

    // Fetch from search API
    const searchData = await this.fetchCategoryProducts(categorySlug, 600);
    console.log(`[Backfill]   Fetched ${searchData.size} products from search API`);

    let updated = 0;
    const missingIds = new Set(missingRatings.map((p) => p.id));

    for (const [id, data] of searchData) {
      if (missingIds.has(id) && data.rating !== undefined) {
        await db
          .update(products)
          .set({
            rating: data.rating,
            ratingCount: data.ratingCount,
            price: data.price,
            mrp: data.mrp,
            discount: data.discount,
            discountPercent: data.discountPercent || (data.mrp && data.price ? Math.round(((data.mrp - data.price) / data.mrp) * 100) : null),
            searchImage: data.searchImage,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(products.id, id));
        updated++;
      }
    }

    console.log(`[Backfill]   Updated ${updated}/${missingRatings.length} products`);
    return { updated, total: missingRatings.length };
  }

  async backfillAll(): Promise<void> {
    await this.initialize();

    // Get all categories with products missing ratings
    const categoriesWithMissing = await db
      .selectDistinct({ categorySlug: products.categorySlug })
      .from(products)
      .where(isNull(products.rating));

    console.log(`\n[Backfill] Found ${categoriesWithMissing.length} categories with missing ratings\n`);

    let totalUpdated = 0;
    let totalMissing = 0;

    for (let i = 0; i < categoriesWithMissing.length; i++) {
      const cat = categoriesWithMissing[i];
      if (!cat.categorySlug) continue;

      console.log(`\n[${i + 1}/${categoriesWithMissing.length}]`);
      const result = await this.backfillCategory(cat.categorySlug);
      totalUpdated += result.updated;
      totalMissing += result.total;

      // Pause between categories
      await new Promise((r) => setTimeout(r, 1000));
    }

    await this.close();

    console.log(`\n${"=".repeat(50)}`);
    console.log(`[Backfill] Complete!`);
    console.log(`  Total updated: ${totalUpdated}`);
    console.log(`  Total missing: ${totalMissing}`);
    console.log(`${"=".repeat(50)}\n`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const backfiller = new RatingBackfiller();
  backfiller.backfillAll().catch(console.error);
}

export default RatingBackfiller;
