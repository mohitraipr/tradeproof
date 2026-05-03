/**
 * Agent 3: Ranker
 *
 * Purpose: Score and rank products using AI analysis.
 *
 * Uses Claude AI to:
 * - Analyze each product's bestseller potential
 * - Generate reasoning for why it ranks where it does
 * - Provide actionable insights for B2B buyers
 */

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "../db/index.js";
import { products, agentLogs } from "../db/schema.js";
import { eq, sql, and, or, isNotNull } from "drizzle-orm";

const anthropic = new Anthropic();

const MAX_BRAND_IN_TOP = 3;
const DIVERSITY_PENALTY = 0.7;

export class Ranker {
  private log(msg: string, level: string = "info") {
    const prefix = level === "warning" ? "⚠️" : level === "error" ? "❌" : "→";
    console.log(`[Ranker] ${prefix} ${msg}`);
  }

  /**
   * Calculate base bestseller score
   */
  calculateBaseScore(product: {
    rating: number | null;
    ratingCount: number | null;
    discountPercent: number | null;
    daysSinceListing: number | null;
    price: number | null;
  }): number {
    const rating = product.rating || 0;
    const ratingCount = product.ratingCount || 0;
    const discountPercent = product.discountPercent || 0;
    const daysSinceListing = product.daysSinceListing || 1;
    const price = product.price || 0;

    if (ratingCount === 0) return 0;

    const volumeScore = Math.log(ratingCount + 1) * ratingCount;
    const qualityScore = rating / 5;
    const discountFactor = 1 + (discountPercent / 100) * 0.5;
    const velocity = daysSinceListing > 0 ? ratingCount / daysSinceListing : ratingCount;
    const velocityFactor = 1 + Math.min(velocity, 10) / 10;
    const priceBonus = price < 2000 ? 1.1 : price < 5000 ? 1.0 : 0.9;

    return volumeScore * qualityScore * discountFactor * velocityFactor * priceBonus;
  }

