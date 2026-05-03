"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ProductCard } from "@/components/products/ProductCard";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  X,
  Star,
  Check,
  TrendingUp,
  Sparkles,
  Package,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Product {
  id: number;
  name: string;
  price: number;
  mrp: number;
  rating: number | null;
  ratingCount: number | null;
  searchImage: string | null;
  aiReasoning: string | null;
  tags: string | null;
  bestsellerRank: number | null;
  fit: string | null;
  totalInventory: number;
}

interface Category {
  slug: string;
  name: string;
  productCount: number;
}

const QUICK_SORTS = [
  { value: "demand", label: "Trending", icon: TrendingUp },
  { value: "rating", label: "Top Rated", icon: Star },
  { value: "price", label: "Price ↑", icon: null },
  { value: "price-desc", label: "Price ↓", icon: null },
];

const PRICE_RANGES = [
  { min: 0, max: 500, label: "Under ₹500" },
  { min: 500, max: 1000, label: "₹500 - ₹1K" },
  { min: 1000, max: 2000, label: "₹1K - ₹2K" },
  { min: 2000, max: Infinity, label: "₹2K+" },
];

function LiveDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
    </span>
  );
}

function ProductSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-stone-200 shadow-sm">
      <div className="aspect-[4/5] skeleton-shimmer" />
      <div className="p-4 space-y-3">
        <div className="h-5 skeleton-shimmer rounded w-20" />
        <div className="h-4 skeleton-shimmer rounded w-full" />
        <div className="h-4 skeleton-shimmer rounded w-2/3" />
        <div className="h-8 skeleton-shimmer rounded w-24" />
      </div>
    </div>
  );
}

