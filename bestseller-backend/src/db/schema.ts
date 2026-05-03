import {
  sqliteTable,
  integer,
  text,
  real,
  index,
} from "drizzle-orm/sqlite-core";

// Categories table - tracks product counts per category
export const categories = sqliteTable("categories", {
  slug: text("slug").primaryKey(),
  name: text("name").notNull(),
  path: text("path"), // e.g., "Men > Topwear > T-Shirts"
  url: text("url"),
  productCount: integer("product_count").default(0),
  previousCount: integer("previous_count").default(0),
  lastCheckedAt: text("last_checked_at"),
  lastChangedAt: text("last_changed_at"),
  status: text("status").default("idle"), // idle, crawling, complete
  isActive: integer("is_active", { mode: "boolean" }).default(true),
});

// Products table - main product data
export const products = sqliteTable(
  "products",
  {
    id: integer("id").primaryKey(), // Myntra style ID
    name: text("name").notNull(),
    brand: text("brand").notNull(),
    categorySlug: text("category_slug").references(() => categories.slug),

    // Pricing
    mrp: integer("mrp"),
    price: integer("price"),
    discount: integer("discount"),
    discountPercent: integer("discount_percent"),

    // Demand signals - CORE RANKING DATA
    rating: real("rating"),
    ratingCount: integer("rating_count"),
    reviewsCount: integer("reviews_count"),
    reviewImagesCount: integer("review_images_count"), // Reviews with photos = quality

    // Urgency metrics - REAL-TIME DEMAND SIGNALS
    pdpViews: integer("pdp_views"), // Page views
    cartCount: integer("cart_count"), // In shopping carts NOW
    wishlistCount: integer("wishlist_count"), // Wishlisted
    purchasedCount: integer("purchased_count"), // Recent purchases - GOLD!

    // Ratings breakdown (JSON for analysis)
    ratingBreakdown: text("rating_breakdown", { mode: "json" }).$type<{rating: number, count: number}[]>(),
    isFastFashion: integer("is_fast_fashion", { mode: "boolean" }),

    // Catalog timing
    catalogDateMs: integer("catalog_date_ms"),
    daysSinceListing: integer("days_since_listing"),
    salesVelocity: real("sales_velocity"),
    season: text("season"), // summer, winter, etc.
    catalogYear: text("catalog_year"),

    // Inventory signals
    totalInventory: integer("total_inventory"),
    totalSizes: integer("total_sizes"),
    availableSizesCount: integer("available_sizes_count"),
    availablePercentage: integer("available_percentage"),
    isOutOfStock: integer("is_out_of_stock", { mode: "boolean" }),

    // Product variants
    colorVariantsCount: integer("color_variants_count"),
    isGrouped: integer("is_grouped", { mode: "boolean" }),
    groupedStyleIds: text("grouped_style_ids"),

    // Tags (can include "Bestseller", "Trending", etc.)
    tags: text("tags"),

    // Flags & policies
    codEnabled: integer("cod_enabled", { mode: "boolean" }),
    emiEnabled: integer("emi_enabled", { mode: "boolean" }),
    isReturnable: integer("is_returnable", { mode: "boolean" }),
    returnPeriodDays: integer("return_period_days"),

    // Basic info from crawler
    gender: text("gender"),
    articleType: text("article_type"),
    primaryColour: text("primary_colour"),
    searchImage: text("search_image"),

    // Enriched fields (filled by Enricher)
    images: text("images", { mode: "json" }).$type<string[]>(),
    sizes: text("sizes", { mode: "json" }).$type<string[]>(),
    availableSizes: text("available_sizes", { mode: "json" }).$type<string[]>(),
    fabricType: text("fabric_type"),
    fit: text("fit"),
    pattern: text("pattern"),
    sleeveLength: text("sleeve_length"),
    occasion: text("occasion"),
    countryOfOrigin: text("country_of_origin"),
    description: text("description"),

    // Ranking (filled by Ranker)
    bestsellerRank: integer("bestseller_rank"),
    bestsellerScore: real("bestseller_score"),
    aiReasoning: text("ai_reasoning"),
    rankedAt: text("ranked_at"),

    // Status tracking
    status: text("status").default("pending"), // pending, enriched, ranked
    enrichedAt: text("enriched_at"),
    createdAt: text("created_at"),
    updatedAt: text("updated_at"),
    isActive: integer("is_active", { mode: "boolean" }).default(true),
  },
  (table) => [
    index("idx_products_category").on(table.categorySlug),
    index("idx_products_status").on(table.status),
    index("idx_products_rank").on(table.bestsellerRank),
    index("idx_products_brand").on(table.brand),
  ]
);

// Queue table - for agent communication
export const productQueue = sqliteTable(
  "product_queue",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    styleId: integer("style_id").notNull(),
    categorySlug: text("category_slug"),
    action: text("action").notNull(), // enrich, rank
    priority: integer("priority").default(0),
    status: text("status").default("pending"), // pending, processing, done, failed
    attempts: integer("attempts").default(0),
    error: text("error"),
    createdAt: text("created_at"),
    processedAt: text("processed_at"),
  },
  (table) => [
    index("idx_queue_status").on(table.status),
    index("idx_queue_action").on(table.action),
  ]
);

// Style ID Queue - for collecting style IDs before enrichment
export const styleIdQueue = sqliteTable(
  "style_id_queue",
  {
    styleId: integer("style_id").primaryKey(),
    categorySlug: text("category_slug").notNull(),
    source: text("source").notNull(), // "popularity" or "new"
    sourceRank: integer("source_rank"), // position in the source list (1-500 or 1-100)
    status: text("status").default("pending"), // pending, enriched, failed
    createdAt: text("created_at"),
  },
  (table) => [
    index("idx_style_queue_category").on(table.categorySlug),
    index("idx_style_queue_status").on(table.status),
  ]
);

// Agent logs - track what each agent does
export const agentLogs = sqliteTable(
  "agent_logs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    agent: text("agent").notNull(), // monitor, crawler, enricher, ranker
    action: text("action").notNull(),
    categorySlug: text("category_slug"),
    details: text("details", { mode: "json" }).$type<Record<string, any>>(),
    status: text("status"), // success, error, warning
    errorMessage: text("error_message"),
    createdAt: text("created_at"),
  },
  (table) => [
    index("idx_logs_agent").on(table.agent),
    index("idx_logs_created").on(table.createdAt),
  ]
);

// Types
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type QueueItem = typeof productQueue.$inferSelect;
export type StyleIdQueueItem = typeof styleIdQueue.$inferSelect;
export type AgentLog = typeof agentLogs.$inferSelect;
