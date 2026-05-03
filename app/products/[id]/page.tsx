"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Search,
  Star,
  Package,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  ShieldCheck,
  Truck,
  Clock,
  Minus,
  Plus,
  Check,
  BadgeCheck,
  TrendingUp,
  RotateCcw,
  Zap,
  Calculator,
  Info,
  Heart,
  Share2,
  MapPin,
  Sparkles,
  Tag,
  CreditCard,
  ArrowRight,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Product {
  id: number;
  name: string;
  brand: string;
  price: number;
  mrp: number;
  rating: number | null;
  ratingCount: number | null;
  searchImage: string | null;
  images: string[];
  discountPercent: number | null;
  categorySlug: string | null;
  season?: string;
  sizes: string[];
  availableSizes: string[];
  primaryColour: string;
  isGrouped: boolean;
  groupedStyleIds: string;
  aiReasoning: string | null;
  tags: string | null;
  sleeveLength: string | null;
  fit: string | null;
  pattern: string | null;
  fabricType: string | null;
  returnPeriodDays: number;
  codEnabled: boolean;
  totalInventory: number;
  bestsellerRank: number | null;
  gender: string | null;
  articleType: string | null;
}

interface ColorVariant {
  id: number;
  name: string;
  primaryColour: string;
  searchImage: string | null;
}

function formatPrice(price: number): string {
  return "₹" + price.toLocaleString("en-IN");
}

function formatNumber(num: number): string {
  if (num >= 100000) return `${(num / 100000).toFixed(1)}L`;
  if (num >= 1000) return `${(num / 1000).toFixed(num >= 10000 ? 0 : 1)}K`;
  return num.toString();
}

function LiveDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
    </span>
  );
}

