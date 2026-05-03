import { Router } from "express";
import { db, products, brands } from "../db/index.js";
import { eq, desc, sql } from "drizzle-orm";
import type { BrandAnalytics } from "../types/index.js";

const router = Router();

// GET /api/brands - List all brands with stats
router.get("/", async (req, res) => {
  try {
    const { sort = "count", limit = "100" } = req.query;

    let orderBy;
    switch (sort) {
      case "name":
        orderBy = brands.name;
        break;
      case "rating":
        orderBy = desc(brands.avgRating);
        break;
      default:
        orderBy = desc(brands.productCount);
    }

    const result = await db
      .select()
      .from(brands)
      .orderBy(orderBy)
      .limit(parseInt(limit as string));

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error fetching brands:", error);
    res.status(500).json({ success: false, error: "Failed to fetch brands" });
  }
});

// GET /api/brands/:name - Single brand with products
router.get("/:name", async (req, res) => {
  try {
    const { name } = req.params;

    const [brand] = await db.select().from(brands).where(eq(brands.name, name));

    if (!brand) {
      return res.status(404).json({ success: false, error: "Brand not found" });
    }

    // Get brand's products
    const brandProducts = await db
      .select()
      .from(products)
      .where(eq(products.brand, name))
      .orderBy(desc(products.salesVelocity))
      .limit(50);

    res.json({
      success: true,
      data: {
        ...brand,
        products: brandProducts,
      },
    });
  } catch (error) {
    console.error("Error fetching brand:", error);
    res.status(500).json({ success: false, error: "Failed to fetch brand" });
  }
});

// POST /api/brands/refresh - Recalculate brand stats from products
router.post("/refresh", async (req, res) => {
  try {
    // Aggregate brand stats from products
    const brandStats = await db
      .select({
        brand: products.brand,
        productCount: sql<number>`count(*)`,
        avgRating: sql<number>`avg(${products.rating})`,
        avgPrice: sql<number>`avg(${products.price})`,
      })
      .from(products)
      .where(eq(products.isActive, true))
      .groupBy(products.brand);

    // Get origin distribution per brand
    const originStats = await db
      .select({
        brand: products.brand,
        origin: products.countryOfOrigin,
        count: sql<number>`count(*)`,
      })
      .from(products)
      .where(eq(products.isActive, true))
      .groupBy(products.brand, products.countryOfOrigin);

    // Get top categories per brand
    const categoryStats = await db
      .select({
        brand: products.brand,
        category: products.category,
        count: sql<number>`count(*)`,
      })
      .from(products)
      .where(eq(products.isActive, true))
      .groupBy(products.brand, products.category)
      .orderBy(desc(sql`count(*)`));

    // Build brand data
    const brandData: Map<string, BrandAnalytics> = new Map();

    for (const stat of brandStats) {
      brandData.set(stat.brand, {
        name: stat.brand,
        productCount: Number(stat.productCount),
        avgRating: Math.round(Number(stat.avgRating) * 100) / 100,
        avgPrice: Math.round(Number(stat.avgPrice)),
        topCategories: [],
        originDistribution: {},
      });
    }

    // Add origin distribution
    for (const stat of originStats) {
      const brand = brandData.get(stat.brand);
      if (brand && stat.origin) {
        brand.originDistribution[stat.origin] = Number(stat.count);
      }
    }

    // Add top categories
    for (const stat of categoryStats) {
      const brand = brandData.get(stat.brand);
      if (brand && stat.category && brand.topCategories.length < 5) {
        brand.topCategories.push(stat.category);
      }
    }

    // Upsert brands
    for (const brand of brandData.values()) {
      await db
        .insert(brands)
        .values({
          name: brand.name,
          productCount: brand.productCount,
          avgRating: brand.avgRating,
          avgPrice: brand.avgPrice,
          topCategories: brand.topCategories,
          originDistribution: brand.originDistribution,
        })
        .onConflictDoUpdate({
          target: brands.name,
          set: {
            productCount: brand.productCount,
            avgRating: brand.avgRating,
            avgPrice: brand.avgPrice,
            topCategories: brand.topCategories,
            originDistribution: brand.originDistribution,
            updatedAt: new Date().toISOString(),
          },
        });
    }

    res.json({
      success: true,
      data: { brandsUpdated: brandData.size },
    });
  } catch (error) {
    console.error("Error refreshing brands:", error);
    res.status(500).json({ success: false, error: "Failed to refresh brands" });
  }
});

export default router;
