import Anthropic from "@anthropic-ai/sdk";
import type { EnrichedProduct, RankedProduct, AgentAnalysis } from "./types";

const USE_MOCK = process.env.USE_MOCK_AGENT === "true";

export async function analyzeProducts(
  products: EnrichedProduct[]
): Promise<AgentAnalysis> {
  if (USE_MOCK) {
    return mockAnalyzeProducts(products);
  }

  const anthropic = new Anthropic();
  const productSummaries = products.map((p, i) => ({
    index: i + 1,
    id: p.id,
    name: p.name,
    brand: p.brand,
    category: p.category,
    price: p.price,
    mrp: p.mrp,
    discount: p.mrp > 0 ? Math.round((1 - p.price / p.mrp) * 100) : 0,
    rating: p.rating?.toFixed(2),
    reviews: p.ratingCount,
    sizesAvailable: p.sizes?.length || "unknown",
    colors: p.colors?.length || "unknown",
    material: p.material || "not specified",
  }));

  const prompt = `You are a B2B fashion marketplace analyst. Analyze these ${products.length} products and rank them as potential bestsellers for wholesale.

PRODUCTS TO ANALYZE:
${JSON.stringify(productSummaries, null, 2)}

RANKING CRITERIA (in order of importance):
1. **Review Volume** (ratingCount): More reviews = more sales = proven demand
2. **Rating Quality** (rating): Above 4.0 = sustainable quality
3. **Price Point**: Rs 500-2000 = mass market sweet spot for B2B
4. **Discount Signal**: 30-50% discount = high velocity; >60% = possible clearance
5. **Brand Recognition**: Known brands have lower seller risk
6. **Size Availability**: More sizes = broader market

For each product, provide:
- A score from 0-100
- A brief reasoning (1-2 sentences)

RESPOND IN THIS EXACT JSON FORMAT:
{
  "rankings": [
    {
      "index": 1,
      "score": 85,
      "reasoning": "High review count (2341) with solid 4.2 rating. Price point of Rs 899 is accessible for B2B buyers. 40% discount suggests good demand."
    }
  ],
  "summary": "Brief overall summary of the batch",
  "topInsights": ["Insight 1", "Insight 2", "Insight 3"]
}

Rank ALL products. Be specific in your reasoning.`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const responseText =
    message.content[0].type === "text" ? message.content[0].text : "";

  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse agent response");
  }

  const analysis = JSON.parse(jsonMatch[0]);

  const rankedProducts: RankedProduct[] = analysis.rankings
    .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
    .map(
      (
        r: { index: number; score: number; reasoning: string },
        rank: number
      ) => {
        const product = products[r.index - 1];
        return {
          ...product,
          rank: rank + 1,
          score: r.score,
          reasoning: r.reasoning,
          analyzedAt: new Date().toISOString(),
        };
      }
    );

  return {
    products: rankedProducts,
    summary: analysis.summary,
    topInsights: analysis.topInsights,
    totalAnalyzed: products.length,
    successfulScrapes: products.filter(p => p.scrapeSuccess !== false).length,
    failedScrapes: products.filter(p => p.scrapeSuccess === false).length,
  };
}

export async function perceive(
  products: EnrichedProduct[]
): Promise<EnrichedProduct[]> {
  console.log(`[PERCEIVE] Loaded ${products.length} products`);
  return products;
}

export async function decide(
  products: EnrichedProduct[]
): Promise<AgentAnalysis> {
  console.log(`[DECIDE] Analyzing ${products.length} products with Claude...`);
  return analyzeProducts(products);
}

export async function act(analysis: AgentAnalysis): Promise<AgentAnalysis> {
  console.log(`[ACT] Ranked ${analysis.products.length} products`);
  console.log(`[ACT] Top product: ${analysis.products[0]?.name}`);
  return analysis;
}

export async function runAgent(
  products: EnrichedProduct[]
): Promise<AgentAnalysis> {
  const perceived = await perceive(products);
  const decided = await decide(perceived);
  const result = await act(decided);
  return result;
}

function mockAnalyzeProducts(products: EnrichedProduct[]): AgentAnalysis {
  const scored = products.map((p) => {
    const ratingScore = (p.rating || 0) / 5;
    const volumeScore = Math.min(Math.log(p.ratingCount + 1) / 10, 1);
    const discount = p.mrp > 0 ? (1 - p.price / p.mrp) : 0;
    const discountScore = discount > 0.6 ? 0.5 : discount > 0.3 ? 1 : 0.7;
    const priceScore = p.price < 2000 ? 1 : p.price < 5000 ? 0.7 : 0.4;

    const score = Math.round(
      (ratingScore * 30 + volumeScore * 40 + discountScore * 15 + priceScore * 15)
    );

    const reasons: string[] = [];
    if (p.ratingCount > 500) reasons.push(`High volume (${p.ratingCount} reviews)`);
    if (p.rating >= 4) reasons.push(`Strong rating (${p.rating?.toFixed(1)})`);
    if (discount > 0.3) reasons.push(`${Math.round(discount * 100)}% discount signals demand`);
    if (p.price < 2000) reasons.push(`Mass-market price point`);

    return {
      product: p,
      score,
      reasoning: reasons.length > 0
        ? reasons.join(". ") + "."
        : "Moderate signals across metrics.",
    };
  });

  const sorted = scored.sort((a, b) => b.score - a.score);

  const rankedProducts: RankedProduct[] = sorted.map((item, i) => ({
    ...item.product,
    rank: i + 1,
    score: item.score,
    reasoning: item.reasoning,
    analyzedAt: new Date().toISOString(),
  }));

  const topCategory = rankedProducts[0]?.category || "Mixed";
  const avgDiscount = Math.round(
    products.reduce((sum, p) => sum + (p.mrp > 0 ? (1 - p.price / p.mrp) * 100 : 0), 0) / products.length
  );

  return {
    products: rankedProducts,
    summary: `Analyzed ${products.length} products using algorithmic scoring (mock mode). Top performers show high review counts combined with strong ratings.`,
    topInsights: [
      `Top category: ${topCategory}`,
      `Average discount: ${avgDiscount}%`,
      `${rankedProducts.filter(p => p.score >= 70).length} products scored 70+`,
    ],
    totalAnalyzed: products.length,
    successfulScrapes: products.filter(p => p.scrapeSuccess !== false).length,
    failedScrapes: products.filter(p => p.scrapeSuccess === false).length,
  };
}
