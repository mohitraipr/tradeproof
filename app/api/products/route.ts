import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

interface Product {
  id: number;
  name: string;
  brand: string;
  categorySlug: string;
  mrp: number;
  price: number;
  discount: number;
  discountPercent: number;
  rating: number;
  ratingCount: number;
  reviewsCount: number;
  pdpViews: number;
  cartCount: number;
  wishlistCount: number;
  purchasedCount: number;
  totalInventory: number;
  availablePercentage: number;
  colorVariantsCount: number;
  tags: string;
  season: string;
  isFastFashion: boolean;
  daysSinceListing: number;
  searchImage: string;
  bestsellerRank?: number;
  bestsellerScore?: number;
  aiReasoning?: string;
}

function calculateBestsellerScore(p: Product): { score: number; reasoning: string } {
  let score = 0;
  const factors: string[] = [];

  // 1. DEMAND VOLUME (40% weight) - ratingCount is primary signal
  if (p.ratingCount > 0) {
    const volumeScore = Math.min(40, Math.log10(p.ratingCount + 1) * 15);
    score += volumeScore;

    if (p.ratingCount > 5000) {
      factors.push(`Massive demand (${p.ratingCount.toLocaleString()} reviews)`);
    } else if (p.ratingCount > 1000) {
      factors.push(`High demand (${p.ratingCount.toLocaleString()} reviews)`);
    } else if (p.ratingCount > 100) {
      factors.push(`Good demand (${p.ratingCount} reviews)`);
    }
  }

  // 2. QUALITY (25% weight) - rating
  if (p.rating >= 4.0) {
    const qualityScore = (p.rating - 3.5) * 16.67; // 4.0 = 8.33, 4.5 = 16.67, 5.0 = 25
    score += Math.min(25, qualityScore);
    factors.push(`${p.rating.toFixed(1)}★ rating`);
  }

  // 3. ACTIVE INTEREST (15% weight) - cart + wishlist + views
  const activeInterest = (p.cartCount || 0) + (p.wishlistCount || 0) + ((p.pdpViews || 0) / 10);
  if (activeInterest > 0) {
    const interestScore = Math.min(15, Math.log10(activeInterest + 1) * 5);
    score += interestScore;
    if (p.cartCount > 10) factors.push(`${p.cartCount} in carts now`);
    if (p.pdpViews > 100) factors.push(`${p.pdpViews} recent views`);
  }

  // 4. PRICE POINT (10% weight) - sweet spot ₹500-2000 for B2B
  if (p.price >= 400 && p.price <= 2500) {
    score += 10;
    factors.push(`B2B sweet spot (₹${p.price})`);
  } else if (p.price >= 200 && p.price <= 4000) {
    score += 5;
  }

  // 5. INVENTORY HEALTH (10% weight)
  if (p.availablePercentage > 80) {
    score += 10;
    factors.push("Good stock availability");
  } else if (p.availablePercentage > 50) {
    score += 5;
  } else if (p.availablePercentage < 30 && p.totalInventory < 100) {
    factors.push("⚠️ Low stock");
  }

  // BONUS FACTORS
  // Recent purchases (strong signal)
  if (p.purchasedCount && p.purchasedCount > 10) {
    score += 5;
    factors.push(`${p.purchasedCount} bought recently`);
  }

  // Color variants (product depth)
  if (p.colorVariantsCount > 5) {
    score += 3;
    factors.push(`${p.colorVariantsCount} color options`);
  }

  // Official tags
  if (p.tags?.toLowerCase().includes("bestseller")) {
    score += 5;
    factors.push("Official Bestseller badge");
  }
  if (p.tags?.toLowerCase().includes("trending")) {
    score += 3;
    factors.push("Trending tag");
  }

  // Fast fashion indicator
  if (p.isFastFashion && p.daysSinceListing < 90) {
    score += 2;
    factors.push("Fast fashion trend");
  }

  // Season alignment
  const currentMonth = new Date().getMonth();
  const isSummer = currentMonth >= 3 && currentMonth <= 8;
  if (p.season) {
    if ((isSummer && p.season.toLowerCase() === "summer") ||
        (!isSummer && p.season.toLowerCase() === "winter")) {
      score += 3;
      factors.push("In-season");
    }
  }

  // Generate reasoning
  const topFactors = factors.slice(0, 3);
  const reasoning = topFactors.length > 0
    ? topFactors.join(". ") + "."
    : "Limited data for analysis.";

  return { score: Math.round(score), reasoning };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "50");
  const category = searchParams.get("category");
  const sort = searchParams.get("sort") || "rank"; // rank, rating, price, new
  const minRating = parseFloat(searchParams.get("minRating") || "0");

  try {
    // Fetch from backend
    const backendUrl = `${BACKEND_URL}/api/products?limit=${limit * 2}&enriched=true`;
    const response = await fetch(backendUrl, {
      next: { revalidate: 30 } // Cache for 30 seconds
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();
    let products: Product[] = data.products || [];

    // Filter
    if (category) {
      products = products.filter(p => p.categorySlug === category);
    }
    if (minRating > 0) {
      products = products.filter(p => p.rating >= minRating);
    }

    // Calculate scores and add reasoning
    const scoredProducts = products.map(p => {
      const { score, reasoning } = calculateBestsellerScore(p);
      return {
        ...p,
        bestsellerScore: score,
        aiReasoning: reasoning,
      };
    });

    // Sort
    let sortedProducts = scoredProducts;
    switch (sort) {
      case "rank":
      case "score":
        sortedProducts = scoredProducts.sort((a, b) => b.bestsellerScore - a.bestsellerScore);
        break;
      case "rating":
        sortedProducts = scoredProducts.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "price":
        sortedProducts = scoredProducts.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case "new":
        sortedProducts = scoredProducts.sort((a, b) => (a.daysSinceListing || 999) - (b.daysSinceListing || 999));
        break;
      case "demand":
        sortedProducts = scoredProducts.sort((a, b) => (b.ratingCount || 0) - (a.ratingCount || 0));
        break;
    }

    // Add rank
    const rankedProducts = sortedProducts.slice(0, limit).map((p, idx) => ({
      ...p,
      bestsellerRank: idx + 1,
    }));

    // Get categories for filter
    const categories = [...new Set(products.map(p => p.categorySlug).filter(Boolean))];

    return NextResponse.json({
      success: true,
      total: data.total || products.length,
      returned: rankedProducts.length,
      categories,
      products: rankedProducts,
    });
  } catch (error) {
    console.error("Products API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        products: [],
      },
      { status: 500 }
    );
  }
}
