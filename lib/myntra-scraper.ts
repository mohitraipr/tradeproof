import type { EnrichedProduct, Product, SizeInfo } from "./types";

export async function fetchMyntraProduct(
  styleId: number
): Promise<Partial<EnrichedProduct> | null> {
  try {
    const url = `https://www.myntra.com/${styleId}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!response.ok) {
      console.log(`[Scraper] Failed to fetch ${styleId}: ${response.status}`);
      return null;
    }

    const html = await response.text();

    // === BASIC INFO ===
    const nameMatch = html.match(/"name"\s*:\s*"([^"]+)"/);
    const brandMatch = html.match(/"brand"\s*:\s*\{[^}]*"name"\s*:\s*"([^"]+)"/);
    const genderMatch = html.match(/"gender"\s*:\s*"([^"]+)"/);
    const articleTypeMatch = html.match(/"articleType"\s*:\s*"([^"]+)"/);
    const masterCategoryMatch = html.match(/"masterCategory"\s*:\s*"([^"]+)"/);
    const subCategoryMatch = html.match(/"subCategory"\s*:\s*"([^"]+)"/);
    const seasonMatch = html.match(/"season"\s*:\s*"([^"]+)"/);

    // === PRICING ===
    const discountedPriceMatch = html.match(/"discountedPrice"\s*:\s*(\d+)/);
    const priceMatch = html.match(/"price"\s*:\s*(\d+)/);
    const mrpMatch = html.match(/"mrp"\s*:\s*(\d+)/);

    // === RATINGS ===
    const ratingMatch = html.match(/"averageRating"\s*:\s*([\d.]+)/);
    const countMatch = html.match(/"totalCount"\s*:\s*(\d+)/);

    // === SIZES (with availability) ===
    const sizes: string[] = [];
    const availableSizes: string[] = [];
    const sizeChart: SizeInfo[] = [];

    // Find sizes array - it has nested objects, so we need to extract individual size entries
    // Pattern: "skuId":NUMBER,"styleId":NUMBER,..."label":"SIZE","available":BOOL
    const sizeMatches = html.matchAll(/"skuId"\s*:\s*(\d+),"styleId"\s*:\d+[^}]*?"label"\s*:\s*"([^"]+)"[^}]*?"available"\s*:\s*(true|false)/g);
    for (const match of sizeMatches) {
      const skuId = parseInt(match[1]);
      const label = match[2];
      const isAvailable = match[3] === "true";

      if (!sizes.includes(label)) {
        sizes.push(label);
        if (isAvailable) {
          availableSizes.push(label);
        }
        sizeChart.push({
          label,
          available: isAvailable,
          skuId,
        });
      }
    }

    // === COLORS ===
    const colors: string[] = [];
    // Extract colors from the colours array - look for color objects with label
    const colorMatches = html.matchAll(/"colours"\s*:\s*\[[\s\S]*?"label"\s*:\s*"([^"]+)"/g);
    for (const match of colorMatches) {
      if (match[1] && !colors.includes(match[1])) {
        colors.push(match[1]);
      }
    }
    // Also try alternate pattern for product colors
    if (colors.length === 0) {
      const baseColorMatch = html.match(/"baseColour"\s*:\s*"([^"]+)"/);
      if (baseColorMatch) {
        colors.push(baseColorMatch[1]);
      }
    }

    // === PRODUCT SPECIFICATIONS ===
    const materialMatch = html.match(/"Material"\s*:\s*"([^"]+)"/);
    const compositionMatch = html.match(/"materialComposition"\s*:\s*"([^"]+)"/);
    const fabricMatch = html.match(/"Fabric"\s*:\s*"([^"]+)"/) || html.match(/"Fabrics"\s*:\s*"([^"]+)"/);
    const fitMatch = html.match(/"Fit"\s*:\s*"([^"]+)"/);
    const patternMatch = html.match(/"Pattern"\s*:\s*"([^"]+)"/) || html.match(/"Patterns"\s*:\s*"([^"]+)"/);
    const sleeveMatch = html.match(/"Sleeve Length"\s*:\s*"([^"]+)"/) || html.match(/"Sleeves"\s*:\s*"([^"]+)"/);
    const neckMatch = html.match(/"Neck"\s*:\s*"([^"]+)"/) || html.match(/"Neckline"\s*:\s*"([^"]+)"/);
    const collarMatch = html.match(/"Collar"\s*:\s*"([^"]+)"/);
    const closureMatch = html.match(/"Closure"\s*:\s*"([^"]+)"/);
    const lengthMatch = html.match(/"Length"\s*:\s*"([^"]+)"/);
    const occasionMatch = html.match(/"Occasion"\s*:\s*"([^"]+)"/) || html.match(/"Occasions"\s*:\s*"([^"]+)"/);
    const washCareMatch = html.match(/"Wash Care"\s*:\s*"([^"]+)"/) || html.match(/"Care Instructions"\s*:\s*"([^"]+)"/);
    const typeMatch = html.match(/"Type"\s*:\s*"([^"]+)"/);
    const hoodMatch = html.match(/"Hood"\s*:\s*"([^"]+)"/);

    // === BUSINESS CRITICAL - MANUFACTURING & SOURCING ===
    const countryMatch = html.match(/"countryOfOrigin"\s*:\s*"([^"]+)"/);
    const manufacturerMatch = html.match(/"manufacturerInfo"\s*:\s*"([^"]+)"/);
    const packerMatch = html.match(/"packerInfo"\s*:\s*"([^"]+)"/);
    const importerMatch = html.match(/"importerInfo"\s*:\s*"([^"]+)"/);
    const sellerMatch = html.match(/"sellerName"\s*:\s*"([^"]+)"/);
    const sellerIdMatch = html.match(/"sellerPartnerId"\s*:\s*(\d+)/);

    // === INVENTORY & DEMAND SIGNALS ===
    const outOfStockMatch = html.match(/"outOfStock"\s*:\s*(true|false)/);

    // === CATALOG DATE (for velocity calculation) ===
    const catalogDateMatch = html.match(/"catalogDate"\s*:\s*"?(\d+)"?/);
    let catalogDate: string | undefined;
    let catalogDateMs: number | undefined;
    let daysSinceListing: number | undefined;
    let salesVelocity: number | undefined;

    if (catalogDateMatch) {
      catalogDateMs = parseInt(catalogDateMatch[1]);
      catalogDate = new Date(catalogDateMs).toISOString();
      const now = Date.now();
      daysSinceListing = Math.floor((now - catalogDateMs) / (1000 * 60 * 60 * 24));

      // Calculate sales velocity (reviews per day as proxy for sales)
      const ratingCountVal = countMatch ? parseInt(countMatch[1]) : 0;
      if (daysSinceListing > 0 && ratingCountVal > 0) {
        salesVelocity = Math.round((ratingCountVal / daysSinceListing) * 100) / 100;
      }
    }

    // === MEDIA ===
    const descMatch = html.match(/"description"\s*:\s*"([^"]{10,500})"/);
    const searchImageMatch = html.match(/"searchImage"\s*:\s*"([^"]+)"/);

    // Extract multiple images
    const images: string[] = [];
    const imageMatches = html.matchAll(/"imageURL"\s*:\s*"([^"]+)"/g);
    for (const match of imageMatches) {
      if (match[1] && !images.includes(match[1])) {
        images.push(match[1]);
      }
    }
    // Also try alternate image patterns
    const altImageMatches = html.matchAll(/"src"\s*:\s*"(https:\/\/assets\.myntassets\.com\/[^"]+)"/g);
    for (const match of altImageMatches) {
      if (match[1] && !images.includes(match[1]) && images.length < 6) {
        images.push(match[1]);
      }
    }

    // === CALCULATE DERIVED VALUES ===
    const price = discountedPriceMatch
      ? parseInt(discountedPriceMatch[1])
      : priceMatch
      ? parseInt(priceMatch[1])
      : undefined;

    const mrp = mrpMatch ? parseInt(mrpMatch[1]) : undefined;

    let discount: number | undefined;
    let discountPercent: number | undefined;
    if (mrp && price && mrp > price) {
      discount = mrp - price;
      discountPercent = Math.round((discount / mrp) * 100);
    }

    // Clean up description (remove HTML tags)
    let description = descMatch?.[1];
    if (description) {
      description = description
        .replace(/\\u003C[^>]*\\u003E/g, " ")
        .replace(/\\u002F/g, "/")
        .replace(/\s+/g, " ")
        .trim();
    }

    // === BUILD ENRICHED DATA ===
    const enrichedData: Partial<EnrichedProduct> = {
      // Basic Info
      name: nameMatch?.[1],
      brand: brandMatch?.[1],
      gender: genderMatch?.[1],
      articleType: articleTypeMatch?.[1],
      masterCategory: masterCategoryMatch?.[1],
      subCategory: subCategoryMatch?.[1],
      season: seasonMatch?.[1],

      // Pricing
      price,
      mrp,
      discount,
      discountPercent,

      // Ratings
      rating: ratingMatch ? parseFloat(ratingMatch[1]) : undefined,
      ratingCount: countMatch ? parseInt(countMatch[1]) : undefined,

      // Sizes & Colors
      sizes: sizes.length > 0 ? sizes : undefined,
      availableSizes: availableSizes.length > 0 ? availableSizes : undefined,
      sizeChart: sizeChart.length > 0 ? sizeChart : undefined,
      colors: colors.length > 0 ? colors : undefined,
      inStock: availableSizes.length > 0,

      // Product Specifications
      material: materialMatch?.[1] || compositionMatch?.[1],
      fabricType: fabricMatch?.[1],
      fit: fitMatch?.[1],
      pattern: patternMatch?.[1],
      sleeveLength: sleeveMatch?.[1],
      neckType: neckMatch?.[1],
      collar: collarMatch?.[1],
      closure: closureMatch?.[1],
      length: lengthMatch?.[1],
      occasion: occasionMatch?.[1],
      washCare: washCareMatch?.[1],
      productType: typeMatch?.[1],
      hood: hoodMatch?.[1],

      // Business Critical - Manufacturing & Sourcing
      countryOfOrigin: countryMatch?.[1],
      manufacturerInfo: manufacturerMatch?.[1]?.replace(/\\u002F/g, "/"),
      packerInfo: packerMatch?.[1]?.replace(/\\u002F/g, "/"),
      importerInfo: importerMatch?.[1]?.replace(/\\u002F/g, "/"),
      seller: sellerMatch?.[1],
      sellerPartnerId: sellerIdMatch ? parseInt(sellerIdMatch[1]) : undefined,

      // Inventory & Demand Signals
      outOfStock: outOfStockMatch?.[1] === "true",

      // Catalog & Velocity Data
      catalogDate,
      catalogDateMs,
      daysSinceListing,
      salesVelocity,

      // Media
      description,
      images: images.length > 0 ? images : undefined,
      searchImage: searchImageMatch?.[1],

      // Metadata
      scrapedAt: new Date().toISOString(),
      scrapeSuccess: true,
    };

    // Count how many fields we got
    const fieldCount = Object.values(enrichedData).filter(v => v !== undefined).length;
    console.log(`[Scraper] ✓ Fetched ${styleId}: ${enrichedData.name?.substring(0, 30)}... (${fieldCount} fields)`);

    return enrichedData;
  } catch (error) {
    console.error(`[Scraper] Error fetching ${styleId}:`, error);
    return { scrapeSuccess: false, scrapedAt: new Date().toISOString() };
  }
}

export async function enrichProducts(
  products: Product[],
  options: { delayMs?: number; onProgress?: (current: number, total: number, product: EnrichedProduct) => void } = {}
): Promise<EnrichedProduct[]> {
  const { delayMs = 500, onProgress } = options;
  const enriched: EnrichedProduct[] = [];

  console.log(`[Scraper] Enriching ${products.length} products from Myntra...`);

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    console.log(`[Scraper] Fetching ${i + 1}/${products.length}: ID ${product.id}`);

    const myntraData = await fetchMyntraProduct(product.id);

    const enrichedProduct: EnrichedProduct = {
      ...product,
      // Override with Myntra data if available
      name: myntraData?.name || product.name,
      brand: myntraData?.brand || product.brand,
      price: myntraData?.price || product.price,
      mrp: myntraData?.mrp || product.mrp,
      rating: myntraData?.rating || product.rating,
      ratingCount: myntraData?.ratingCount || product.ratingCount,
      // All enriched fields
      gender: myntraData?.gender,
      articleType: myntraData?.articleType,
      masterCategory: myntraData?.masterCategory,
      subCategory: myntraData?.subCategory,
      season: myntraData?.season,
      sizes: myntraData?.sizes || [],
      availableSizes: myntraData?.availableSizes,
      sizeChart: myntraData?.sizeChart,
      colors: myntraData?.colors || [],
      inStock: myntraData?.inStock,
      material: myntraData?.material,
      fabricType: myntraData?.fabricType,
      fit: myntraData?.fit,
      pattern: myntraData?.pattern,
      sleeveLength: myntraData?.sleeveLength,
      neckType: myntraData?.neckType,
      collar: myntraData?.collar,
      closure: myntraData?.closure,
      length: myntraData?.length,
      occasion: myntraData?.occasion,
      washCare: myntraData?.washCare,
      productType: myntraData?.productType,
      hood: myntraData?.hood,
      countryOfOrigin: myntraData?.countryOfOrigin,
      manufacturerInfo: myntraData?.manufacturerInfo,
      packerInfo: myntraData?.packerInfo,
      importerInfo: myntraData?.importerInfo,
      seller: myntraData?.seller,
      sellerPartnerId: myntraData?.sellerPartnerId,
      // Inventory & Demand
      outOfStock: myntraData?.outOfStock,
      // Catalog & Velocity
      catalogDate: myntraData?.catalogDate,
      catalogDateMs: myntraData?.catalogDateMs,
      daysSinceListing: myntraData?.daysSinceListing,
      salesVelocity: myntraData?.salesVelocity,
      // Media
      description: myntraData?.description,
      images: myntraData?.images,
      searchImage: myntraData?.searchImage,
      discount: myntraData?.discount,
      discountPercent: myntraData?.discountPercent,
      scrapedAt: myntraData?.scrapedAt,
      scrapeSuccess: myntraData?.scrapeSuccess ?? false,
    };

    enriched.push(enrichedProduct);

    if (onProgress) {
      onProgress(i + 1, products.length, enrichedProduct);
    }

    // Rate limiting
    if (i < products.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  const successCount = enriched.filter(p => p.scrapeSuccess).length;
  console.log(`[Scraper] Completed: ${successCount}/${enriched.length} successful scrapes`);

  return enriched;
}

// Utility to extract specific fields for analysis
export function extractAnalysisFields(product: EnrichedProduct) {
  return {
    // Identity
    id: product.id,
    name: product.name,
    brand: product.brand,
    category: product.category,

    // Market signals
    price: product.price,
    mrp: product.mrp,
    discountPercent: product.discountPercent,
    rating: product.rating,
    ratingCount: product.ratingCount,

    // Manufacturing specs
    material: product.material,
    fabricType: product.fabricType,
    fit: product.fit,
    pattern: product.pattern,
    countryOfOrigin: product.countryOfOrigin,

    // Availability signals
    inStock: product.inStock,
    availableSizesCount: product.availableSizes?.length || 0,
    totalSizes: product.sizes?.length || 0,

    // Sourcing info
    hasManufacturerInfo: !!product.manufacturerInfo,
    seller: product.seller,
  };
}
