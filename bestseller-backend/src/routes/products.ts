import { Router } from "express";
import { db, products } from "../db/index.js";
import { eq, desc, asc, sql, and, gte, lte, isNotNull } from "drizzle-orm";

const router = Router();

// GET /api/products - List products with filters
router.get("/", async (req, res) => {
  try {
    const {
      category,
      brand,
      origin,
      minRating,
      maxPrice,
      minPrice,
      sort = "rank",
      order = "asc",
      limit = "50",
      offset = "0",
      enriched, // If true, return all products with ratings (for frontend ranking)
    } = req.query;

    // Apply filters
    const conditions = [eq(products.isActive, true)];

    if (category) {
      conditions.push(eq(products.categorySlug, category as string));
    }
    if (brand) {
      conditions.push(eq(products.brand, brand as string));
    }
    if (origin) {
      conditions.push(eq(products.countryOfOrigin, origin as string));
    }
    if (minRating) {
      conditions.push(gte(products.rating, parseFloat(minRating as string)));
    }
    if (minPrice) {
      conditions.push(gte(products.price, parseInt(minPrice as string)));
    }
    if (maxPrice) {
      conditions.push(lte(products.price, parseInt(maxPrice as string)));
    }

    // If enriched=true, return products with ratings for frontend ranking
    if (enriched === "true") {
      conditions.push(isNotNull(products.rating));
    } else if (sort === "rank") {
      // For rank sorting, only show ranked products
      conditions.push(eq(products.status, "ranked"));
      conditions.push(isNotNull(products.bestsellerRank));
    }

    // Build where clause AFTER all conditions are added
    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    // Sort
    let orderBy;
    switch (sort) {
      case "rank":
        orderBy = enriched === "true"
          ? desc(products.ratingCount) // For enriched, sort by demand
          : asc(products.bestsellerRank);
        break;
      case "demand":
        orderBy = desc(products.ratingCount);
        break;
      case "velocity":
        orderBy = desc(products.salesVelocity);
        break;
      case "rating":
        orderBy = desc(products.rating);
        break;
      case "price":
        orderBy = order === "desc" ? desc(products.price) : asc(products.price);
        break;
      case "newest":
        orderBy = desc(products.catalogDateMs);
        break;
      default:
        orderBy = desc(products.ratingCount); // Default to demand-based
    }

    const result = await db
      .select()
      .from(products)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(whereClause);

    res.json({
      success: true,
      products: result,
      total: Number(count),
      page: Math.floor(parseInt(offset as string) / parseInt(limit as string)) + 1,
      limit: parseInt(limit as string),
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ success: false, error: "Failed to fetch products" });
  }
});

// GET /api/products/:id - Single product
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, parseInt(id)));

    if (!product) {
      return res.status(404).json({ success: false, error: "Product not found" });
    }

    res.json({ success: true, data: product });
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ success: false, error: "Failed to fetch product" });
  }
});

// GET /api/products/top/:count - Top N bestsellers
router.get("/top/:count", async (req, res) => {
  try {
    const count = parseInt(req.params.count) || 10;

    const result = await db
      .select()
      .from(products)
      .where(and(eq(products.status, "ranked"), isNotNull(products.bestsellerRank)))
      .orderBy(asc(products.bestsellerRank))
      .limit(count);

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error fetching top products:", error);
    res.status(500).json({ success: false, error: "Failed to fetch top products" });
  }
});

export default router;
