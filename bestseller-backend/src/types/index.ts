// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

// Myntra API types
export interface MyntraProduct {
  productId: number;
  productName: string;
  brand: string;
  mrp: number;
  price: number;
  rating: number;
  ratingCount: number;
  discount: number;
  catalogDate?: number;
  gender?: string;
  articleType?: string;
  masterCategory?: string;
  subCategory?: string;
  season?: string;
  primaryColour?: string;
  searchImage?: string;
  relatedStylesCount?: number;
}

export interface MyntraSearchResponse {
  products: MyntraProduct[];
  totalCount: number;
  hasNextPage: boolean;
}

// Enriched product from scraping
export interface EnrichedProduct {
  id: number;
  name: string;
  brand: string;
  category?: string;
  categorySlug?: string;

  // Pricing
  mrp: number;
  price: number;
  discount?: number;
  discountPercent?: number;

  // Demand
  rating: number;
  ratingCount: number;
  salesVelocity?: number;

  // Catalog
  catalogDate?: string;
  catalogDateMs?: number;
  daysSinceListing?: number;

  // Specs
  gender?: string;
  articleType?: string;
  masterCategory?: string;
  subCategory?: string;
  season?: string;
  sizes?: string[];
  availableSizes?: string[];
  colors?: string[];
  inStock?: boolean;
  fabricType?: string;
  fit?: string;
  pattern?: string;
  sleeveLength?: string;
  occasion?: string;

  // Sourcing
  countryOfOrigin?: string;

  // Media
  description?: string;
  images?: string[];
  searchImage?: string;

  // Scrape metadata
  scrapedAt?: string;
  scrapeSuccess?: boolean;
}

// Ranked product
export interface RankedProduct extends EnrichedProduct {
  bestsellerRank: number;
  bestsellerScore: number;
  aiReasoning: string;
  rankedAt: string;
}

// Agent analysis result
export interface AgentAnalysis {
  products: RankedProduct[];
  summary: string;
  topInsights: string[];
  totalAnalyzed: number;
  successfulScrapes: number;
}

// Brand analytics
export interface BrandAnalytics {
  name: string;
  productCount: number;
  avgRating: number;
  avgPrice: number;
  topCategories: string[];
  originDistribution: Record<string, number>;
}

// Crawler status
export interface CrawlerStatus {
  isRunning: boolean;
  currentCategory?: string;
  completed: number;
  total: number;
  newProducts: number;
  errors: number;
  startedAt?: string;
  lastUpdate?: string;
}

// Category with stats
export interface CategoryWithStats {
  slug: string;
  name: string;
  path?: string;
  productCount: number;
  lastCrawledAt?: string;
  status: string;
}
