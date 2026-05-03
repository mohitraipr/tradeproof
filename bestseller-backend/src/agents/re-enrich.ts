/**
 * Re-Enrich Products - COMPREHENSIVE
 *
 * Extracts ALL available fields from Myntra API:
 * - Ratings & reviews (breakdown, images)
 * - Urgency data (purchases, carts, wishlists, views)
 * - Inventory & availability
 * - Product flags & policies
 * - Catalog metadata
 */

import puppeteer, { Browser, Page } from "puppeteer";
import { db } from "../db/index.js";
import { products } from "../db/schema.js";
import { eq, isNull, or, sql } from "drizzle-orm";

const CONCURRENCY = 6;
const ROTATE_AFTER = 200;
const DELAY_BETWEEN_REQUESTS = 250;

class ReEnrichWorker {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private requestCount = 0;
  public workerId: number;
  public processed = 0;
  public updated = 0;
  public failed = 0;

  constructor(workerId: number) {
    this.workerId = workerId;
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
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
    );
    try {
      await this.page.goto("https://www.myntra.com", { waitUntil: "networkidle2", timeout: 45000 });
    } catch (e) {}
    await new Promise((r) => setTimeout(r, 1500));
    this.requestCount = 0;
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  async rotateSession(): Promise<void> {
    this.log(`Rotating session...`);
    await this.close();
    await new Promise((r) => setTimeout(r, 2000));
    await this.initialize();
    this.requestCount = 0;
  }

