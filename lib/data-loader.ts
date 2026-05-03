import fs from "fs";
import path from "path";
import type { Product, CategoryData, FilterConfig } from "./types";

const DATA_DIR = path.join(process.cwd(), "data", "clothing");

// Categories to EXCLUDE (non-clothing items)
const EXCLUDED_CATEGORIES = [
  "bracelet-diamond",
  "bracelet-gold",
  "curtain-rods-and-brackets",
  "smart-wearables",
  "innerwear-thermals", // Empty category
];

// Categories that are borderline (accessories) - included by default but can be filtered
const ACCESSORY_CATEGORIES = [
  "lingerie-accessories",
  "swimwear-accessories",
];

export function getAllCategories(includeAccessories = true): string[] {
  const files = fs.readdirSync(DATA_DIR);
  return files
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(".json", ""))
    .filter((slug) => {
      // Always exclude non-clothing
      if (EXCLUDED_CATEGORIES.includes(slug)) return false;
      // Optionally exclude accessories
      if (!includeAccessories && ACCESSORY_CATEGORIES.includes(slug)) return false;
      return true;
    });
}

export function getCategoryStats(): {
  total: number;
  clothing: number;
  excluded: number;
  accessories: number;
  categories: { slug: string; count: number; type: "clothing" | "accessory" | "excluded" }[];
} {
  const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));
  const categories: { slug: string; count: number; type: "clothing" | "accessory" | "excluded" }[] = [];

  let total = 0;
  let clothing = 0;
  let excluded = 0;
  let accessories = 0;

  for (const file of files) {
    const slug = file.replace(".json", "");
    const data = loadCategoryData(slug);
    const count = data?.products?.length || 0;

    let type: "clothing" | "accessory" | "excluded";

    if (EXCLUDED_CATEGORIES.includes(slug)) {
      type = "excluded";
      excluded += count;
    } else if (ACCESSORY_CATEGORIES.includes(slug)) {
      type = "accessory";
      accessories += count;
    } else {
      type = "clothing";
      clothing += count;
    }

    categories.push({ slug, count, type });
    total += count;
  }

  return {
    total,
    clothing,
    excluded,
    accessories,
    categories: categories.sort((a, b) => b.count - a.count),
  };
}

export function loadCategoryData(categorySlug: string): CategoryData | null {
  const filePath = path.join(DATA_DIR, `${categorySlug}.json`);
  if (!fs.existsSync(filePath)) return null;

  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  return data;
}

export function loadAllProducts(config: FilterConfig = {}): Product[] {
  const {
    excludeCategories = EXCLUDED_CATEGORIES,
    includeCategories,
    minRating,
    minRatingCount,
    maxPrice,
    minPrice,
    brands,
  } = config;

  const categories = getAllCategories();
  const allProducts: Product[] = [];

  for (const categorySlug of categories) {
    // Skip excluded categories
    if (excludeCategories.includes(categorySlug)) continue;

    // If includeCategories specified, only include those
    if (includeCategories && !includeCategories.includes(categorySlug)) continue;

    const data = loadCategoryData(categorySlug);
    if (!data?.products) continue;

    const productsWithCategory = data.products
      .map((p) => ({
        ...p,
        category: data.category,
        categorySlug: categorySlug,
      }))
      .filter((p) => {
        // Apply filters
        if (minRating && p.rating < minRating) return false;
        if (minRatingCount && p.ratingCount < minRatingCount) return false;
        if (maxPrice && p.price > maxPrice) return false;
        if (minPrice && p.price < minPrice) return false;
        if (brands && !brands.includes(p.brand)) return false;
        return true;
      });

    allProducts.push(...productsWithCategory);
  }

  return allProducts;
}

export function getTopProductsByScore(
  products: Product[],
  limit: number = 10
): Product[] {
  return products
    .filter((p) => p.ratingCount > 0 && p.rating > 0)
    .map((p) => ({
      ...p,
      _score: calculateBestsellerScore(p),
    }))
    .sort((a, b) => b._score - a._score)
    .slice(0, limit)
    .map(({ _score, ...product }) => product);
}

export function calculateBestsellerScore(product: Product): number {
  const { rating, ratingCount, mrp, price } = product;

  if (!ratingCount || ratingCount === 0) return 0;

  // Volume weight (log scale to prevent outliers dominating)
  const volumeScore = Math.log(ratingCount + 1) * ratingCount;

  // Quality weight (normalized to 0-1)
  const qualityScore = (rating || 0) / 5.0;

  // Discount factor (higher discount = higher demand signal, but cap it)
  const discountPercent = mrp > 0 ? (mrp - price) / mrp : 0;
  const discountFactor = Math.min(discountPercent, 0.7); // Cap at 70% to avoid clearance items

  // Price accessibility (lower price = larger market, but not too low)
  const priceScore = price >= 200 ? 1 / (1 + Math.log((price || 1) + 1)) : 0.5;

  return volumeScore * qualityScore * (1 + discountFactor) * (1 + priceScore);
}

// Get products grouped by category for analysis
export function getProductsByCategory(
  config: FilterConfig = {}
): Map<string, Product[]> {
  const products = loadAllProducts(config);
  const byCategory = new Map<string, Product[]>();

  for (const product of products) {
    const cat = product.category || "Unknown";
    if (!byCategory.has(cat)) {
      byCategory.set(cat, []);
    }
    byCategory.get(cat)!.push(product);
  }

  return byCategory;
}

// Get top N bestsellers from each category
export function getTopByCategory(
  topPerCategory: number = 5,
  config: FilterConfig = {}
): Product[] {
  const byCategory = getProductsByCategory(config);
  const topProducts: Product[] = [];

  for (const [category, products] of byCategory) {
    const top = getTopProductsByScore(products, topPerCategory);
    topProducts.push(...top);
  }

  return topProducts;
}

// Summary stats for dashboard
export function getDataSummary(): {
  totalProducts: number;
  totalCategories: number;
  excludedProducts: number;
  avgRating: number;
  avgPrice: number;
  priceRange: { min: number; max: number };
  topBrands: { brand: string; count: number }[];
  categoryDistribution: { category: string; count: number }[];
} {
  const stats = getCategoryStats();
  const products = loadAllProducts();

  // Calculate averages
  const validRatings = products.filter(p => p.rating > 0);
  const avgRating = validRatings.length > 0
    ? validRatings.reduce((sum, p) => sum + p.rating, 0) / validRatings.length
    : 0;

  const avgPrice = products.length > 0
    ? products.reduce((sum, p) => sum + p.price, 0) / products.length
    : 0;

  const prices = products.map(p => p.price).filter(p => p > 0);
  const priceRange = {
    min: Math.min(...prices),
    max: Math.max(...prices),
  };

  // Count brands
  const brandCounts = new Map<string, number>();
  for (const p of products) {
    brandCounts.set(p.brand, (brandCounts.get(p.brand) || 0) + 1);
  }
  const topBrands = Array.from(brandCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([brand, count]) => ({ brand, count }));

  // Category distribution (clothing only)
  const categoryDistribution = stats.categories
    .filter(c => c.type === "clothing")
    .map(c => ({ category: c.slug, count: c.count }));

  return {
    totalProducts: stats.clothing + stats.accessories,
    totalCategories: stats.categories.filter(c => c.type !== "excluded").length,
    excludedProducts: stats.excluded,
    avgRating: Math.round(avgRating * 100) / 100,
    avgPrice: Math.round(avgPrice),
    priceRange,
    topBrands,
    categoryDistribution,
  };
}