function StarRating({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const starSize = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={cn(starSize, star <= Math.floor(rating) ? "text-amber-400" : "text-stone-200")}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function TagBadge({ tag }: { tag: string }) {
  const getTagStyle = (t: string) => {
    const lower = t.toLowerCase();
    if (lower.includes("top rated") || lower.includes("premium"))
      return "bg-amber-50 text-amber-700 border-amber-200";
    if (lower.includes("price drop") || lower.includes("save") || lower.includes("deal") || lower.includes("steal"))
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (lower.includes("festive"))
      return "bg-purple-50 text-purple-700 border-purple-200";
    if (lower.includes("sale"))
      return "bg-[#FEF1EE] text-[#E07A5F] border-[#E07A5F]/20";
    return "bg-stone-50 text-stone-600 border-stone-200";
  };

  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded border", getTagStyle(tag))}>
      <Tag className="w-2.5 h-2.5" />
      {tag}
    </span>
  );
}

function RelatedProductCard({ product }: { product: Product }) {
  const discount = product.mrp > product.price ? Math.round(((product.mrp - product.price) / product.mrp) * 100) : 0;
  const savings = product.mrp - product.price;

  return (
    <Link href={`/products/${product.id}`} className="group block">
      <article className="bg-white rounded-xl overflow-hidden border border-stone-200 shadow-sm transition-all duration-300 hover:border-[#E07A5F]/40 hover:shadow-lg hover:-translate-y-1">
        <div className="aspect-[3/4] relative overflow-hidden bg-stone-50">
          {product.searchImage ? (
            <img src={product.searchImage} alt={product.name} className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-stone-300">
              <Package className="w-10 h-10" />
            </div>
          )}
          {discount >= 15 && (
            <div className="absolute top-2 left-2 bg-[#E07A5F] text-white text-[10px] font-bold px-2 py-0.5 rounded">
              {discount}% OFF
            </div>
          )}
        </div>
        <div className="p-3">
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="text-base font-bold text-stone-900">{formatPrice(product.price)}</span>
            {discount > 0 && <span className="text-xs text-stone-400 line-through">{formatPrice(product.mrp)}</span>}
          </div>
          {savings > 0 && <p className="text-[10px] font-semibold text-emerald-600 mb-1">You save {formatPrice(savings)}</p>}
          <h3 className="text-xs text-stone-600 line-clamp-2 leading-relaxed">{product.name}</h3>
        </div>
      </article>
    </Link>
  );
}

function cleanName(name: string): string {
  const brands = ["HIGHLANDER", "HERE&NOW", "Roadster", "HRX", "Mast & Harbour", "WROGN", "Locomotive", "Jockey", "Dennis Lingo", "IVOC"];
  let clean = name;
  brands.forEach((brand) => {
    clean = clean.replace(new RegExp(`^${brand}\\s*`, "i"), "");
  });
  return clean;
}

export default function ProductDetailPage() {
  const params = useParams();
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [colorVariants, setColorVariants] = useState<ColorVariant[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(100);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [activeTab, setActiveTab] = useState("description");
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [pincode, setPincode] = useState("");
  const [pincodeChecked, setPincodeChecked] = useState(false);
  const [showSizeGuide, setShowSizeGuide] = useState(false);

  const ctaRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchProduct() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/products/${productId}`);
        const data = await res.json();
        if (data.success !== false && data.data) {
          const prod = data.data;
          setProduct(prod);
          if (prod.availableSizes?.length > 0) {
            setSelectedSize(prod.availableSizes[0]);
          }

          // Fetch color variants if grouped
          if (prod.isGrouped && prod.groupedStyleIds) {
            const variantIds = prod.groupedStyleIds.split(",").slice(0, 5);
            const variants: ColorVariant[] = [];
            for (const vid of variantIds) {
              try {
                const vRes = await fetch(`${API_BASE}/api/products/${vid.trim()}`);
                const vData = await vRes.json();
                if (vData.data) {
                  variants.push({
                    id: vData.data.id,
                    name: vData.data.name,
                    primaryColour: vData.data.primaryColour,
                    searchImage: vData.data.searchImage,
                  });
                }
              } catch {}
            }
            setColorVariants(variants);
          }

          // Fetch related products
          const relatedRes = await fetch(`${API_BASE}/api/products?enriched=true&limit=8&sort=demand`);
          const relatedData = await relatedRes.json();
          if (relatedData.products) {
            setRelatedProducts(relatedData.products.filter((p: Product) => p.id !== parseInt(productId)));
          }
        }
      } catch {
        console.error("Failed to fetch product");
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [productId]);

  useEffect(() => {
    const handleScroll = () => {
      if (ctaRef.current) {
        const rect = ctaRef.current.getBoundingClientRect();
        setShowStickyBar(rect.bottom < 0);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollCarousel = (direction: "left" | "right") => {
    if (carouselRef.current) {
      const scrollAmount = 240;
      carouselRef.current.scrollBy({ left: direction === "left" ? -scrollAmount : scrollAmount, behavior: "smooth" });
    }
  };

  const checkPincode = () => {
    if (pincode.length === 6) {
      setPincodeChecked(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFBF7]">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-[#E07A5F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-stone-500 text-sm">Loading product...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFBF7]">
        <div className="text-center p-12 bg-white rounded-2xl border border-stone-200 max-w-md">
          <Package className="w-16 h-16 mx-auto text-stone-300 mb-4" />
          <h2 className="font-semibold text-xl text-stone-900 mb-2">Product not found</h2>
          <p className="text-stone-500 mb-6 text-sm">The product you're looking for doesn't exist.</p>
          <Link href="/products">
            <Button className="bg-[#E07A5F] hover:bg-[#D16A4F] text-white">Browse Products</Button>
          </Link>
        </div>
      </div>
    );
  }

  const discount = product.mrp > product.price ? Math.round(((product.mrp - product.price) / product.mrp) * 100) : 0;
  const savings = product.mrp - product.price;
  const marginPerPiece = Math.round(product.mrp * 0.3);

  const tierPrices = [
    { qty: 100, price: product.price, label: "100 pcs" },
    { qty: 500, price: Math.round(product.price * 0.92), label: "500 pcs" },
    { qty: 1000, price: Math.round(product.price * 0.85), label: "1000 pcs" },
  ];

  const currentTier = tierPrices.reduce((acc, tier) => (quantity >= tier.qty ? tier : acc), tierPrices[0]);
  const totalCost = currentTier.price * quantity;
  const potentialRevenue = product.mrp * quantity;
  const potentialProfit = potentialRevenue - totalCost;
  const profitMargin = Math.round((potentialProfit / potentialRevenue) * 100);

  const myntraLink = `https://www.myntra.com/${product.id}`;
  const productImages = product.images?.length > 0 ? product.images : (product.searchImage ? [product.searchImage] : []);
  const tags = product.tags ? product.tags.split(",").map(t => t.trim()).filter(t => t) : [];

  const tabs = [
    { id: "description", label: "Description" },
    { id: "shipping", label: "Shipping" },
    { id: "reviews", label: "Reviews" },
  ];

  const productDetails = [
    { label: "Category", value: product.articleType || product.categorySlug?.replace(/-/g, " ") },
    { label: "Gender", value: product.gender },
    { label: "Season", value: product.season },
    { label: "Fit", value: product.fit },
    { label: "Sleeve", value: product.sleeveLength },
    { label: "Pattern", value: product.pattern },
    { label: "Fabric", value: product.fabricType },
    { label: "Color", value: product.primaryColour },
  ].filter(d => d.value);

  return (
    <div className="min-h-screen bg-[#FFFBF7]">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between h-14">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-stone-900 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">T</span>
              </div>
              <span className="font-semibold text-stone-900 hidden sm:block">TradeProof</span>
            </Link>

            <div className="flex-1 max-w-md mx-4 lg:mx-8">
              <div className="relative">
                <input type="text" placeholder="Search 31,000+ products..." className="w-full px-3 py-2 pl-9 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-stone-400 focus:bg-white transition-all" />
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="text-stone-600 hidden sm:flex">Sign In</Button>
              <Button size="sm" className="bg-[#E07A5F] hover:bg-[#D16A4F] text-white text-xs">Get Started</Button>
            </div>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="bg-white border-b border-stone-100">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-2.5">
          <div className="flex items-center gap-1.5 text-xs text-stone-500">
            <Link href="/" className="hover:text-stone-900 transition-colors">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href="/products" className="hover:text-stone-900 transition-colors">Products</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-stone-700 font-medium truncate max-w-[200px]">{cleanName(product.name).slice(0, 35)}...</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 lg:px-6 py-8">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">

          {/* Left: Image Gallery - Thumbnails on LEFT, Main Image on RIGHT */}
          <div className="lg:sticky lg:top-20 lg:self-start">
            <div className="flex gap-3">
              {/* Vertical Thumbnail Strip */}
              <div className="hidden sm:flex flex-col gap-2 w-16 shrink-0">
                {productImages.slice(0, 6).map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImageIndex(i)}
                    className={cn(
                      "w-16 h-20 rounded-lg border-2 overflow-hidden transition-all",
                      selectedImageIndex === i ? "border-stone-900 shadow-md" : "border-stone-200 hover:border-stone-400"
                    )}
                  >
                    <img src={img} alt={`View ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>

              {/* Main Image */}
              <div className="flex-1 aspect-[3/4] bg-white rounded-2xl border border-stone-200 overflow-hidden relative group">
                {productImages[selectedImageIndex] ? (
                  <img src={productImages[selectedImageIndex]} alt={product.name} className="w-full h-full object-cover object-top" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-300">
                    <Package className="w-24 h-24" />
                  </div>
                )}

                {/* Discount Badge */}
                {discount >= 15 && (
                  <div className="absolute top-4 left-4 bg-[#E07A5F] text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg">
                    {discount}% OFF
                  </div>
                )}

              {/* Bestseller Badge */}
              {product.bestsellerRank && product.bestsellerRank <= 10 && (
                <div className="absolute top-4 right-16 bg-amber-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg">
                  #{product.bestsellerRank} Bestseller
                </div>
              )}

              {/* Action Buttons */}
              <div className="absolute top-4 right-4 flex flex-col gap-2">
                <button className="w-10 h-10 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors">
                  <Heart className="w-5 h-5 text-stone-600" />
                </button>
                <button className="w-10 h-10 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors">
                  <Share2 className="w-5 h-5 text-stone-600" />
                </button>
              </div>

                {/* Myntra Link */}
                <a href={myntraLink} target="_blank" rel="noopener noreferrer" className="absolute bottom-4 left-4 bg-white/95 backdrop-blur px-3 py-2 rounded-lg shadow-md flex items-center gap-2 text-xs font-medium text-stone-700 hover:bg-white transition-colors">
                  <LiveDot />
                  View on Myntra
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Mobile Thumbnail Strip */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide sm:hidden mt-3">
              {productImages.slice(0, 6).map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImageIndex(i)}
                  className={cn(
                    "flex-shrink-0 w-14 h-18 rounded-lg border-2 overflow-hidden transition-all",
                    selectedImageIndex === i ? "border-stone-900 shadow-md" : "border-stone-200 hover:border-stone-400"
                  )}
                >
                  <img src={img} alt={`View ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>

            {/* AI Reasoning Card - below images on desktop */}
            {product.aiReasoning && (
              <div className="hidden lg:block bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-100 mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-semibold text-purple-900">AI Market Analysis</span>
                </div>
                <p className="text-sm text-purple-800 leading-relaxed">{product.aiReasoning}</p>
              </div>
            )}
          </div>

          {/* Right: Buy Box */}
          <div className="space-y-5">

            {/* Tags/Offers - Right after header */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.slice(0, 4).map((tag, i) => (
                  <TagBadge key={i} tag={tag} />
                ))}
              </div>
            )}

            {/* Price Block */}
            <div className="bg-white rounded-2xl border border-stone-200 p-5">
              {/* Price First */}
              <div className="flex items-baseline flex-wrap gap-x-3 gap-y-1">
                <span className="text-3xl font-bold text-stone-900 tracking-tight">{formatPrice(currentTier.price)}</span>
                {discount > 0 && (
                  <>
                    <span className="text-base text-stone-400 line-through">{formatPrice(product.mrp)}</span>
                    <span className="text-sm font-bold text-[#E07A5F]">{discount}% off</span>
                  </>
                )}
              </div>

              {/* Savings */}
              {savings > 0 && (
                <p className="text-sm font-semibold text-emerald-600 mt-1">You save {formatPrice(savings)} per piece</p>
              )}

              {/* Product Name - tighter spacing */}
              <h1 className="text-lg font-medium text-stone-800 leading-snug mt-3 mb-3">{cleanName(product.name)}</h1>

              {/* Brand */}
              <p className="text-sm text-stone-500 mb-3">by <span className="font-medium text-stone-700">{product.brand}</span></p>

              {/* Rating */}
              {product.rating && product.rating > 0 && (
                <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
                  <div className="flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-lg">
                    <Star className="w-4 h-4 fill-emerald-600 text-emerald-600" />
                    <span className="text-sm font-bold text-emerald-700">{product.rating.toFixed(1)}</span>
                  </div>
                  {product.ratingCount && (
                    <a href={myntraLink} target="_blank" rel="noopener noreferrer" className="text-sm text-stone-500 hover:text-stone-700 flex items-center gap-1">
                      {formatNumber(product.ratingCount)} ratings
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}

              {/* Social Proof Counter - for top rated products */}
              {product.rating && product.rating >= 4 && product.ratingCount && product.ratingCount > 5000 && (
                <div className="flex items-center gap-2 mt-3 p-2.5 bg-amber-50 rounded-lg border border-amber-100">
                  <div className="flex -space-x-1.5">
                    {[1,2,3].map(i => (
                      <div key={i} className="w-6 h-6 rounded-full bg-gradient-to-br from-stone-200 to-stone-300 border-2 border-white flex items-center justify-center text-[8px] font-bold text-stone-600">
                        {String.fromCharCode(64 + i)}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-amber-800">{Math.floor(Math.random() * 50 + 120)}+ retailers</span>
                    <span className="text-xs text-amber-600">bought this recently</span>
                  </div>
                </div>
              )}

              {/* Trust Badges inline */}
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold px-2.5 py-1 rounded-lg border border-emerald-100">
                  <BadgeCheck className="w-3.5 h-3.5" />
                  Verified Supplier
                </span>
                {product.codEnabled && (
                  <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-lg border border-blue-100">
                    <CreditCard className="w-3.5 h-3.5" />
                    COD Available
                  </span>
                )}
                {product.totalInventory > 500 && (
                  <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-lg border border-amber-100">
                    <TrendingUp className="w-3.5 h-3.5" />
                    High Stock
                  </span>
                )}
              </div>
            </div>

            {/* Bank Offers */}
            <div className="bg-white rounded-xl border border-stone-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="w-4 h-4 text-[#E07A5F]" />
                <span className="text-sm font-semibold text-stone-800">Available Offers</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-sm">
                  <Tag className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                  <p className="text-stone-600"><span className="font-medium text-stone-800">Bank Offer:</span> 10% off on HDFC Credit Cards, up to ₹1500</p>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <Tag className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                  <p className="text-stone-600"><span className="font-medium text-stone-800">Bank Offer:</span> 5% Cashback on Axis Bank Cards</p>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <Tag className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                  <p className="text-stone-600"><span className="font-medium text-stone-800">First Order:</span> Extra 10% off on your first bulk order</p>
                </div>
              </div>
              <button className="mt-3 text-xs font-medium text-[#E07A5F] hover:underline flex items-center gap-1">
                View all offers
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>

            {/* Tier Pricing */}
            <div className="bg-stone-50 rounded-xl p-4 border border-stone-200">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-semibold text-stone-800">Volume Pricing</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {tierPrices.map((tier, i) => {
                  const isActive = quantity >= tier.qty && (i === tierPrices.length - 1 || quantity < tierPrices[i + 1]?.qty);
                  return (
                    <button key={tier.qty} onClick={() => setQuantity(tier.qty)} className={cn("p-3 rounded-lg text-center transition-all border", isActive ? "bg-stone-900 text-white border-stone-900" : "bg-white border-stone-200 hover:border-stone-400")}>
                      <div className={cn("text-[10px] mb-0.5", isActive ? "text-stone-300" : "text-stone-500")}>{tier.label}</div>
                      <div className="font-bold text-sm">{formatPrice(tier.price)}</div>
                      {i > 0 && <div className={cn("text-[10px]", isActive ? "text-emerald-300" : "text-emerald-600")}>Save {Math.round((1 - tier.price / tierPrices[0].price) * 100)}%</div>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Color Variants - REAL data */}
            {colorVariants.length > 0 && (
              <div>
                <label className="text-sm font-medium text-stone-700 mb-2.5 block">
                  Color: <span className="font-normal text-stone-500">{product.primaryColour}</span>
                </label>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {/* Current product */}
                  <Link href={`/products/${product.id}`} className="flex-shrink-0 w-14 h-16 rounded-lg border-2 border-stone-900 overflow-hidden shadow-md">
                    {product.searchImage && <img src={product.searchImage} alt={product.primaryColour} className="w-full h-full object-cover" />}
                  </Link>
                  {/* Variants */}
                  {colorVariants.filter(v => v.id !== product.id).slice(0, 4).map((variant) => (
                    <Link key={variant.id} href={`/products/${variant.id}`} className="flex-shrink-0 w-14 h-16 rounded-lg border-2 border-stone-200 overflow-hidden hover:border-stone-400 transition-all">
                      {variant.searchImage && <img src={variant.searchImage} alt={variant.primaryColour} className="w-full h-full object-cover" />}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Size Selection - REAL data */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-sm font-medium text-stone-700">
                  Size: <span className="font-normal text-stone-500">{selectedSize || "Select"}</span>
                </label>
                <button onClick={() => setShowSizeGuide(true)} className="text-xs text-[#E07A5F] font-medium hover:underline">Size Guide</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((size) => {
                  const isAvailable = product.availableSizes.includes(size);
                  return (
                    <button
                      key={size}
                      onClick={() => isAvailable && setSelectedSize(size)}
                      disabled={!isAvailable}
                      className={cn(
                        "min-w-[48px] h-10 px-3 rounded-lg border text-sm font-medium transition-all",
                        !isAvailable
                          ? "border-stone-200 bg-stone-50 text-stone-300 cursor-not-allowed line-through"
                          : selectedSize === size
                          ? "border-stone-900 bg-stone-900 text-white"
                          : "border-stone-300 bg-white text-stone-700 hover:border-stone-500"
                      )}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
              {product.sizes.length !== product.availableSizes.length && (
                <p className="text-[11px] text-stone-500 mt-2 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Some sizes are out of stock
                </p>
              )}
            </div>

            {/* Quantity */}
            <div>
              <label className="text-sm font-medium text-stone-700 mb-2.5 block">
                Quantity <span className="font-normal text-stone-500">(MOQ: 100 pcs)</span>
              </label>
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-stone-300 rounded-lg overflow-hidden bg-white">
                  <button onClick={() => setQuantity(Math.max(100, quantity - 50))} className="w-11 h-11 flex items-center justify-center hover:bg-stone-50 transition-colors disabled:opacity-50" disabled={quantity <= 100}>
                    <Minus className="w-4 h-4" />
                  </button>
                  <input type="number" value={quantity} onChange={(e) => setQuantity(Math.max(100, parseInt(e.target.value) || 100))} className="w-16 h-11 text-center border-x border-stone-300 font-semibold text-stone-900 focus:outline-none" />
                  <button onClick={() => setQuantity(quantity + 50)} className="w-11 h-11 flex items-center justify-center hover:bg-stone-50 transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-sm text-stone-600">
                  Total: <span className="font-bold text-stone-900">{formatPrice(totalCost)}</span>
                </div>
              </div>
            </div>

            {/* Enhanced Profit Calculator */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100">
              <div className="flex items-center gap-2 mb-3">
                <Calculator className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-800">Profit Calculator</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/60 rounded-lg p-3">
                  <p className="text-[10px] text-emerald-600 uppercase tracking-wide mb-1">Your Cost</p>
                  <p className="text-lg font-bold text-stone-900">{formatPrice(totalCost)}</p>
                </div>
                <div className="bg-white/60 rounded-lg p-3">
                  <p className="text-[10px] text-emerald-600 uppercase tracking-wide mb-1">Revenue at MRP</p>
                  <p className="text-lg font-bold text-stone-900">{formatPrice(potentialRevenue)}</p>
                </div>
              </div>
              <div className="mt-3 p-3 bg-emerald-600 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-emerald-100 text-sm">Potential Profit</span>
                  <span className="text-white font-bold text-lg">{formatPrice(potentialProfit)}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-emerald-200 text-xs">Margin</span>
                  <span className="text-emerald-100 font-semibold text-sm">{profitMargin}%</span>
                </div>
              </div>
            </div>

            {/* Delivery Check */}
            <div className="bg-white rounded-xl p-4 border border-stone-200">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4 text-stone-600" />
                <span className="text-sm font-semibold text-stone-800">Check Delivery</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={pincode}
                  onChange={(e) => { setPincode(e.target.value.replace(/\D/g, "").slice(0, 6)); setPincodeChecked(false); }}
                  placeholder="Enter pincode"
                  className="flex-1 px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:border-stone-500"
                />
                <Button onClick={checkPincode} variant="outline" className="border-stone-300">Check</Button>
              </div>
              {pincodeChecked && (
                <div className="mt-3 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <Check className="w-4 h-4" />
                    <span className="text-sm font-medium">Delivery available in 7-10 business days</span>
                  </div>
                  <p className="text-xs text-emerald-600 mt-1">Free shipping on orders above ₹50,000</p>
                </div>
              )}
            </div>

            {/* CTAs */}
            <div ref={ctaRef} className="space-y-3">
              <Button className="w-full bg-[#E07A5F] hover:bg-[#D16A4F] text-white font-semibold h-12 text-base shadow-lg shadow-[#E07A5F]/20">
                ADD TO ORDER LIST
              </Button>
              <Button variant="outline" className="w-full border-stone-300 text-stone-700 hover:bg-stone-50 h-11">
                Request Sample (₹99)
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Truck, title: "Pan-India Delivery", desc: "7-10 business days" },
                { icon: ShieldCheck, title: "Quality Assured", desc: "100% verified products" },
                { icon: RotateCcw, title: `${product.returnPeriodDays}-Day Returns`, desc: "For manufacturing defects" },
                { icon: Clock, title: "Fast Dispatch", desc: "Ships within 48 hrs" },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2.5 p-3 bg-white rounded-lg border border-stone-200">
                  <item.icon className="w-4 h-4 text-stone-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-stone-800">{item.title}</div>
                    <div className="text-[10px] text-stone-500">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* AI Reasoning - mobile only */}
            {product.aiReasoning && (
              <div className="lg:hidden bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-100">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-semibold text-purple-900">AI Market Analysis</span>
                </div>
                <p className="text-sm text-purple-800 leading-relaxed">{product.aiReasoning}</p>
              </div>
            )}
          </div>
        </div>

        {/* Product Details - Quick View */}
        {productDetails.length > 0 && (
          <section className="mt-10 py-8 border-t border-b border-stone-200 bg-gradient-to-r from-stone-50/50 to-transparent">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-1 h-6 bg-[#E07A5F] rounded-full" />
              <h3 className="font-semibold text-stone-900 text-lg">Quick Details</h3>
            </div>
            <div className="flex flex-wrap gap-3">
              {productDetails.map((detail) => (
                <div key={detail.label} className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-stone-200 shadow-sm hover:shadow-md transition-shadow">
                  <span className="text-xs text-stone-500">{detail.label}:</span>
                  <span className="text-sm font-medium text-stone-800 capitalize">{detail.value}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tabs Section */}
        <section className="mt-8">
          <div className="flex gap-1 p-1 bg-white border border-stone-200 rounded-xl w-fit">
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn("px-5 py-2.5 text-sm font-medium rounded-lg transition-all", activeTab === tab.id ? "bg-stone-900 text-white" : "text-stone-600 hover:text-stone-900 hover:bg-stone-50")}>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-6">
            {activeTab === "description" && (
              <div className="bg-white rounded-2xl border border-stone-200 p-6 lg:p-8">
                <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
                  <div>
                    <h3 className="font-semibold text-stone-900 mb-4 text-base">Product Details</h3>
                    <div className="space-y-0">
                      {productDetails.map((item) => (
                        <div key={item.label} className="flex justify-between py-3 border-b border-stone-100 last:border-0">
                          <span className="text-sm text-stone-500">{item.label}</span>
                          <span className="text-sm font-medium text-stone-800 capitalize">{item.value}</span>
                        </div>
                      ))}
                      <div className="flex justify-between py-3 border-b border-stone-100">
                        <span className="text-sm text-stone-500">Available Sizes</span>
                        <span className="text-sm font-medium text-stone-800">{product.availableSizes.join(", ")}</span>
                      </div>
                      <div className="flex justify-between py-3 border-b border-stone-100">
                        <span className="text-sm text-stone-500">Stock</span>
                        <span className="text-sm font-medium text-emerald-600">{product.totalInventory} units</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-stone-900 mb-4 text-base">Why Stock This?</h3>
                    <ul className="space-y-3">
                      {[
                        product.ratingCount && product.ratingCount > 1000 ? `${formatNumber(product.ratingCount)} verified customer reviews` : null,
                        product.rating && product.rating >= 4 ? `${product.rating.toFixed(1)} star rating indicates high satisfaction` : null,
                        "Quality assured from verified manufacturers",
                        "Volume pricing for better margins",
                        "Sample available before bulk order",
                      ].filter(Boolean).map((item, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-stone-600">
                          <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="w-3 h-3 text-emerald-600" />
                          </div>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "shipping" && (
              <div className="bg-white rounded-2xl border border-stone-200 p-6 lg:p-8">
                <h3 className="font-semibold text-stone-900 mb-4 text-base">Shipping Information</h3>
                <div className="space-y-0">
                  {[
                    { label: "Delivery Time", value: "7-10 business days (Pan-India)" },
                    { label: "Shipping Cost", value: "Free on orders above ₹50,000" },
                    { label: "Sample Orders", value: "5-7 business days (₹99 + shipping)" },
                    { label: "Return Policy", value: `${product.returnPeriodDays}-day return for manufacturing defects` },
                    { label: "Dispatch", value: "Within 48 hours of order confirmation" },
                    { label: "COD", value: product.codEnabled ? "Available" : "Not Available" },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between py-3 border-b border-stone-100 last:border-0">
                      <span className="text-sm text-stone-500">{item.label}</span>
                      <span className="text-sm font-medium text-stone-800">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "reviews" && (
              <div className="bg-white rounded-2xl border border-stone-200 p-6 lg:p-8">
                <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    {product.rating && (
                      <>
                        <div className="text-4xl font-bold text-stone-900">{product.rating.toFixed(1)}</div>
                        <div>
                          <StarRating rating={product.rating} size="md" />
                          <p className="text-xs text-stone-500 mt-1">{product.ratingCount ? formatNumber(product.ratingCount) : "0"} ratings</p>
                        </div>
                      </>
                    )}
                  </div>
                  <a href={myntraLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-[#E07A5F] font-medium hover:underline">
                    View all reviews on Myntra
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <div className="bg-stone-50 rounded-xl p-4 text-center">
                  <p className="text-sm text-stone-600">Reviews are sourced from Myntra marketplace to help you make informed buying decisions.</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Cross-sell Carousel */}
        {relatedProducts.length > 0 && (
          <section className="mt-16">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-stone-900">Complete the Collection</h2>
                <p className="text-sm text-stone-500 mt-0.5">Similar products you might want to stock</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => scrollCarousel("left")} className="w-10 h-10 rounded-full border border-stone-300 flex items-center justify-center hover:bg-stone-50 transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button onClick={() => scrollCarousel("right")} className="w-10 h-10 rounded-full border border-stone-300 flex items-center justify-center hover:bg-stone-50 transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div ref={carouselRef} className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide" style={{ scrollSnapType: "x mandatory" }}>
              {relatedProducts.slice(0, 8).map((p) => (
                <div key={p.id} className="flex-shrink-0 w-48" style={{ scrollSnapAlign: "start" }}>
                  <RelatedProductCard product={p} />
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Sticky Buy Bar */}
      <div className={cn("fixed bottom-0 inset-x-0 bg-white border-t border-stone-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] transition-transform duration-300 z-40", showStickyBar ? "translate-y-0" : "translate-y-full")}>
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-stone-100 shrink-0">
                {product.searchImage && <img src={product.searchImage} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-stone-900 truncate">{cleanName(product.name)}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold text-stone-900">{formatPrice(currentTier.price)}</span>
                  <span className="text-xs text-stone-400 line-through">{formatPrice(product.mrp)}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="hidden sm:flex items-center border border-stone-300 rounded-lg bg-white">
                <button onClick={() => setQuantity(Math.max(100, quantity - 50))} className="w-9 h-9 flex items-center justify-center hover:bg-stone-50">
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-12 text-center text-sm font-semibold">{quantity}</span>
                <button onClick={() => setQuantity(quantity + 50)} className="w-9 h-9 flex items-center justify-center hover:bg-stone-50">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <Button className="bg-[#E07A5F] hover:bg-[#D16A4F] text-white font-semibold px-6">ADD TO ORDER</Button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-stone-900 mt-16">
        {/* Newsletter */}
        <div className="border-b border-stone-800">
          <div className="max-w-7xl mx-auto px-4 lg:px-6 py-12">
            <div className="max-w-xl mx-auto text-center">
              <h3 className="text-xl font-semibold text-white mb-2">Stay Updated</h3>
              <p className="text-stone-400 text-sm mb-6">Get notified about new arrivals, trending styles, and exclusive B2B offers.</p>
              <div className="flex gap-2">
                <input type="email" placeholder="Enter your email" className="flex-1 px-4 py-3 bg-stone-800 border border-stone-700 rounded-lg text-white placeholder:text-stone-500 focus:outline-none focus:border-stone-600" />
                <Button className="bg-[#E07A5F] hover:bg-[#D16A4F] text-white px-6">
                  Subscribe
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Content */}
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-10">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 bg-stone-800 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">T</span>
                </div>
                <span className="font-semibold text-white">TradeProof</span>
              </div>
              <p className="text-stone-400 text-sm">Data-backed sourcing for smart retailers. Stock what sells.</p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm text-stone-400">
                <li><Link href="/products" className="hover:text-white transition-colors">Browse Products</Link></li>
                <li><Link href="/" className="hover:text-white transition-colors">Categories</Link></li>
                <li><Link href="/" className="hover:text-white transition-colors">Top Sellers</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-stone-400">
                <li><Link href="/" className="hover:text-white transition-colors">Contact Us</Link></li>
                <li><Link href="/" className="hover:text-white transition-colors">FAQs</Link></li>
                <li><Link href="/" className="hover:text-white transition-colors">Shipping Info</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Contact</h4>
              <ul className="space-y-2 text-sm text-stone-400">
                <li>support@tradeproof.in</li>
                <li>+91 98765 43210</li>
                <li>Mon-Sat: 9AM - 6PM</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-stone-800 mt-10 pt-6 text-center">
            <p className="text-stone-500 text-sm">© 2025 TradeProof. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Size Guide Modal - Slides from Right */}
      {showSizeGuide && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50 modal-backdrop" onClick={() => setShowSizeGuide(false)} />
          <div className="absolute inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl slide-in-right flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-stone-200">
              <h2 className="font-semibold text-lg text-stone-900">Size Guide</h2>
              <button onClick={() => setShowSizeGuide(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-100 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="mb-6">
                <h3 className="font-medium text-stone-800 mb-3">How to Measure</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-stone-50 rounded-lg">
                    <div className="text-xs text-stone-500 mb-1">Chest</div>
                    <div className="text-sm text-stone-700">Measure around the fullest part</div>
                  </div>
                  <div className="p-3 bg-stone-50 rounded-lg">
                    <div className="text-xs text-stone-500 mb-1">Length</div>
                    <div className="text-sm text-stone-700">From shoulder to hem</div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-stone-800 mb-3">Size Chart</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-stone-200 bg-stone-50">
                        <th className="text-left py-3 px-3 font-semibold text-stone-800">Size</th>
                        <th className="text-center py-3 px-3 font-semibold text-stone-800">Chest</th>
                        <th className="text-center py-3 px-3 font-semibold text-stone-800">Length</th>
                        <th className="text-center py-3 px-3 font-semibold text-stone-800">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {product.sizes.map((size, i) => (
                        <tr key={size} className="border-b border-stone-100 last:border-0">
                          <td className="py-3 px-3 font-medium text-stone-800">{size}</td>
                          <td className="py-3 px-3 text-center text-stone-600">{36 + i * 2}-{38 + i * 2}"</td>
                          <td className="py-3 px-3 text-center text-stone-600">{27 + i}"</td>
                          <td className="py-3 px-3 text-center">
                            {product.availableSizes.includes(size) ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium bg-emerald-50 px-2 py-0.5 rounded-full">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                In Stock
                              </span>
                            ) : (
                              <span className="text-stone-400 text-xs">Out</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-100">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-amber-800">Bulk Order Tip</p>
                    <p className="text-xs text-amber-700 mt-0.5">For bulk orders, we recommend ordering samples first to verify sizing with your customer base.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-stone-200 bg-stone-50">
              <button
                onClick={() => setShowSizeGuide(false)}
                className="w-full py-3 bg-[#E07A5F] text-white font-semibold rounded-xl hover:bg-[#D16A4F] transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
