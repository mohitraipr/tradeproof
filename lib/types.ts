// Base product from local JSON files
export interface Product {
  id: number;
  name: string;
  brand: string;
  mrp: number;
  price: number;
  rating: number;
  ratingCount: number;
  category?: string;
  categorySlug?: string;
}

// Enriched with Myntra scraper data - ALL available fields
export interface EnrichedProduct extends Product {
  // Basic Info (from Myntra)
  gender?: string;
  articleType?: string;
  masterCategory?: string;
  subCategory?: string;
  season?: string;

  // Product Specifications
  sizes?: string[];
  sizeChart?: SizeInfo[];
  colors?: string[];
  material?: string;
  fabricType?: string;
  fit?: string;
  pattern?: string;
  sleeveLength?: string;
  neckType?: string;
  collar?: string;
  closure?: string;
  length?: string;
  occasion?: string;
  washCare?: string;
  productType?: string;
  hood?: string;

  // Business Critical - Manufacturing & Sourcing
  countryOfOrigin?: string;
  manufacturerInfo?: string;
  packerInfo?: string;
  importerInfo?: string;
  seller?: string;

  // Media
  description?: string;
  images?: string[];
  searchImage?: string;

  // Delivery & Availability
  deliveryInfo?: string;
  inStock?: boolean;
  availableSizes?: string[];
  outOfStock?: boolean;

  // Inventory & Demand Signals
  // (warehouseCount, supplyType, procurementDays removed - not needed for analysis)

  // Catalog & Velocity Data
  catalogDate?: string; // When product was listed
  catalogDateMs?: number; // Timestamp in ms
  daysSinceListing?: number; // Calculated field
  salesVelocity?: number; // ratingCount / daysSinceListing

  // Seller Data
  sellerPartnerId?: number;

  // Pricing Analysis
  discount?: number;
  discountPercent?: number;

  // Scrape metadata
  scrapedAt?: string;
  scrapeSuccess?: boolean;
}

export interface SizeInfo {
  label: string;
  available: boolean;
  skuId?: number;
  measurements?: {
    type: string;
    name: string;
    value: string;
    unit: string;
  }[];
}

// Ranked by AI Agent
export interface RankedProduct extends EnrichedProduct {
  rank: number;
  score: number;
  reasoning: string;
  analyzedAt: string;

  // Additional AI insights
  bestsellerSignals?: string[];
  manufacturingPotential?: string;
  marketSegment?: string;
  competitivePosition?: string;
}

export interface AgentAnalysis {
  products: RankedProduct[];
  summary: string;
  topInsights: string[];
  categoryBreakdown?: CategoryInsight[];
  manufacturingRecommendations?: string[];
  totalAnalyzed: number;
  successfulScrapes: number;
  failedScrapes: number;
}

export interface CategoryInsight {
  category: string;
  productCount: number;
  avgRating: number;
  avgPrice: number;
  topBrands: string[];
  dominantMaterial?: string;
  mainOrigin?: string;
}

export interface CategoryData {
  category: string;
  slug: string;
  totalOnMyntra: number;
  fetched: number;
  fetchedAt: string;
  products: Product[];
}

// Filter configuration
export interface FilterConfig {
  excludeCategories?: string[];
  includeCategories?: string[];
  minRating?: number;
  minRatingCount?: number;
  maxPrice?: number;
  minPrice?: number;
  brands?: string[];
  materials?: string[];
  origins?: string[];
}