  /**
   * Use Claude AI to generate reasoning for top products
   */
  async generateAIReasoning(productsToAnalyze: Array<{
    rank: number;
    name: string;
    brand: string;
    rating: number | null;
    ratingCount: number | null;
    price: number | null;
    mrp: number | null;
    discountPercent: number | null;
    category?: string;
  }>): Promise<Map<number, string>> {
    const reasoningMap = new Map<number, string>();

    if (productsToAnalyze.length === 0) return reasoningMap;

    this.log(`Generating AI reasoning for ${productsToAnalyze.length} products...`);

    const productSummaries = productsToAnalyze.map(p => ({
      rank: p.rank,
      name: p.name,
      brand: p.brand,
      rating: p.rating?.toFixed(1) || "N/A",
      reviews: p.ratingCount || 0,
      price: p.price,
      mrp: p.mrp,
      discount: p.discountPercent || 0,
    }));

    try {
      const response = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: `You are a B2B fashion market analyst. Analyze these top-ranked products and explain WHY each is a bestseller in 1-2 concise sentences.

Focus on:
- Demand signals (review volume, rating quality)
- Price positioning (mass market vs premium)
- Value proposition (discount depth)
- B2B wholesale potential

Products to analyze:
${JSON.stringify(productSummaries, null, 2)}

Respond with a JSON array:
[
  {"rank": 1, "reasoning": "Your insight here..."},
  {"rank": 2, "reasoning": "Your insight here..."}
]

Be specific with numbers. No generic statements. Each reasoning should be unique and actionable for a wholesale buyer.`
          }
        ],
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "";
      const cleanText = text.replace(/```json\s*/g, "").replace(/```\s*/g, "");
      const jsonMatch = cleanText.match(/\[[\s\S]*\]/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        for (const item of parsed) {
          reasoningMap.set(item.rank, item.reasoning);
        }
        this.log(`Generated ${reasoningMap.size} AI insights`, "success");
      }
    } catch (error: any) {
      this.log(`AI reasoning error: ${error.message}`, "error");
    }

    return reasoningMap;
  }

  /**
   * Rank products with diversity and AI reasoning
   */
  async rankProducts(options: { categorySlug?: string } = {}): Promise<{
    ranked: number;
    top10: { id: number; name: string; brand: string; score: number }[];
  }> {
    const { categorySlug } = options;

    this.log(`Ranking products${categorySlug ? ` in ${categorySlug}` : ""} with AI...`);

    // Get products to rank
    const enrichedProducts = await db
      .select()
      .from(products)
      .where(
        categorySlug
          ? and(
              or(eq(products.status, "enriched"), eq(products.status, "ranked")),
              eq(products.categorySlug, categorySlug)
            )
          : or(eq(products.status, "enriched"), eq(products.status, "ranked"))
      );

    this.log(`Found ${enrichedProducts.length} products to rank`);

    if (enrichedProducts.length === 0) {
      return { ranked: 0, top10: [] };
    }

    // Calculate base scores
    const scored = enrichedProducts.map((p) => ({
      ...p,
      baseScore: this.calculateBaseScore({
        rating: p.rating,
        ratingCount: p.ratingCount,
        discountPercent: p.discountPercent,
        daysSinceListing: p.daysSinceListing,
        price: p.price,
      }),
    }));

    scored.sort((a, b) => b.baseScore - a.baseScore);

    // Apply diversity
    const brandCounts: Map<string, number> = new Map();
    const diversityScored = scored.map((p) => {
      const brand = p.brand || "Unknown";
      const count = brandCounts.get(brand) || 0;
      brandCounts.set(brand, count + 1);

      let diversityMultiplier = 1;
      if (count >= MAX_BRAND_IN_TOP) {
        diversityMultiplier = Math.pow(DIVERSITY_PENALTY, count - MAX_BRAND_IN_TOP + 1);
      }

      return {
        ...p,
        finalScore: p.baseScore * diversityMultiplier,
      };
    });

    diversityScored.sort((a, b) => b.finalScore - a.finalScore);

    // Generate AI reasoning for top 30
    const top30ForAI = diversityScored.slice(0, 30).map((p, i) => ({
      rank: i + 1,
      name: p.name,
      brand: p.brand,
      rating: p.rating,
      ratingCount: p.ratingCount,
      price: p.price,
      mrp: p.mrp,
      discountPercent: p.discountPercent,
      category: p.categorySlug,
    }));

    const aiReasonings = await this.generateAIReasoning(top30ForAI);

    // Update database
    let ranked = 0;
    for (let i = 0; i < diversityScored.length; i++) {
      const p = diversityScored[i];
      const rank = i + 1;

      const aiReasoning = aiReasonings.get(rank) || null;

      await db
        .update(products)
        .set({
          bestsellerRank: rank,
          bestsellerScore: p.finalScore,
          aiReasoning,
          rankedAt: new Date().toISOString(),
          status: "ranked",
        })
        .where(eq(products.id, p.id));

      ranked++;
      if (ranked % 100 === 0) {
        this.log(`  Ranked ${ranked}/${diversityScored.length}`);
      }
    }

    await db.insert(agentLogs).values({
      agent: "ranker",
      action: "rank_complete",
      categorySlug,
      details: { ranked, uniqueBrands: brandCounts.size, aiReasoned: aiReasonings.size },
      status: "success",
      createdAt: new Date().toISOString(),
    });

    const top10 = diversityScored.slice(0, 10).map((p, i) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      score: Math.round(p.finalScore * 100) / 100,
    }));

    this.log(`Complete: ${ranked} products ranked, ${aiReasonings.size} with AI insights`);

    return { ranked, top10 };
  }

  async getTopProducts(limit = 100): Promise<any[]> {
    return await db
      .select()
      .from(products)
      .where(and(eq(products.status, "ranked"), isNotNull(products.bestsellerRank)))
      .orderBy(products.bestsellerRank)
      .limit(limit);
  }
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const ranker = new Ranker();
  (async () => {
    console.log("\n=== Running AI Ranker ===\n");
    const result = await ranker.rankProducts();
    console.log(`\nRanked ${result.ranked} products`);
    console.log("\nTop 10:");
    result.top10.forEach((p, i) => {
      console.log(`  #${i + 1} [${p.brand}] ${p.name.slice(0, 40)}... (${p.score})`);
    });
  })();
}

export default Ranker;