  async fetchAndUpdate(productId: number): Promise<boolean> {
    if (!this.page) {
      console.log(`[Worker ${this.workerId}] No page!`);
      return false;
    }

    this.requestCount++;

    if (this.requestCount >= ROTATE_AFTER) {
      await this.rotateSession();
    }

    try {
      const result = await this.page.evaluate(async (id) => {
        try {
          const res = await fetch(
            `https://www.myntra.com/gateway/v2/product/${id}`,
            {
              headers: {
                accept: "application/json",
                "x-myntraweb": "Yes",
                "x-location-context": "pincode=110002;source=IP",
              },
            }
          );

          if (res.status === 404) return { success: false, error: "not_found" };

          const text = await res.text();
          if (text.startsWith("<")) return { success: false, error: "blocked" };

          const data = JSON.parse(text);
          const style = data.style || data;

          // RATINGS
          const ratings = style.ratings || {};

          // URGENCY - inline extraction
          const urgency = style.urgency || [];
          let pdpViews = null, cartCount = null, wishlistCount = null, purchasedCount = null;
          for (const u of urgency) {
            if (u.type === 'PDP') pdpViews = u.value ? Number(u.value) : null;
            else if (u.type === 'CART') cartCount = u.value ? Number(u.value) : null;
            else if (u.type === 'WISHLIST') wishlistCount = u.value ? Number(u.value) : null;
            else if (u.type === 'PURCHASED') purchasedCount = u.value ? Number(u.value) : null;
          }

          // PRICE
          let discountedPrice = style.price;
          const sizes = style.sizes || [];
          for (const size of sizes) {
            if (size.sizeSellerData && size.sizeSellerData.length > 0) {
              discountedPrice = size.sizeSellerData[0].discountedPrice || discountedPrice;
              break;
            }
          }
          if (!discountedPrice) discountedPrice = style.mrp;

          // INVENTORY
          let totalInventory = 0;
          sizes.forEach(size => {
            (size.sizeSellerData || []).forEach(seller => {
              totalInventory += seller.availableCount || 0;
            });
          });
          const totalSizes = sizes.length;
          const availableSizesArr = sizes.filter(s => s.available);
          const availableSizesCount = availableSizesArr.length;
          const availablePercentage = totalSizes > 0 ? Math.round((availableSizesCount / totalSizes) * 100) : 0;

          // TAGS
          const tags = [];
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

          // COLORS
          const colours = style.colours || style.colors || [];
          const groupedStyleIds = colours
            .map(c => c.styleId || c.id)
            .filter(cid => cid && String(cid) !== String(id))
            .map(String);

          // IMAGES
          let searchImage = style.searchImage;
          const images = [];
          const defaultAlbum = (style.media?.albums || []).find(a => a?.name === 'default');
          if (defaultAlbum && defaultAlbum.images) {
            defaultAlbum.images.forEach(img => {
              const url = img?.imageURL || img?.secureSrc || img?.src || '';
              if (url) images.push(url);
            });
            if (images[0]) searchImage = images[0];
          }

          // FLAGS
          const flags = style.flags || {};
          const serviceability = style.serviceability || {};
          const catalogAttrs = style.catalogAttributes || {};
          const analytics = style.analytics || {};

          return {
            success: true,
            data: {
              name: style.name || style.productName,
              brand: style.brand?.name || style.brand,
              mrp: style.mrp,
              price: discountedPrice,
              discount: style.mrp && discountedPrice ? style.mrp - discountedPrice : null,
              discountPercent: style.mrp && discountedPrice && style.mrp > 0
                ? Math.round(((style.mrp - discountedPrice) / style.mrp) * 100) : null,
              rating: ratings.averageRating || null,
              ratingCount: ratings.totalCount || null,
              reviewsCount: ratings.reviewsCount || null,
              reviewImagesCount: ratings.reviewImagesCount || null,
              ratingBreakdown: ratings.ratingInfo || null,
              isFastFashion: ratings.isFastFashion || false,
              pdpViews: pdpViews,
              cartCount: cartCount,
              wishlistCount: wishlistCount,
              purchasedCount: purchasedCount,
              totalInventory: totalInventory,
              totalSizes: totalSizes,
              availableSizesCount: availableSizesCount,
              availablePercentage: availablePercentage,
              isOutOfStock: flags.outOfStock || false,
              colorVariantsCount: colours.length,
              isGrouped: groupedStyleIds.length > 0,
              groupedStyleIds: groupedStyleIds.join(','),
              tags: tags.join(','),
              codEnabled: flags.codEnabled || false,
              emiEnabled: flags.emiEnabled || false,
              isReturnable: flags.isReturnable || false,
              returnPeriodDays: serviceability.returnPeriod || null,
              catalogDateMs: catalogAttrs.catalogDate ? Number(catalogAttrs.catalogDate) : null,
              season: catalogAttrs.season || null,
              catalogYear: catalogAttrs.year || null,
              gender: analytics.gender || style.gender,
              articleType: analytics.articleType || style.articleType?.typeName || style.articleType,
              searchImage: searchImage,
              images: images,
              availableSizes: availableSizesArr.map(s => s.label),
            },
          };
        } catch (e) {
          return { success: false, error: e.message };
        }
      }, productId);

      if (!result.success) {
        if (this.failed < 5) {
          console.log(`[Worker ${this.workerId}] Failed ${productId}: ${result.error}`);
        }
        this.failed++;
        return false;
      }

      const data = result.data;
      const now = new Date().toISOString();

      // Calculate days since listing
      let daysSinceListing = null;
      if (data.catalogDateMs) {
        daysSinceListing = Math.floor((Date.now() - data.catalogDateMs) / (1000 * 60 * 60 * 24));
      }

      // Update product with ALL fields
      await db
        .update(products)
        .set({
          // Basic
          name: data.name,
          brand: data.brand,

          // Pricing
          mrp: data.mrp,
          price: data.price,
          discount: data.discount,
          discountPercent: data.discountPercent,

          // Ratings
          rating: data.rating,
          ratingCount: data.ratingCount,
          reviewsCount: data.reviewsCount,
          reviewImagesCount: data.reviewImagesCount,
          ratingBreakdown: data.ratingBreakdown,
          isFastFashion: data.isFastFashion,

          // Urgency
          pdpViews: data.pdpViews,
          cartCount: data.cartCount,
          wishlistCount: data.wishlistCount,
          purchasedCount: data.purchasedCount,

          // Inventory
          totalInventory: data.totalInventory,
          totalSizes: data.totalSizes,
          availableSizesCount: data.availableSizesCount,
          availablePercentage: data.availablePercentage,
          isOutOfStock: data.isOutOfStock,

          // Variants
          colorVariantsCount: data.colorVariantsCount,
          isGrouped: data.isGrouped,
          groupedStyleIds: data.groupedStyleIds,

          // Tags
          tags: data.tags,

          // Flags
          codEnabled: data.codEnabled,
          emiEnabled: data.emiEnabled,
          isReturnable: data.isReturnable,
          returnPeriodDays: data.returnPeriodDays,

          // Catalog
          catalogDateMs: data.catalogDateMs,
          daysSinceListing: daysSinceListing,
          season: data.season,
          catalogYear: data.catalogYear,

          // Category
          gender: data.gender,
          articleType: data.articleType,

          // Images
          searchImage: data.searchImage,
          images: data.images,
          availableSizes: data.availableSizes,

          // Meta
          updatedAt: now,
        })
        .where(eq(products.id, productId));

      this.updated++;
      this.processed++;
      return true;
    } catch (e: any) {
      if (this.failed < 5) {
        console.log(`[Worker ${this.workerId}] Exception ${productId}: ${e.message}`);
      }
      this.failed++;
      return false;
    }
  }
}

