/**
 * Seed database from existing JSON files
 *
 * Usage: npm run seed
 */

import { db, products, brands, categories } from "./index.js";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import { sql } from "drizzle-orm";

// Path to existing clothing JSON files
const DATA_DIR = "/Users/mohitrai/Library/CloudStorage/OneDrive-Personal/Personal/markeplacep1/data/clothing";

// Categories to exclude (non-clothing)
const EXCLUDED_CATEGORIES = [
  "bracelet-diamond",
  "bracelet-gold",
  "curtain-rods-and-brackets",
  "smart-wearables",
  "innerwear-thermals",
];

interface JsonProduct {
  id: number;
  name: string;
  brand: string;
  mrp: number;
  price: number;
  rating: number;
  ratingCount: number;
}

interface JsonCategory {
  category: string;
  slug: string;
  totalOnMyntra: number;
  fetched: number;
  fetchedAt: string;
  products: JsonProduct[];
}

async function seed() {
  console.log("🌱 Starting database seed...\n");

  // Check if data directory exists
  const fullPath = DATA_DIR;
  if (!existsSync(fullPath)) {
    console.error(`❌ Data directory not found: ${fullPath}`);
    console.log("   Make sure the markeplacep1/data/clothing folder exists");
    process.exit(1);
  }

  // Get all JSON files
  const files = readdirSync(fullPath).filter((f) => f.endsWith(".json"));
  console.log(`📁 Found ${files.length} category files\n`);

  let totalProducts = 0;
  let totalCategories = 0;
  const brandCounts = new Map<string, { count: number; totalRating: number; totalPrice: number }>();

  for (const file of files) {
    const slug = file.replace(".json", "");

    // Skip excluded categories
    if (EXCLUDED_CATEGORIES.includes(slug)) {
      console.log(`⏭️  Skipping ${slug} (excluded)`);
      continue;
    }

    try {
      const filePath = join(fullPath, file);
      const data: JsonCategory = JSON.parse(readFileSync(filePath, "utf-8"));

      if (!data.products || data.products.length === 0) {
        console.log(`⏭️  Skipping ${slug} (no products)`);
        continue;
      }

      // Insert category
      await db.insert(categories).values({
        name: data.category,
        slug: data.slug || slug,
        productCount: data.products.length,
        lastCrawledAt: data.fetchedAt,
        status: "completed",
      }).onConflictDoUpdate({
        target: categories.slug,
        set: {
          productCount: data.products.length,
          lastCrawledAt: data.fetchedAt,
        },
      });

      totalCategories++;

      // Insert products
      for (const p of data.products) {
        if (!p.id || !p.name) continue;

        // Calculate derived fields
        const discount = p.mrp > p.price ? p.mrp - p.price : 0;
        const discountPercent = p.mrp > 0 ? Math.round((discount / p.mrp) * 100) : 0;

        await db.insert(products).values({
          id: p.id,
          name: p.name,
          brand: p.brand || "Unknown",
          category: data.category,
          categorySlug: slug,
          mrp: p.mrp,
          price: p.price,
          discount,
          discountPercent,
          rating: p.rating || 0,
          ratingCount: p.ratingCount || 0,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }).onConflictDoNothing();

        // Track brand stats
        const brand = p.brand || "Unknown";
        const existing = brandCounts.get(brand) || { count: 0, totalRating: 0, totalPrice: 0 };
        brandCounts.set(brand, {
          count: existing.count + 1,
          totalRating: existing.totalRating + (p.rating || 0),
          totalPrice: existing.totalPrice + (p.price || 0),
        });

        totalProducts++;
      }

      console.log(`✅ ${slug}: ${data.products.length} products`);
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error);
    }
  }

  // Insert brands
  console.log("\n📊 Calculating brand stats...");
  for (const [name, stats] of brandCounts) {
    const avgRating = stats.count > 0 ? Math.round((stats.totalRating / stats.count) * 100) / 100 : 0;
    const avgPrice = stats.count > 0 ? Math.round(stats.totalPrice / stats.count) : 0;

    await db.insert(brands).values({
      name,
      productCount: stats.count,
      avgRating,
      avgPrice,
    }).onConflictDoUpdate({
      target: brands.name,
      set: {
        productCount: stats.count,
        avgRating,
        avgPrice,
        updatedAt: new Date().toISOString(),
      },
    });
  }

  console.log(`\n✅ Seeded ${brandCounts.size} brands`);

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("SEED COMPLETE");
  console.log("=".repeat(50));
  console.log(`Categories: ${totalCategories}`);
  console.log(`Products:   ${totalProducts.toLocaleString()}`);
  console.log(`Brands:     ${brandCounts.size}`);
  console.log("=".repeat(50));
}

// Run seed
seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