function MobileProductCard({ product }: { product: Product }) {
  const discount = product.mrp > product.price ? Math.round(((product.mrp - product.price) / product.mrp) * 100) : 0;
  const margin = Math.round((product.mrp - product.price) * 0.4);

  return (
    <Link href={`/products/${product.id}`} className="flex gap-3 bg-white rounded-xl p-3 border border-stone-200 hover:border-[#E07A5F]/40 hover:shadow-md transition-all">
      <div className="w-24 h-28 rounded-lg overflow-hidden bg-stone-100 flex-shrink-0 relative">
        {product.searchImage ? (
          <img src={product.searchImage} alt="" className="w-full h-full object-cover object-top" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-8 h-8 text-stone-300" />
          </div>
        )}
        {discount >= 20 && (
          <div className="absolute top-1 left-1 bg-[#E07A5F] text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
            {discount}% OFF
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 py-0.5">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-base font-bold text-stone-900">₹{product.price.toLocaleString()}</span>
          {discount > 0 && <span className="text-xs text-stone-400 line-through">₹{product.mrp.toLocaleString()}</span>}
        </div>
        {margin > 50 && (
          <div className="text-[10px] font-semibold text-emerald-600 mb-1.5">
            ~₹{margin}/pc margin
          </div>
        )}
        <h3 className="text-xs text-stone-700 line-clamp-2 leading-snug mb-2">{product.name}</h3>
        <div className="flex items-center gap-2">
          {product.rating && product.rating > 0 && (
            <div className="flex items-center gap-1 text-[10px]">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span className="font-semibold text-stone-700">{product.rating.toFixed(1)}</span>
              {product.ratingCount && <span className="text-stone-400">({product.ratingCount > 1000 ? `${(product.ratingCount/1000).toFixed(0)}K` : product.ratingCount})</span>}
            </div>
          )}
          <div className="flex items-center gap-1 text-[10px] text-emerald-600">
            <Shield className="w-3 h-3" />
            <span>Verified</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function ProductsContent() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "");
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "demand");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [minRating, setMinRating] = useState("0");
  const [priceRange, setPriceRange] = useState<{ min: number; max: number } | null>(null);
  const [priceSliderValue, setPriceSliderValue] = useState(3000);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [selectedFit, setSelectedFit] = useState<string[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const productsPerPage = 24;

  // Fetch categories with products
  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch(`${API_BASE}/api/categories`);
        const data = await res.json();
        if (data.categories) {
          // Only show categories that have products (productCount > 0)
          const validCategories = data.categories.filter((c: Category) => c.productCount > 0).slice(0, 15);
          setCategories(validCategories);
        }
      } catch {
        console.error("Failed to fetch categories");
      }
    }
    fetchCategories();
  }, []);

  // Fetch products
  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          enriched: "true",
          limit: productsPerPage.toString(),
          offset: ((currentPage - 1) * productsPerPage).toString(),
          sort: sortBy,
        });

        // Fix: "all" category means no category filter
        if (selectedCategory && selectedCategory !== "all") {
          params.append("category", selectedCategory);
        }
        if (searchQuery) params.append("q", searchQuery);
        if (minRating !== "0") params.append("minRating", minRating);
        if (priceRange) {
          params.append("minPrice", priceRange.min.toString());
          if (priceRange.max !== Infinity) params.append("maxPrice", priceRange.max.toString());
        }

        const res = await fetch(`${API_BASE}/api/products?${params}`);
        const data = await res.json();

        let filteredProducts = data.products || [];

        if (inStockOnly) {
          filteredProducts = filteredProducts.filter((p: Product) => p.totalInventory > 0);
        }
        if (selectedFit.length > 0) {
          filteredProducts = filteredProducts.filter((p: Product) =>
            p.fit && selectedFit.includes(p.fit.toLowerCase())
          );
        }

        setProducts(filteredProducts);
        setTotalProducts(data.total || filteredProducts.length);
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, [selectedCategory, sortBy, searchQuery, minRating, priceRange, inStockOnly, selectedFit, currentPage]);

  const totalPages = Math.ceil(totalProducts / productsPerPage);
  const activeFilterCount = [
    selectedCategory && selectedCategory !== "all",
    minRating !== "0",
    priceRange,
    inStockOnly,
    selectedFit.length > 0,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSelectedCategory("");
    setMinRating("0");
    setPriceRange(null);
    setInStockOnly(false);
    setSelectedFit([]);
    setCurrentPage(1);
  };

  const fitOptions = ["slim fit", "regular fit", "loose fit", "oversized"];

  const categoryName = selectedCategory && selectedCategory !== "all"
    ? categories.find(c => c.slug === selectedCategory)?.name || selectedCategory.replace(/-/g, " ")
    : "All Products";

  return (
    <div className="min-h-screen bg-[#FFFBF7]">
      {/* HEADER */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center h-14 gap-4 md:gap-6">
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 bg-stone-900 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">T</span>
              </div>
              <span className="font-semibold text-stone-900 hidden sm:block">TradeProof</span>
            </Link>

            <div className="flex-1 max-w-xl">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="w-full h-10 pl-10 pr-4 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-[#E07A5F] focus:ring-2 focus:ring-[#E07A5F]/10 transition-all"
                />
                <svg className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/" className="text-sm font-medium text-stone-600 hover:text-stone-900 hidden md:block">Sign in</Link>
              <Button size="sm" className="bg-[#E07A5F] hover:bg-[#D16A4F] text-white rounded-xl">
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* ANIMATED HERO SECTION */}
      <section className="relative bulk-order-bg overflow-hidden">
        {/* Animated particles background */}
        <div className="absolute inset-0 particles-bg opacity-40" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#E07A5F] opacity-10 rounded-full -translate-y-1/2 translate-x-1/4 blur-3xl bulk-order-glow" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#E07A5F] opacity-10 rounded-full translate-y-1/2 -translate-x-1/4 blur-2xl bulk-order-float" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="hero-animate-1 flex items-center gap-2 mb-2">
                <Link href="/" className="text-stone-400 hover:text-white text-sm transition-colors">Home</Link>
                <span className="text-stone-600">/</span>
                <span className="text-white text-sm font-medium">{categoryName}</span>
              </div>
              <h1 className="hero-animate-2 text-2xl md:text-4xl font-bold tracking-tight">
                <span className="gradient-text hero-glow">{categoryName}</span>
              </h1>
              <p className="hero-animate-3 text-stone-400 mt-2 text-sm md:text-base">
                Data-backed products with verified demand signals
              </p>
            </div>
            <div className="flex items-center gap-4 md:gap-6">
              <div className="text-center">
                <div className="flex items-center gap-1.5 justify-center">
                  <LiveDot />
                  <span className="text-2xl md:text-3xl font-bold text-white tabular-nums">{totalProducts.toLocaleString()}</span>
                </div>
                <span className="text-xs text-stone-400">Products</span>
              </div>
              <div className="w-px h-10 bg-stone-700" />
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-[#E07A5F]">100+</div>
                <span className="text-xs text-stone-400">MOQ</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STICKY FILTER BAR */}
      <div className="bg-white border-b border-stone-200 sticky top-14 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between gap-3 py-3">
            {/* Sort Pills */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
              {QUICK_SORTS.map((sort) => (
                <button
                  key={sort.value}
                  onClick={() => { setSortBy(sort.value); setCurrentPage(1); }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-all",
                    sortBy === sort.value
                      ? "bg-stone-900 text-white"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  )}
                >
                  {sort.icon && <sort.icon className="w-3.5 h-3.5" />}
                  {sort.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {/* View Toggle - Desktop */}
              <div className="hidden md:flex items-center gap-1 bg-stone-100 p-1 rounded-lg">
                <button
                  onClick={() => setViewMode("grid")}
                  className={cn("p-1.5 rounded", viewMode === "grid" ? "bg-white shadow-sm" : "text-stone-500")}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M1 2.5A1.5 1.5 0 012.5 1h3A1.5 1.5 0 017 2.5v3A1.5 1.5 0 015.5 7h-3A1.5 1.5 0 011 5.5v-3zm8 0A1.5 1.5 0 0110.5 1h3A1.5 1.5 0 0115 2.5v3A1.5 1.5 0 0113.5 7h-3A1.5 1.5 0 019 5.5v-3zm-8 8A1.5 1.5 0 012.5 9h3A1.5 1.5 0 017 10.5v3A1.5 1.5 0 015.5 15h-3A1.5 1.5 0 011 13.5v-3zm8 0A1.5 1.5 0 0110.5 9h3a1.5 1.5 0 011.5 1.5v3a1.5 1.5 0 01-1.5 1.5h-3A1.5 1.5 0 019 13.5v-3z"/>
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={cn("p-1.5 rounded", viewMode === "list" ? "bg-white shadow-sm" : "text-stone-500")}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                    <path fillRule="evenodd" d="M2.5 12a.5.5 0 01.5-.5h10a.5.5 0 010 1H3a.5.5 0 01-.5-.5zm0-4a.5.5 0 01.5-.5h10a.5.5 0 010 1H3a.5.5 0 01-.5-.5zm0-4a.5.5 0 01.5-.5h10a.5.5 0 010 1H3a.5.5 0 01-.5-.5z"/>
                  </svg>
                </button>
              </div>

              {/* Filter Button */}
              <button
                onClick={() => setShowMobileFilters(true)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-full transition-all",
                  activeFilterCount > 0
                    ? "bg-[#E07A5F] text-white"
                    : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                )}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">Filters</span>
                {activeFilterCount > 0 && (
                  <span className="w-5 h-5 bg-white text-[#E07A5F] rounded-full text-xs font-bold flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Active Filter Pills */}
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-2 pb-3 overflow-x-auto scrollbar-hide">
              {selectedCategory && selectedCategory !== "all" && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-[#FEF1EE] text-[#E07A5F] text-xs font-medium rounded-full">
                  {categoryName}
                  <button onClick={() => setSelectedCategory("")} className="hover:bg-[#E07A5F]/10 rounded-full p-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {priceRange && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-[#FEF1EE] text-[#E07A5F] text-xs font-medium rounded-full">
                  {priceRange.label || `₹${priceRange.min}-${priceRange.max}`}
                  <button onClick={() => setPriceRange(null)} className="hover:bg-[#E07A5F]/10 rounded-full p-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {minRating !== "0" && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-[#FEF1EE] text-[#E07A5F] text-xs font-medium rounded-full">
                  {minRating}★+
                  <button onClick={() => setMinRating("0")} className="hover:bg-[#E07A5F]/10 rounded-full p-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {inStockOnly && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-[#FEF1EE] text-[#E07A5F] text-xs font-medium rounded-full">
                  In Stock
                  <button onClick={() => setInStockOnly(false)} className="hover:bg-[#E07A5F]/10 rounded-full p-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              <button onClick={clearFilters} className="text-xs text-stone-500 hover:text-stone-700 font-medium whitespace-nowrap">
                Clear all
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex gap-6">
          {/* SIDEBAR - Desktop */}
          <aside className="hidden lg:block w-56 shrink-0">
            <div className="sticky top-36 space-y-6">
              {/* Categories */}
              <div className="bg-white rounded-2xl border border-stone-200 p-4">
                <h3 className="font-semibold text-stone-900 mb-3 text-sm flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#E07A5F]" />
                  Categories
                </h3>
                <div className="space-y-0.5 max-h-64 overflow-y-auto">
                  <button
                    onClick={() => { setSelectedCategory(""); setCurrentPage(1); }}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm rounded-lg transition-all",
                      !selectedCategory || selectedCategory === "all"
                        ? "bg-[#E07A5F] text-white font-medium"
                        : "text-stone-600 hover:bg-stone-50"
                    )}
                  >
                    All Products
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.slug}
                      onClick={() => { setSelectedCategory(cat.slug); setCurrentPage(1); }}
                      className={cn(
                        "w-full text-left px-3 py-2 text-sm rounded-lg transition-all flex items-center justify-between",
                        selectedCategory === cat.slug
                          ? "bg-[#E07A5F] text-white font-medium"
                          : "text-stone-600 hover:bg-stone-50"
                      )}
                    >
                      <span className="truncate">{cat.name}</span>
                      <span className={cn("text-xs", selectedCategory === cat.slug ? "text-white/70" : "text-stone-400")}>
                        {cat.productCount > 1000 ? `${Math.round(cat.productCount/1000)}K` : cat.productCount}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Range Slider */}
              <div className="bg-white rounded-2xl border border-stone-200 p-4">
                <h3 className="font-semibold text-stone-900 mb-4 text-sm">Price Range</h3>
                <div className="space-y-4">
                  <div className="px-1">
                    <input
                      type="range"
                      min="100"
                      max="5000"
                      step="100"
                      value={priceSliderValue}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setPriceSliderValue(val);
                        setPriceRange({ min: 0, max: val });
                        setCurrentPage(1);
                      }}
                      className="price-slider w-full"
                      style={{ '--progress': `${((priceSliderValue - 100) / 4900) * 100}%` } as React.CSSProperties}
                    />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-stone-500">₹100</span>
                    <span className="font-semibold text-[#E07A5F]">Up to ₹{priceSliderValue.toLocaleString()}</span>
                    <span className="text-stone-500">₹5000</span>
                  </div>
                  <div className="flex gap-2">
                    {[500, 1000, 2000, 3000].map((val) => (
                      <button
                        key={val}
                        onClick={() => { setPriceSliderValue(val); setPriceRange({ min: 0, max: val }); setCurrentPage(1); }}
                        className={cn(
                          "flex-1 py-1.5 text-xs font-medium rounded-lg transition-all",
                          priceSliderValue === val
                            ? "bg-[#E07A5F] text-white"
                            : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                        )}
                      >
                        ₹{val >= 1000 ? `${val/1000}K` : val}
                      </button>
                    ))}
                  </div>
                  {priceRange && (
                    <button
                      onClick={() => { setPriceRange(null); setPriceSliderValue(3000); setCurrentPage(1); }}
                      className="w-full text-xs text-stone-500 hover:text-stone-700 py-1"
                    >
                      Clear price filter
                    </button>
                  )}
                </div>
              </div>

              {/* Rating */}
              <div className="bg-white rounded-2xl border border-stone-200 p-4">
                <h3 className="font-semibold text-stone-900 mb-3 text-sm">Rating</h3>
                <div className="space-y-1">
                  {[4, 3, 0].map((rating) => (
                    <button
                      key={rating}
                      onClick={() => { setMinRating(rating.toString()); setCurrentPage(1); }}
                      className={cn(
                        "w-full text-left px-3 py-2 text-sm rounded-lg transition-all flex items-center gap-2",
                        minRating === rating.toString()
                          ? "bg-[#FEF1EE] text-[#E07A5F] font-medium"
                          : "text-stone-600 hover:bg-stone-50"
                      )}
                    >
                      {minRating === rating.toString() && <Check className="w-3.5 h-3.5" />}
                      {rating > 0 ? (
                        <>
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          {rating}+ stars
                        </>
                      ) : (
                        "All ratings"
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* In Stock */}
              <div className="bg-white rounded-2xl border border-stone-200 p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => { setInStockOnly(e.target.checked); setCurrentPage(1); }}
                    className="w-4 h-4 rounded border-stone-300 text-[#E07A5F] focus:ring-[#E07A5F]"
                  />
                  <span className="text-sm font-medium text-stone-700">In Stock Only</span>
                </label>
              </div>

              {/* Trust Banner */}
              <div className="bg-gradient-to-br from-stone-900 to-stone-800 rounded-2xl p-4 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-[#E07A5F]" />
                  <span className="font-semibold text-sm">Verified Data</span>
                </div>
                <p className="text-xs text-stone-400 leading-relaxed">
                  Every product backed by real market ratings & reviews from millions of shoppers.
                </p>
              </div>
            </div>
          </aside>

          {/* PRODUCT GRID */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className={cn(
                "grid gap-4",
                viewMode === "grid" ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : "grid-cols-1"
              )}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <ProductSkeleton key={i} />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Package className="w-10 h-10 text-stone-300" />
                </div>
                <h3 className="text-xl font-semibold text-stone-900 mb-2">No products found</h3>
                <p className="text-stone-500 mb-6 max-w-sm mx-auto">
                  Try adjusting your filters or search for something else
                </p>
                <Button onClick={clearFilters} className="bg-[#E07A5F] hover:bg-[#D16A4F] text-white rounded-xl">
                  Clear All Filters
                </Button>
              </div>
            ) : (
              <>
                {/* Mobile: List view option */}
                <div className="md:hidden mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-stone-500">{totalProducts.toLocaleString()} products</span>
                    <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg">
                      <button
                        onClick={() => setViewMode("grid")}
                        className={cn("p-1.5 rounded", viewMode === "grid" ? "bg-white shadow-sm" : "text-stone-500")}
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M1 2.5A1.5 1.5 0 012.5 1h3A1.5 1.5 0 017 2.5v3A1.5 1.5 0 015.5 7h-3A1.5 1.5 0 011 5.5v-3zm8 0A1.5 1.5 0 0110.5 1h3A1.5 1.5 0 0115 2.5v3A1.5 1.5 0 0113.5 7h-3A1.5 1.5 0 019 5.5v-3zm-8 8A1.5 1.5 0 012.5 9h3A1.5 1.5 0 017 10.5v3A1.5 1.5 0 015.5 15h-3A1.5 1.5 0 011 13.5v-3zm8 0A1.5 1.5 0 0110.5 9h3a1.5 1.5 0 011.5 1.5v3a1.5 1.5 0 01-1.5 1.5h-3A1.5 1.5 0 019 13.5v-3z"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => setViewMode("list")}
                        className={cn("p-1.5 rounded", viewMode === "list" ? "bg-white shadow-sm" : "text-stone-500")}
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                          <path fillRule="evenodd" d="M2.5 12a.5.5 0 01.5-.5h10a.5.5 0 010 1H3a.5.5 0 01-.5-.5zm0-4a.5.5 0 01.5-.5h10a.5.5 0 010 1H3a.5.5 0 01-.5-.5zm0-4a.5.5 0 01.5-.5h10a.5.5 0 010 1H3a.5.5 0 01-.5-.5z"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Product Grid/List */}
                {viewMode === "list" ? (
                  <div className="space-y-3">
                    {products.map((product) => (
                      <MobileProductCard key={product.id} product={product} />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                    {products.map((product) => (
                      <ProductCard
                        key={product.id}
                        id={product.id}
                        name={product.name}
                        image={product.searchImage}
                        price={product.price}
                        mrp={product.mrp}
                        rating={product.rating}
                        ratingCount={product.ratingCount}
                        aiReasoning={product.aiReasoning}
                        tags={product.tags}
                        bestsellerRank={product.bestsellerRank}
                      />
                    ))}
                  </div>
                )}

                {/* Load More / Pagination */}
                {totalPages > 1 && (
                  <div className="mt-10 flex flex-col items-center gap-4">
                    <div className="w-full max-w-xs bg-stone-200 rounded-full h-1.5">
                      <div
                        className="bg-[#E07A5F] h-1.5 rounded-full transition-all"
                        style={{ width: `${(currentPage / totalPages) * 100}%` }}
                      />
                    </div>
                    <p className="text-sm text-stone-500">
                      Page {currentPage} of {totalPages} · Showing {Math.min(currentPage * productsPerPage, totalProducts)} of {totalProducts.toLocaleString()}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                        disabled={currentPage === 1}
                        className="w-10 h-10 rounded-xl border border-stone-300 flex items-center justify-center hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                        disabled={currentPage === totalPages}
                        className="px-6 h-10 rounded-xl bg-[#E07A5F] text-white font-medium flex items-center gap-2 hover:bg-[#D16A4F] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Next Page
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* MOBILE FILTERS DRAWER */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowMobileFilters(false)} />
          <div className="absolute inset-y-0 right-0 w-full max-w-sm bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-stone-200">
              <h2 className="font-semibold text-stone-900 text-lg">Filters</h2>
              <button onClick={() => setShowMobileFilters(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Categories */}
              <div>
                <h3 className="font-semibold text-stone-900 mb-3">Categories</h3>
                <div className="space-y-1">
                  <button
                    onClick={() => { setSelectedCategory(""); setShowMobileFilters(false); }}
                    className={cn("w-full text-left px-3 py-2.5 text-sm rounded-xl transition-all", !selectedCategory ? "bg-[#E07A5F] text-white font-medium" : "bg-stone-50 text-stone-700")}
                  >
                    All Products
                  </button>
                  {categories.slice(0, 10).map((cat) => (
                    <button
                      key={cat.slug}
                      onClick={() => { setSelectedCategory(cat.slug); setShowMobileFilters(false); }}
                      className={cn("w-full text-left px-3 py-2.5 text-sm rounded-xl transition-all flex justify-between", selectedCategory === cat.slug ? "bg-[#E07A5F] text-white font-medium" : "bg-stone-50 text-stone-700")}
                    >
                      <span>{cat.name}</span>
                      <span className={selectedCategory === cat.slug ? "text-white/70" : "text-stone-400"}>{cat.productCount > 1000 ? `${Math.round(cat.productCount/1000)}K` : cat.productCount}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Price */}
              <div>
                <h3 className="font-semibold text-stone-900 mb-3">Price Range</h3>
                <div className="grid grid-cols-2 gap-2">
                  {PRICE_RANGES.map((range) => (
                    <button
                      key={range.label}
                      onClick={() => setPriceRange(priceRange?.min === range.min ? null : range)}
                      className={cn("px-3 py-2.5 text-sm rounded-xl transition-all", priceRange?.min === range.min ? "bg-[#E07A5F] text-white font-medium" : "bg-stone-50 text-stone-700")}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rating */}
              <div>
                <h3 className="font-semibold text-stone-900 mb-3">Minimum Rating</h3>
                <div className="flex gap-2">
                  {[0, 3, 4].map((rating) => (
                    <button
                      key={rating}
                      onClick={() => setMinRating(rating.toString())}
                      className={cn("flex-1 px-3 py-2.5 text-sm rounded-xl transition-all flex items-center justify-center gap-1", minRating === rating.toString() ? "bg-[#E07A5F] text-white font-medium" : "bg-stone-50 text-stone-700")}
                    >
                      {rating > 0 && <Star className={cn("w-3.5 h-3.5", minRating === rating.toString() ? "fill-white text-white" : "fill-amber-400 text-amber-400")} />}
                      {rating > 0 ? `${rating}+` : "All"}
                    </button>
                  ))}
                </div>
              </div>

              {/* In Stock */}
              <label className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="w-5 h-5 rounded border-stone-300 text-[#E07A5F] focus:ring-[#E07A5F]"
                />
                <span className="font-medium text-stone-700">In Stock Only</span>
              </label>
            </div>
            <div className="p-4 border-t border-stone-200 flex gap-3">
              <button onClick={clearFilters} className="flex-1 py-3 text-sm font-medium text-stone-700 bg-stone-100 rounded-xl hover:bg-stone-200 transition-colors">
                Clear All
              </button>
              <button onClick={() => setShowMobileFilters(false)} className="flex-1 py-3 text-sm font-medium text-white bg-[#E07A5F] rounded-xl hover:bg-[#D16A4F] transition-colors">
                Show {totalProducts.toLocaleString()} Results
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="bg-stone-900 text-white mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-[#E07A5F] rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">T</span>
                </div>
                <span className="font-semibold">TradeProof</span>
              </div>
              <p className="text-stone-400 text-sm leading-relaxed">
                Data-driven B2B fashion sourcing for smart retailers.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Products</h4>
              <ul className="space-y-2 text-sm text-stone-400">
                <li><Link href="/products" className="hover:text-white transition-colors">All Products</Link></li>
                <li><Link href="/products?sort=demand" className="hover:text-white transition-colors">Trending</Link></li>
                <li><Link href="/products?sort=rating" className="hover:text-white transition-colors">Top Rated</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-stone-400">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">FAQs</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-sm text-stone-400">
                <li>support@tradeproof.in</li>
                <li>+91 98765 43210</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-stone-800 mt-10 pt-6 text-center text-sm text-stone-500">
            © 2026 TradeProof. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FFFBF7] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#E07A5F] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ProductsContent />
    </Suspense>
  );
}
