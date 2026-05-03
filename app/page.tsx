"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ProductCard, ProductCardSkeleton } from "@/components/products";

const API_BASE = "http://localhost:3001";

interface Product {
  id: number;
  name: string;
  brand: string;
  price: number;
  mrp: number;
  rating: number | null;
  ratingCount: number | null;
  searchImage: string | null;
  aiReasoning: string | null;
  tags: string | null;
  bestsellerRank: number | null;
}

function removeBrand(name: string, brand: string): string {
  if (!brand) return name;
  const words = name.split(" ");
  if (words[0]?.toLowerCase() === brand.toLowerCase()) {
    return words.slice(1).join(" ");
  }
  return name;
}

interface CategoryWithImage {
  name: string;
  slug: string;
  count: string;
  image?: string;
}

const DEFAULT_CATEGORIES: CategoryWithImage[] = [
  { name: "Thermal Tops", slug: "thermal-tops", count: "4.2K" },
  { name: "Thermal Bottoms", slug: "thermal-bottoms", count: "3.1K" },
  { name: "Shorts", slug: "shorts", count: "2.8K" },
  { name: "Thermals Sets", slug: "thermal-sets", count: "1.5K" },
  { name: "Winter Wear", slug: "winter-wear", count: "5.2K" },
  { name: "All Products", slug: "all", count: "17K" },
];

function LiveDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="live-dot absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
    </span>
  );
}

function SectionHeader({
  title,
  subtitle,
  href,
  liveIndicator = false
}: {
  title: string;
  subtitle?: string;
  href?: string;
  liveIndicator?: boolean;
}) {
  return (
    <div className="flex items-end justify-between mb-8">
      <div>
        <div className="flex items-center gap-3">
          <h2 className="text-2xl md:text-[1.75rem] font-semibold tracking-tight text-stone-900">{title}</h2>
          {liveIndicator && (
            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
              <LiveDot />
              LIVE DATA
            </span>
          )}
        </div>
        {subtitle && <p className="text-sm mt-1.5 text-stone-500 tracking-wide">{subtitle}</p>}
      </div>
      {href && (
        <Link
          href={href}
          className="group text-sm font-medium flex items-center gap-1.5 text-[#E07A5F] hover:text-[#c96a52] transition-colors"
        >
          View All
          <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      )}
    </div>
  );
}