class ReEnricher {
  private workers: ReEnrichWorker[] = [];
  private startTime = Date.now();

  async initialize(): Promise<void> {
    console.log(`[ReEnricher] Starting ${CONCURRENCY} workers...`);
    for (let i = 0; i < CONCURRENCY; i++) {
      const worker = new ReEnrichWorker(i + 1);
      await worker.initialize();
      this.workers.push(worker);
      console.log(`[ReEnricher] Worker ${i + 1} ready`);
    }
    console.log(`[ReEnricher] All workers ready\n`);
  }

  async close(): Promise<void> {
    for (const worker of this.workers) {
      await worker.close();
    }
  }

  async run(): Promise<void> {
    // Get ALL products that need re-enrichment
    const allProducts = await db
      .select({ id: products.id })
      .from(products)
      .where(
        or(
          isNull(products.purchasedCount), // New field - means not enriched with new extractor
          isNull(products.rating),
        )
      );

    console.log(`${"=".repeat(60)}`);
    console.log(`[ReEnricher] Found ${allProducts.length} products to re-enrich`);
    console.log(`  - Extracting: ratings, reviews, urgency, inventory, flags`);
    console.log(`${"=".repeat(60)}\n`);

    if (allProducts.length === 0) {
      console.log("[ReEnricher] Nothing to do!");
      return;
    }

    const batchSize = CONCURRENCY * 20;
    let processed = 0;

    for (let i = 0; i < allProducts.length; i += batchSize) {
      const batch = allProducts.slice(i, i + batchSize);

      const chunks: typeof batch[] = [];
      for (let j = 0; j < CONCURRENCY; j++) chunks.push([]);
      batch.forEach((item, idx) => chunks[idx % CONCURRENCY].push(item));

      await Promise.all(
        this.workers.map(async (worker, idx) => {
          for (const item of chunks[idx]) {
            await worker.fetchAndUpdate(item.id);
            await new Promise((r) => setTimeout(r, DELAY_BETWEEN_REQUESTS));
          }
        })
      );

      processed += batch.length;
      const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
      const totalUpdated = this.workers.reduce((sum, w) => sum + w.updated, 0);
      const totalFailed = this.workers.reduce((sum, w) => sum + w.failed, 0);
      const rate = processed / (elapsed || 1);
      const remaining = allProducts.length - processed;
      const eta = Math.floor(remaining / rate);

      console.log(
        `[Progress] ✅ ${totalUpdated} | ❌ ${totalFailed} | ${processed}/${allProducts.length} | ${rate.toFixed(1)}/s | ETA: ${Math.floor(eta / 60)}m ${eta % 60}s`
      );
    }

    const totalUpdated = this.workers.reduce((sum, w) => sum + w.updated, 0);
    const totalFailed = this.workers.reduce((sum, w) => sum + w.failed, 0);
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);

    console.log(`\n${"=".repeat(60)}`);
    console.log(`[ReEnricher] Complete!`);
    console.log(`  Updated: ${totalUpdated}`);
    console.log(`  Failed: ${totalFailed}`);
    console.log(`  Time: ${Math.floor(elapsed / 60)}m ${elapsed % 60}s`);
    console.log(`${"=".repeat(60)}\n`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const reEnricher = new ReEnricher();
  (async () => {
    try {
      await reEnricher.initialize();
      await reEnricher.run();
    } catch (e) {
      console.error("Fatal error:", e);
    } finally {
      await reEnricher.close();
      process.exit(0);
    }
  })();
}

export default ReEnricher;
