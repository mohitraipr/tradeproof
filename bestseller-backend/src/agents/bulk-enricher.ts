/**
 * Bulk Enricher
 *
 * Processes styleIdQueue with:
 * - 6 concurrent browser sessions
 * - Session rotation every 200 requests
 * - Fetches product details and creates/updates products table
 */

import puppeteer, { Browser, Page } from "puppeteer";
import { db } from "../db/index.js";
import { products, styleIdQueue, agentLogs } from "../db/schema.js";
import { eq, sql, and, inArray } from "drizzle-orm";

const CONCURRENCY = 6;
const ROTATE_AFTER = 200;
const DELAY_BETWEEN_REQUESTS = 300; // ms

interface WorkerStats {
  id: number;
  processed: number;
  failed: number;
  sessionRequests: number;
}

class EnrichmentWorker {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private requestCount = 0;
  public stats: WorkerStats;

  constructor(public workerId: number) {
    this.stats = { id: workerId, processed: 0, failed: 0, sessionRequests: 0 };
  }

  private log(msg: string) {
    console.log(`[Worker ${this.workerId}] ${msg}`);
  }

  async initialize(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
        "--disable-dev-shm-usage",
      ],
    });
    this.page = await this.browser.newPage();
    await this.page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );
    await this.page.goto("https://www.myntra.com", { waitUntil: "domcontentloaded", timeout: 30000 });
    await new Promise((r) => setTimeout(r, 1000));
    this.requestCount = 0;
    this.stats.sessionRequests = 0;
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  async rotateSession(): Promise<void> {
    this.log(`Rotating session after ${this.requestCount} requests...`);
    await this.close();
    await new Promise((r) => setTimeout(r, 2000));
    await this.initialize();
    this.log(`New session ready`);
  }

  async fetchProductData(styleId: number): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    if (!this.page) return { success: false, error: "No page" };

    this.requestCount++;
    this.stats.sessionRequests++;

    try {
      const result = await this.page.evaluate(async (id) => {
        try {
          // First fetch basic product info from search API
          const searchRes = await fetch(
            `https://www.myntra.com/gateway/v2/product/${id}`,
            {
              headers: {
                accept: "application/json",
                "x-myntraweb": "Yes",
                "x-location-context": "pincode=110002;source=IP",
              },
            }
          );

          if (searchRes.status === 404) {
            return { success: false, error: "not_found" };
          }

          const text = await searchRes.text();
          if (text.startsWith("<")) {
            return { success: false, error: "blocked" };
          }

          const data = JSON.parse(text);
          const style = data.style || data;

          // Extract price from size seller data (most accurate)
          let discountedPrice = style.price;
          let discountPercent = null;
          const sizes = style.sizes || [];
          for (const size of sizes) {
            if (size.sizeSellerData && size.sizeSellerData.length > 0) {
              const sellerData = size.sizeSellerData[0];
              discountedPrice = sellerData.discountedPrice || discountedPrice;
              if (style.mrp && discountedPrice && style.mrp > 0) {
                discountPercent = Math.round(((style.mrp - discountedPrice) / style.mrp) * 100);
              }
              break;
            }
          }
          if (!discountedPrice) discountedPrice = style.mrp;

          // Extract images from media albums
          const images: string[] = [];
          const defaultAlbum = (style.media?.albums || []).find((a: any) => a?.name === 'default');
          if (defaultAlbum && defaultAlbum.images) {
            defaultAlbum.images.forEach((img: any) => {
              const url = img?.imageURL || img?.secureSrc || img?.src || '';
              if (url) images.push(url);
            });
          }

          // Extract ratings from style.ratings object (CORRECT location)
          const ratings = style.ratings || {};

          // Calculate total inventory and size stats
          const totalInventory = sizes.reduce((sum: number, size: any) => {
            return sum + (size.sizeSellerData || []).reduce((s: number, seller: any) => s + (seller.availableCount || 0), 0);
          }, 0);
          const totalSizes = sizes.length;
          const availableSizesArr = sizes.filter((s: any) => s.available);
          const availableSizesCount = availableSizesArr.length;
          const availablePercentage = totalSizes > 0 ? Math.round((availableSizesCount / totalSizes) * 100) : 0;

          // Extract PDP views from urgency data (CRITICAL demand signal)
          const urgency = style.urgency || [];
          const pdpUrgency = urgency.find((u: any) => u.type === 'PDP') || {};
          const pdpViews = pdpUrgency.value ? Number(pdpUrgency.value) : null;

          // Extract tags (can include Bestseller, Trending, etc.)
          const tags: string[] = [];
          const sysAttrs = style.systemAttributes || [];
          for (const attr of sysAttrs) {
            const valueName = attr?.systemAttributeValueEntry?.valueName;
            if (valueName && valueName !== 'True') tags.push(valueName);
          }
          const tagData = style.tagData?.tagGroupMapList || [];
          for (const group of tagData) {
            const tagInfoList = group?.tagGroup?.tagInfoList || [];
            for (const tagInfo of tagInfoList) {
              if (tagInfo.name && !tags.includes(tagInfo.name)) tags.push(tagInfo.name);
            }
          }

          // Extract color variants
          const colours = style.colours || style.colors || [];
          const groupedStyleIds = colours
            .map((c: any) => c.styleId || c.id)
            .filter((cid: any) => cid && String(cid) !== String(id))
            .map(String);
          const isGrouped = groupedStyleIds.length > 0;
          const colorVariantsCount = colours.length;

          const analytics = style.analytics || {};
          const catalogAttrs = style.catalogAttributes || {};

          return {
            success: true,
            data: {
              // Basic info
              name: style.name || style.productName,
              brand: style.brand?.name || style.brand,
              mrp: style.mrp,
              price: discountedPrice,
              discount: style.mrp - discountedPrice,
              discountPercent: discountPercent || (style.discountDisplayLabel ? parseInt(style.discountDisplayLabel) : null),

              // Ratings - CORRECT extraction from style.ratings object
              rating: ratings.averageRating || style.averageRating || style.rating || null,
              ratingCount: ratings.totalCount || ratings.count || style.ratingCount || null,
              reviewsCount: ratings.reviewsCount || style.reviewsCount || null,

              // Demand signals
              pdpViews: pdpViews,

              // Category info
              gender: analytics.gender || style.gender,
              articleType: analytics.articleType || style.articleType?.typeName || style.articleType,
              subCategory: analytics.subCategory,
              masterCategory: analytics.masterCategory,
              primaryColour: style.baseColour || style.primaryColour,

              // Images
              searchImage: images[0] || style.searchImage,
              images: images,

              // Sizes & Inventory
              sizes: sizes.map((s: any) => s.label),
              availableSizes: availableSizesArr.map((s: any) => s.label),
              totalInventory: totalInventory,
              totalSizes: totalSizes,
              availableSizesCount: availableSizesCount,
              availablePercentage: availablePercentage,

              // Product variants
              colorVariantsCount: colorVariantsCount,
              isGrouped: isGrouped,
              groupedStyleIds: groupedStyleIds.join(','),

              // Tags (Bestseller, Trending, etc.)
              tags: tags.join(','),

              // Catalog date
              catalogDateMs: catalogAttrs.catalogDate || style.catalogDate,

              // Details
              fabricType: style.articleAttributes?.["Fabric"] || style.articleAttributes?.["Material"],
              fit: style.articleAttributes?.["Fit"],
              pattern: style.articleAttributes?.["Pattern"],
              sleeveLength: style.articleAttributes?.["Sleeve Length"],
              occasion: style.articleAttributes?.["Occasion"],
              countryOfOrigin: style.countryOfOrigin || style.articleAttributes?.["Country of Origin"] || style.manufacturerInfo?.countryOfOrigin,
              manufacturer: style.manufacturer,
              description: style.productDescriptors?.description?.value,

              // Dates
              catalogDateMs: style.catalogAttributes?.catalogDate || style.catalogDate,
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

  async processStyleId(styleId: number, categorySlug: string): Promise<boolean> {
    // Check if needs session rotation
    if (this.requestCount >= ROTATE_AFTER) {
      await this.rotateSession();
    }

    const result = await this.fetchProductData(styleId);

    if (!result.success) {
      // Update queue status to failed
      await db
        .update(styleIdQueue)
        .set({ status: "failed" })
        .where(eq(styleIdQueue.styleId, styleId));

      this.stats.failed++;
      return false;
    }

    const now = new Date().toISOString();
    const data = result.data;

    // Calculate days since listing
    let daysSinceListing = null;
    if (data.catalogDateMs) {
      daysSinceListing = Math.floor((Date.now() - data.catalogDateMs) / (1000 * 60 * 60 * 24));
    }

    // Upsert product with ALL extracted fields
    await db
      .insert(products)
      .values({
        id: styleId,
        name: data.name || `Product ${styleId}`,
        brand: data.brand || "Unknown",
        categorySlug: categorySlug,
        mrp: data.mrp,
        price: data.price,
        discount: data.discount,
        discountPercent: data.discountPercent,
        rating: data.rating,
        ratingCount: data.ratingCount,
        reviewsCount: data.reviewsCount,
        pdpViews: data.pdpViews,
        catalogDateMs: data.catalogDateMs,
        daysSinceListing,
        totalInventory: data.totalInventory,
        totalSizes: data.totalSizes,
        availableSizesCount: data.availableSizesCount,
        availablePercentage: data.availablePercentage,
        colorVariantsCount: data.colorVariantsCount,
        isGrouped: data.isGrouped,
        groupedStyleIds: data.groupedStyleIds,
        tags: data.tags,
        gender: data.gender,
        articleType: data.articleType,
        primaryColour: data.primaryColour,
        searchImage: data.searchImage,
        images: data.images,
        sizes: data.sizes,
        availableSizes: data.availableSizes,
        fabricType: data.fabricType,
        fit: data.fit,
        pattern: data.pattern,
        sleeveLength: data.sleeveLength,
        occasion: data.occasion,
        countryOfOrigin: data.countryOfOrigin,
        description: data.description,
        status: "enriched",
        enrichedAt: now,
        createdAt: now,
        updatedAt: now,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: products.id,
        set: {
          mrp: data.mrp,
          price: data.price,
          discount: data.discount,
          discountPercent: data.discountPercent,
          rating: data.rating,
          ratingCount: data.ratingCount,
          reviewsCount: data.reviewsCount,
          pdpViews: data.pdpViews,
          totalInventory: data.totalInventory,
          totalSizes: data.totalSizes,
          availableSizesCount: data.availableSizesCount,
          availablePercentage: data.availablePercentage,
          colorVariantsCount: data.colorVariantsCount,
          isGrouped: data.isGrouped,
          groupedStyleIds: data.groupedStyleIds,
          tags: data.tags,
          images: data.images,
          sizes: data.sizes,
          availableSizes: data.availableSizes,
          fabricType: data.fabricType,
          fit: data.fit,
          pattern: data.pattern,
          sleeveLength: data.sleeveLength,
          occasion: data.occasion,
          countryOfOrigin: data.countryOfOrigin,
          description: data.description,
          status: "enriched",
          enrichedAt: now,
          updatedAt: now,
        },
      });

    // Update queue status
    await db
      .update(styleIdQueue)
      .set({ status: "enriched" })
      .where(eq(styleIdQueue.styleId, styleId));

    this.stats.processed++;
    return true;
  }
}

class BulkEnricher {
  private workers: EnrichmentWorker[] = [];
  private totalProcessed = 0;
  private totalFailed = 0;
  private startTime = Date.now();

  private log(msg: string) {
    console.log(`[BulkEnricher] ${msg}`);
  }

  async initialize(): Promise<void> {
    this.log(`Starting ${CONCURRENCY} workers...`);

    for (let i = 0; i < CONCURRENCY; i++) {
      const worker = new EnrichmentWorker(i + 1);
      await worker.initialize();
      this.workers.push(worker);
      this.log(`Worker ${i + 1} ready`);
    }
  }

  async close(): Promise<void> {
    for (const worker of this.workers) {
      await worker.close();
    }
    this.workers = [];
  }

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

  async processAll(): Promise<void> {
    const initialStats = await this.getQueueStats();
    this.log(`\n${"=".repeat(60)}`);
    this.log(`Starting bulk enrichment`);
    this.log(`Pending: ${initialStats.pending} | Already enriched: ${initialStats.enriched}`);
    this.log(`${"=".repeat(60)}\n`);

    while (true) {
      // Fetch batch of pending items (CONCURRENCY * 10 at a time)
      const batchSize = CONCURRENCY * 10;
      const pending = await db
        .select({
          styleId: styleIdQueue.styleId,
          categorySlug: styleIdQueue.categorySlug,
        })
        .from(styleIdQueue)
        .where(eq(styleIdQueue.status, "pending"))
        .limit(batchSize);

      if (pending.length === 0) {
        this.log("No more pending items!");
        break;
      }

      // Distribute work across workers
      const chunks: typeof pending[] = [];
      for (let i = 0; i < CONCURRENCY; i++) {
        chunks.push([]);
      }
      pending.forEach((item, idx) => {
        chunks[idx % CONCURRENCY].push(item);
      });

      // Process in parallel
      await Promise.all(
        this.workers.map(async (worker, idx) => {
          const chunk = chunks[idx];
          for (const item of chunk) {
            try {
              await worker.processStyleId(item.styleId, item.categorySlug);
            } catch (e: any) {
              console.error(`Worker ${worker.workerId} error:`, e.message);
            }
            await new Promise((r) => setTimeout(r, DELAY_BETWEEN_REQUESTS));
          }
        })
      );

      // Update totals
      this.totalProcessed = this.workers.reduce((sum, w) => sum + w.stats.processed, 0);
      this.totalFailed = this.workers.reduce((sum, w) => sum + w.stats.failed, 0);

      // Log progress
      const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
      const rate = this.totalProcessed / (elapsed || 1);
      const remaining = initialStats.pending - this.totalProcessed - this.totalFailed;
      const eta = Math.floor(remaining / rate);

      console.log(
        `\n[Progress] ✅ ${this.totalProcessed} | ❌ ${this.totalFailed} | ⏳ ${remaining} remaining | ⚡ ${rate.toFixed(1)}/s | ETA: ${Math.floor(eta / 60)}m ${eta % 60}s`
      );
    }

    // Final stats
    const finalStats = await this.getQueueStats();
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);

    this.log(`\n${"=".repeat(60)}`);
    this.log(`Enrichment complete!`);
    this.log(`  Total processed: ${this.totalProcessed}`);
    this.log(`  Total failed: ${this.totalFailed}`);
    this.log(`  Time: ${Math.floor(elapsed / 60)}m ${elapsed % 60}s`);
    this.log(`  Final queue: ${finalStats.pending} pending, ${finalStats.enriched} enriched`);
    this.log(`${"=".repeat(60)}\n`);

    // Log to database
    await db.insert(agentLogs).values({
      agent: "bulk-enricher",
      action: "enrich_complete",
      details: {
        processed: this.totalProcessed,
        failed: this.totalFailed,
        duration: elapsed,
        finalStats,
      },
      status: "success",
      createdAt: new Date().toISOString(),
    });
  }
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const enricher = new BulkEnricher();

  (async () => {
    try {
      await enricher.initialize();
      await enricher.processAll();
    } catch (e: any) {
      console.error("Fatal error:", e);
    } finally {
      await enricher.close();
      process.exit(0);
    }
  })();
}

export default BulkEnricher;