function ScrollButtons({ scrollRef }: { scrollRef: React.RefObject<HTMLDivElement | null> }) {
  const scroll = (dir: "left" | "right") => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir === "left" ? -320 : 320, behavior: "smooth" });
    }
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={() => scroll("left")}
        className="w-10 h-10 rounded-full border border-stone-200 bg-white flex items-center justify-center hover:bg-stone-50 hover:border-[#E07A5F] hover:text-[#E07A5F] transition-all duration-200 shadow-sm hover:shadow-md"
        aria-label="Scroll left"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        onClick={() => scroll("right")}
        className="w-10 h-10 rounded-full border border-stone-200 bg-white flex items-center justify-center hover:bg-stone-50 hover:border-[#E07A5F] hover:text-[#E07A5F] transition-all duration-200 shadow-sm hover:shadow-md"
        aria-label="Scroll right"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalProducts, setTotalProducts] = useState(17000);
  const [categories, setCategories] = useState<CategoryWithImage[]>(DEFAULT_CATEGORIES);
  const bestSellersRef = useRef<HTMLDivElement>(null);
  const newArrivalsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch(`${API_BASE}/api/products?enriched=true&limit=20&sort=demand`);
        const data = await res.json();
        const productList = data.products || [];
        setProducts(productList);
        setTotalProducts(data.total || 17000);

        // Create categories from actual product data with images
        if (productList.length > 0) {
          const categoryMap = new Map<string, { name: string; image: string; count: number }>();
          productList.forEach((p: Product) => {
            const type = (p as unknown as { articleType?: string }).articleType || "Other";
            if (!categoryMap.has(type)) {
              categoryMap.set(type, { name: type, image: p.searchImage || "", count: 1 });
            } else {
              const existing = categoryMap.get(type)!;
              existing.count++;
            }
          });

          const dynamicCategories: CategoryWithImage[] = Array.from(categoryMap.entries())
            .slice(0, 6)
            .map(([key, val]) => ({
              name: val.name,
              slug: key.toLowerCase().replace(/\s+/g, "-"),
              count: val.count > 1000 ? `${(val.count / 1000).toFixed(1)}K` : `${val.count}`,
              image: val.image,
            }));

          setCategories(dynamicCategories);
        }
      } catch (err) {
        console.error("Failed to fetch products:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  return (
    <div className="min-h-screen bg-[#FFFBF7]">
      {/* ===== HEADER ===== */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-50">
        {/* Top Bar */}
        <div className="bg-stone-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-10 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="text-stone-400">New Seller?</span>
              <span className="font-semibold text-[#E07A5F]">Get 10% off your first order</span>
              <Link href="/register" className="text-white hover:text-[#E07A5F] ml-2 font-medium">→ Register</Link>
            </div>
            <div className="hidden md:flex items-center gap-6 text-stone-400">
              <Link href="#" className="hover:text-white transition-colors">Help</Link>
              <Link href="#" className="hover:text-white transition-colors">Track Order</Link>
            </div>
          </div>
        </div>

        {/* Main Header */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center h-16 gap-8">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 shrink-0">
              <div className="w-10 h-10 bg-stone-900 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-xl">T</span>
              </div>
              <div className="hidden sm:block">
                <div className="text-xl font-bold text-stone-900 tracking-tight">TradeProof</div>
                <div className="text-[10px] text-stone-500 uppercase tracking-widest -mt-0.5">B2B Marketplace</div>
              </div>
            </Link>

            {/* Search */}
            <div className="flex-1 max-w-2xl hidden md:block">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search 17,000+ products..."
                  className="w-full h-11 pl-5 pr-24 bg-stone-50 border-2 border-stone-200 rounded-xl text-sm focus:outline-none focus:border-[#E07A5F] focus:bg-white transition-all placeholder:text-stone-400"
                />
                <button className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 px-5 bg-[#E07A5F] hover:bg-[#c96a52] text-white text-sm font-medium rounded-lg transition-colors">
                  Search
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 ml-auto">
              <button className="md:hidden p-2">
                <svg className="w-5 h-5 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              <Link href="/login" className="text-sm font-medium text-stone-600 hover:text-stone-900 hidden sm:block">
                Sign in
              </Link>
              <Link href="/register" className="h-10 px-5 bg-stone-900 hover:bg-stone-800 text-white text-sm font-semibold rounded-xl flex items-center transition-colors">
                Get Started
              </Link>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="border-t border-stone-100 hidden md:block">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <nav className="flex items-center h-11 gap-8 text-sm">
              <button className="flex items-center gap-2 font-semibold text-stone-900 hover:text-[#E07A5F] transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                All Categories
              </button>
              <Link href="#" className="text-stone-600 hover:text-[#E07A5F] transition-colors">Best Sellers</Link>
              <Link href="#" className="text-stone-600 hover:text-[#E07A5F] transition-colors">New Arrivals</Link>
              <Link href="#" className="text-stone-600 hover:text-[#E07A5F] transition-colors">Top Rated</Link>
              <Link href="#" className="text-stone-600 hover:text-[#E07A5F] transition-colors flex items-center gap-1.5">
                Flash Deals
                <span className="bg-[#E07A5F] text-white text-[10px] font-bold px-1.5 py-0.5 rounded">HOT</span>
              </Link>
              <div className="ml-auto text-stone-500">
                <Link href="#" className="hover:text-stone-900 transition-colors">Bulk Orders</Link>
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* ===== SECTION 1: HERO WITH SIDEBAR ===== */}
      <section className="bg-[#FFFBF7] py-6 md:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col lg:flex-row gap-5">
            {/* Category Sidebar */}
            <div className="hidden lg:block w-56 shrink-0">
              <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-stone-100 font-semibold text-stone-900 text-sm flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#E07A5F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  Shop by Category
                </div>
                <nav className="py-2">
                  {categories.slice(0, 6).map((cat, i) => (
                    <Link
                      key={cat.slug}
                      href={`/products?category=${cat.slug}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-[#FEF1EE] transition-all duration-200 group"
                      style={{ animationDelay: `${i * 50}ms` }}
                    >
                      <div className="flex items-center gap-3">
                        {cat.image ? (
                          <div className="w-8 h-8 rounded-lg overflow-hidden bg-stone-100 flex-shrink-0">
                            <img src={cat.image} alt="" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                            </svg>
                          </div>
                        )}
                        <span className="text-sm text-stone-700 group-hover:text-[#E07A5F] transition-colors">{cat.name}</span>
                      </div>
                      <span className="text-xs text-stone-400 font-medium">{cat.count}</span>
                    </Link>
                  ))}
                </nav>
              </div>
            </div>

            {/* Hero Content */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Main Banner */}
              <div className="md:col-span-2 bulk-order-bg rounded-2xl p-6 md:p-10 text-white relative overflow-hidden shadow-xl">
                {/* Animated particles background */}
                <div className="absolute inset-0 particles-bg opacity-40" />
                {/* Decorative circles with animation */}
                <div className="absolute top-0 right-0 w-80 h-80 bg-[#E07A5F] opacity-[0.15] rounded-full -translate-y-1/2 translate-x-1/4 blur-xl bulk-order-glow" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#E07A5F] opacity-[0.12] rounded-full translate-y-1/2 -translate-x-1/4 blur-lg bulk-order-float" />
                <div className="absolute top-1/2 right-1/4 w-40 h-40 bg-[#FCD9BD] opacity-[0.08] rounded-full blur-md bulk-order-float-delay" />

                <div className="relative z-10">
                  <p className="hero-animate-1 text-[#E07A5F] font-semibold text-xs md:text-sm mb-3 flex items-center gap-2 tracking-wide uppercase">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                    </svg>
                    B2B Fashion Intelligence
                  </p>
                  <h1 className="text-2xl md:text-4xl font-bold mb-4 leading-[1.15] tracking-tight">
                    <span className="hero-animate-2 block gradient-text hero-glow">Stock What Sells.</span>
                    <span className="hero-animate-3 block text-stone-400">Skip the Guesswork.</span>
                  </h1>
                  <p className="hero-animate-4 text-stone-400 text-sm md:text-base mb-6 max-w-md leading-relaxed">
                    Every product backed by real market data. Ratings, reviews, and demand signals from millions of online shoppers.
                  </p>
                  <div className="hero-animate-5 flex flex-wrap gap-3">
                    <Link href="/products" className="btn-primary inline-flex items-center gap-2 px-5 md:px-6 py-3 bg-[#E07A5F] hover:bg-[#c96a52] text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-[#E07A5F]/25">
                      Browse Products
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </Link>
                    <Link href="/register" className="px-5 md:px-6 py-3 border border-stone-600 text-white font-semibold rounded-xl text-sm hover:bg-white/10 hover:border-stone-500 transition-all">
                      Get Started
                    </Link>
                  </div>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-3 md:grid-cols-1 gap-3 md:gap-4">
                <div className="bg-white rounded-2xl p-4 md:p-5 border border-stone-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs md:text-sm text-stone-500">Products</span>
                    <LiveDot />
                  </div>
                  <div className="text-xl md:text-2xl font-bold text-stone-900 tracking-tight">{totalProducts.toLocaleString()}+</div>
                  <div className="text-[10px] md:text-xs text-emerald-600 mt-1.5 hidden md:flex items-center gap-1 font-medium">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                    </svg>
                    +2,341 this week
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-4 md:p-5 border border-stone-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-xs md:text-sm text-stone-500 mb-1">Suppliers</div>
                  <div className="text-xl md:text-2xl font-bold text-stone-900 tracking-tight">10+</div>
                  <div className="text-[10px] md:text-xs text-emerald-600 mt-1.5 hidden md:flex items-center gap-1 font-medium">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    All verified
                  </div>
                </div>

                <div className="bg-[#1C1917] rounded-2xl p-4 md:p-5 text-white shadow-lg">
                  <div className="text-[10px] md:text-sm text-stone-400 mb-1">First Order?</div>
                  <div className="text-lg md:text-2xl font-bold text-[#E07A5F] tracking-tight">10% OFF</div>
                  <Link href="/register" className="mt-2.5 md:mt-3 block text-center bg-[#E07A5F] text-white py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-semibold hover:bg-[#c96a52] transition-all hover:shadow-lg hover:shadow-[#E07A5F]/25">
                    Register
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== SECTION 2: TRUST BAR ===== */}
      <section className="bg-white border-b border-stone-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {[
              { icon: "📦", title: "17,000+ Products", desc: "Curated catalog", color: "bg-amber-50" },
              { icon: "✓", title: "Verified Suppliers", desc: "Quality assured", color: "bg-emerald-50" },
              { icon: "🚚", title: "7-10 Days Delivery", desc: "Pan-India shipping", color: "bg-blue-50" },
              { icon: "↩", title: "Easy Returns", desc: "Hassle-free process", color: "bg-rose-50" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4 group">
                <div className={`w-12 h-12 ${item.color} rounded-xl flex items-center justify-center text-xl transition-transform duration-200 group-hover:scale-105`}>
                  {item.icon}
                </div>
                <div>
                  <div className="font-semibold text-stone-900 text-sm tracking-tight">{item.title}</div>
                  <div className="text-xs text-stone-500">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== SECTION 3: CATEGORIES ===== */}
      <section className="bg-[#FFFBF7] py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <SectionHeader title="Shop by Category" subtitle="Browse our most popular categories" href="/products" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 stagger">
            {categories.map((cat, i) => (
              <Link
                key={cat.slug}
                href={`/products?category=${cat.slug}`}
                className="group bg-white rounded-2xl overflow-hidden border border-stone-200 hover:border-[#E07A5F]/50 hover:shadow-lg hover:shadow-stone-200/50 transition-all duration-300 card-hover"
              >
                <div className="aspect-square relative overflow-hidden bg-stone-100">
                  {cat.image ? (
                    <img
                      src={cat.image}
                      alt={cat.name}
                      loading="lazy"
                      className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-stone-100 to-stone-200">
                      <svg className="w-10 h-10 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  {/* Overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-900/70 via-transparent to-transparent" />
                  {/* Category info */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                    <div className="font-semibold text-sm leading-tight">{cat.name}</div>
                    <div className="text-xs text-stone-300 mt-0.5">{cat.count} items</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===== SECTION 4: BEST SELLERS (Carousel) ===== */}
      <section className="bg-white py-14 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-end justify-between mb-8">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl md:text-[1.75rem] font-semibold tracking-tight text-stone-900">Best Sellers</h2>
                <span className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                  <LiveDot />
                  LIVE
                </span>
              </div>
              <p className="text-sm mt-1.5 text-stone-500 tracking-wide">Top performing products based on demand signals</p>
            </div>
            <div className="flex items-center gap-4">
              <ScrollButtons scrollRef={bestSellersRef} />
              <Link href="/products?sort=bestseller" className="group text-sm font-medium text-[#E07A5F] hover:text-[#c96a52] hidden sm:flex items-center gap-1 transition-colors">
                View All
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
          <div ref={bestSellersRef} className="scroll-container gap-5 pb-4 -mx-4 px-4">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="scroll-item w-[280px]">
                    <ProductCardSkeleton />
                  </div>
                ))
              : products.slice(0, 8).map((p, i) => (
                  <div key={p.id} className="scroll-item w-[280px]" style={{ animationDelay: `${i * 80}ms` }}>
                    <ProductCard
                      id={p.id}
                      name={removeBrand(p.name, p.brand)}
                      image={p.searchImage}
                      price={p.price}
                      mrp={p.mrp}
                      rating={p.rating}
                      ratingCount={p.ratingCount}
                      aiReasoning={p.aiReasoning}
                      tags={p.tags}
                      bestsellerRank={p.bestsellerRank}
                      isVerified
                    />
                  </div>
                ))}
          </div>
        </div>
      </section>

      {/* ===== SECTION 5: NEW ARRIVALS (Carousel) ===== */}
      <section className="bg-stone-50/80 py-14 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-end justify-between mb-8">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl md:text-[1.75rem] font-semibold tracking-tight text-stone-900">New Arrivals</h2>
                <span className="text-[10px] font-bold text-[#E07A5F] bg-[#FEF1EE] px-2.5 py-1 rounded-full border border-[#E07A5F]/20">
                  FRESH
                </span>
              </div>
              <p className="text-sm mt-1.5 text-stone-500 tracking-wide">Fresh styles just added to the catalog</p>
            </div>
            <div className="flex items-center gap-4">
              <ScrollButtons scrollRef={newArrivalsRef} />
              <Link href="/products?sort=newest" className="group text-sm font-medium text-[#E07A5F] hover:text-[#c96a52] hidden sm:flex items-center gap-1 transition-colors">
                View All
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
          <div ref={newArrivalsRef} className="scroll-container gap-5 pb-4 -mx-4 px-4">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="scroll-item w-[280px]">
                    <ProductCardSkeleton />
                  </div>
                ))
              : products.slice(4, 12).map((p, i) => (
                  <div key={p.id} className="scroll-item w-[280px]" style={{ animationDelay: `${i * 80}ms` }}>
                    <ProductCard
                      id={p.id}
                      name={removeBrand(p.name, p.brand)}
                      image={p.searchImage}
                      price={p.price}
                      mrp={p.mrp}
                      rating={p.rating}
                      ratingCount={p.ratingCount}
                      aiReasoning={p.aiReasoning}
                      tags={p.tags}
                      bestsellerRank={p.bestsellerRank}
                      isVerified
                    />
                  </div>
                ))}
          </div>
        </div>
      </section>

      {/* ===== SECTION 6: BULK ORDER BANNER (Animated) ===== */}
      <section className="bg-white py-14 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="relative rounded-3xl overflow-hidden shadow-2xl bulk-order-bg">
            {/* Animated particles overlay */}
            <div className="absolute inset-0 particles-bg" />

            {/* Animated glowing orbs */}
            <div className="absolute top-0 right-0 w-96 h-96 rounded-full bulk-order-glow bulk-order-float" style={{ background: 'radial-gradient(circle, rgba(224, 122, 95, 0.3) 0%, transparent 65%)', transform: 'translate(15%, -35%)' }} />
            <div className="absolute bottom-0 left-1/4 w-72 h-72 rounded-full bulk-order-glow bulk-order-float-delay" style={{ background: 'radial-gradient(circle, rgba(252, 217, 189, 0.2) 0%, transparent 65%)', transform: 'translate(-50%, 40%)' }} />
            <div className="absolute top-1/2 left-0 w-48 h-48 rounded-full bulk-order-glow" style={{ background: 'radial-gradient(circle, rgba(224, 122, 95, 0.15) 0%, transparent 65%)', transform: 'translate(-30%, -50%)', animationDelay: '-1s' }} />

            <div className="relative z-10 grid md:grid-cols-2 gap-8 p-8 md:p-14">
              <div>
                <span className="inline-flex items-center gap-1.5 bg-[#E07A5F]/20 text-[#E07A5F] text-[10px] font-bold px-3 py-1.5 rounded-full mb-5 border border-[#E07A5F]/30 tracking-wider backdrop-blur-sm">
                  <svg className="w-3.5 h-3.5 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  BULK ORDER SPECIAL
                </span>
                <h3 className="text-3xl md:text-4xl font-bold text-white mb-5 leading-[1.15] tracking-tight">
                  Order 500+ Pieces<br />& Save 15%
                </h3>
                <p className="text-stone-400 mb-8 leading-relaxed text-base">
                  Unlock exclusive bulk pricing on orders over 500 pieces. Quality guaranteed, delivery within 10 days across India.
                </p>
                <Link href="/register" className="btn-primary inline-flex items-center gap-2.5 bg-[#E07A5F] hover:bg-[#c96a52] text-white font-semibold px-7 py-3.5 rounded-xl transition-all shadow-lg shadow-[#E07A5F]/30 hover:shadow-xl hover:shadow-[#E07A5F]/40 group">
                  Claim Offer
                  <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </div>
              <div className="hidden md:flex items-center justify-center">
                <div className="grid grid-cols-2 gap-4 text-center">
                  {[
                    { value: "500+", label: "Min Pieces", highlight: false },
                    { value: "15%", label: "Discount", highlight: true },
                    { value: "10", label: "Days Delivery", highlight: false },
                    { value: "100%", label: "Quality Check", highlight: false },
                  ].map((item, i) => (
                    <div key={i} className="bg-white/[0.08] backdrop-blur-sm rounded-2xl p-6 border border-white/[0.08] hover:bg-white/[0.15] hover:border-white/[0.15] transition-all duration-300 hover:scale-105">
                      <div className={`text-3xl font-bold tracking-tight ${item.highlight ? 'text-[#E07A5F]' : 'text-white'}`}>{item.value}</div>
                      <div className="text-stone-400 text-sm mt-1">{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== SECTION 7: TOP RATED (Grid) ===== */}
      <section className="bg-stone-50/80 py-14 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <SectionHeader title="Top Rated" subtitle="Highest rated products by verified buyers" href="/products?sort=rating" liveIndicator />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 md:gap-6 stagger">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
              : products.slice(8, 12).map((p, i) => (
                  <div key={p.id} style={{ animationDelay: `${i * 100}ms` }}>
                    <ProductCard
                      id={p.id}
                      name={removeBrand(p.name, p.brand)}
                      image={p.searchImage}
                      price={p.price}
                      mrp={p.mrp}
                      rating={p.rating}
                      ratingCount={p.ratingCount}
                      aiReasoning={p.aiReasoning}
                      tags={p.tags}
                      bestsellerRank={p.bestsellerRank}
                      isVerified
                    />
                  </div>
                ))}
          </div>
        </div>
      </section>

      {/* ===== SECTION 8: VALUE PROPS ===== */}
      <section className="bg-white py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-stone-900 mb-4 tracking-tight">Why Retailers Choose TradeProof</h2>
            <p className="text-stone-500 max-w-2xl mx-auto text-base leading-relaxed">Join thousands of retailers who trust TradeProof for their fashion sourcing needs</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 md:gap-8 stagger">
            {[
              {
                icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
                title: "Market Intelligence",
                desc: "Real ratings and reviews from major platforms. Know what's selling before you stock it.",
                color: "bg-amber-50 text-amber-600 border-amber-100",
              },
              {
                icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
                title: "Verified Suppliers",
                desc: "All manufacturers verified with quality assurance. Returns accepted for defects.",
                color: "bg-emerald-50 text-emerald-600 border-emerald-100",
              },
              {
                icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
                title: "Fast Fulfillment",
                desc: "MOQ from 100 pieces. Sample orders available. Pan-India delivery in 7-10 days.",
                color: "bg-blue-50 text-blue-600 border-blue-100",
              },
            ].map((item, i) => (
              <div key={i} className="group bg-stone-50/80 rounded-2xl p-8 md:p-10 text-center hover:shadow-xl hover:shadow-stone-200/50 transition-all duration-300 border border-stone-100 hover:border-stone-200 card-hover">
                <div className={`w-16 h-16 ${item.color} rounded-2xl flex items-center justify-center mx-auto mb-6 border transition-transform duration-300 group-hover:scale-110`}>
                  {item.icon}
                </div>
                <h3 className="text-xl font-semibold text-stone-900 mb-3 tracking-tight">{item.title}</h3>
                <p className="text-stone-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== SECTION 9: NEWSLETTER ===== */}
      <section className="relative overflow-hidden bg-[#E07A5F]">
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="absolute top-0 left-0 w-72 h-72 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/10 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-20 relative z-10 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">Stay Updated</h2>
          <p className="text-white/80 mb-10 max-w-lg mx-auto text-base leading-relaxed">Get notified about new arrivals, trending products, and exclusive deals for retailers.</p>
          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 h-12 px-5 rounded-xl bg-white/15 border-2 border-white/25 text-white placeholder:text-white/60 focus:outline-none focus:bg-white/25 focus:border-white/40 transition-all text-base"
            />
            <button className="h-12 px-8 bg-stone-900 text-white font-semibold rounded-xl hover:bg-stone-800 transition-all hover:shadow-lg">
              Subscribe
            </button>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="bg-stone-900 text-white">
        {/* Main Footer */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 lg:gap-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-10 h-10 bg-[#E07A5F] rounded-xl flex items-center justify-center">
                  <span className="font-bold text-xl text-white">T</span>
                </div>
                <span className="text-xl font-bold">TradeProof</span>
              </div>
              <p className="text-stone-400 text-sm mb-6 leading-relaxed">Data-backed wholesale fashion marketplace for Indian retailers.</p>
              <div className="flex gap-3">
                {[
                  { icon: "f", label: "Facebook" },
                  { icon: "t", label: "Twitter" },
                  { icon: "in", label: "Instagram" },
                  { icon: "li", label: "LinkedIn" },
                ].map((s) => (
                  <a key={s.label} href="#" className="w-10 h-10 bg-stone-800 rounded-lg flex items-center justify-center hover:bg-[#E07A5F] transition-colors" aria-label={s.label}>
                    <span className="text-xs font-bold text-stone-400 group-hover:text-white">{s.icon}</span>
                  </a>
                ))}
              </div>
            </div>

            {/* Categories */}
            <div>
              <h4 className="font-semibold mb-5 text-white">Categories</h4>
              <ul className="space-y-3 text-sm text-stone-400">
                <li><Link href="#" className="hover:text-[#E07A5F] transition-colors">Men's Clothing</Link></li>
                <li><Link href="#" className="hover:text-[#E07A5F] transition-colors">Women's Clothing</Link></li>
                <li><Link href="#" className="hover:text-[#E07A5F] transition-colors">Kids Wear</Link></li>
                <li><Link href="#" className="hover:text-[#E07A5F] transition-colors">Accessories</Link></li>
                <li><Link href="#" className="hover:text-[#E07A5F] transition-colors">Footwear</Link></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-semibold mb-5 text-white">Company</h4>
              <ul className="space-y-3 text-sm text-stone-400">
                <li><Link href="#" className="hover:text-[#E07A5F] transition-colors">About Us</Link></li>
                <li><Link href="#" className="hover:text-[#E07A5F] transition-colors">Careers</Link></li>
                <li><Link href="#" className="hover:text-[#E07A5F] transition-colors">Press</Link></li>
                <li><Link href="#" className="hover:text-[#E07A5F] transition-colors">Blog</Link></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="font-semibold mb-5 text-white">Support</h4>
              <ul className="space-y-3 text-sm text-stone-400">
                <li><Link href="#" className="hover:text-[#E07A5F] transition-colors">Help Center</Link></li>
                <li><Link href="#" className="hover:text-[#E07A5F] transition-colors">Contact Us</Link></li>
                <li><Link href="#" className="hover:text-[#E07A5F] transition-colors">Shipping Info</Link></li>
                <li><Link href="#" className="hover:text-[#E07A5F] transition-colors">Returns</Link></li>
                <li><Link href="#" className="hover:text-[#E07A5F] transition-colors">FAQs</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold mb-5 text-white">Legal</h4>
              <ul className="space-y-3 text-sm text-stone-400">
                <li><Link href="#" className="hover:text-[#E07A5F] transition-colors">Privacy Policy</Link></li>
                <li><Link href="#" className="hover:text-[#E07A5F] transition-colors">Terms of Service</Link></li>
                <li><Link href="#" className="hover:text-[#E07A5F] transition-colors">Refund Policy</Link></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-stone-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-stone-500">
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Secure Payments
                </span>
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Verified Suppliers
                </span>
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  GST Invoice
                </span>
              </div>
              <p className="text-stone-500 text-sm">© 2025 TradeProof. Made with ❤️ in India</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
