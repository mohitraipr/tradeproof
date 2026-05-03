"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Sparkles, Tag, Star, TrendingUp } from "lucide-react";

export interface ProductCardProps {
  id: number;
  name: string;
  image: string | null;
  price: number;
  mrp: number;
  rating: number | null;
  ratingCount: number | null;
  soldCount?: number;
  moq?: number;
  isVerified?: boolean;
  supplierLocation?: string;
  aiReasoning?: string | null;
  tags?: string | null;
  bestsellerRank?: number | null;
  className?: string;
}

function formatPrice(price: number): string {
  return "₹" + price.toLocaleString("en-IN");
}

function formatCount(count: number): string {
  if (count >= 100000) return `${(count / 100000).toFixed(1)}L`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={cn(
            "w-3 h-3 transition-colors",
            star <= Math.floor(rating) ? "text-amber-400" : "text-stone-200"
          )}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function getTagStyle(tag: string): string {
  const lower = tag.toLowerCase();
  if (lower.includes("top rated") || lower.includes("premium"))
    return "bg-amber-50 text-amber-700 border-amber-200";
  if (lower.includes("price drop") || lower.includes("save") || lower.includes("deal") || lower.includes("steal"))
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (lower.includes("festive"))
    return "bg-purple-50 text-purple-700 border-purple-200";
  if (lower.includes("sale"))
    return "bg-[#FEF1EE] text-[#E07A5F] border-[#E07A5F]/20";
  return "bg-stone-50 text-stone-600 border-stone-200";
}

export function ProductCard({
  id,
  name,
  image,
  price,
  mrp,
  rating,
  ratingCount,
  moq = 100,
  isVerified = true,
  aiReasoning,
  tags,
  bestsellerRank,
  className,
}: ProductCardProps) {
  const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const savings = mrp - price;
  const tagList = tags ? tags.split(",").map(t => t.trim()).filter(t => t).slice(0, 2) : [];

  return (
    <Link href={`/products/${id}`} className={cn("group block h-full", className)}>
      <article className="h-full bg-white rounded-2xl overflow-hidden border border-stone-200 shadow-sm transition-all duration-300 ease-out hover:border-[#E07A5F]/40 hover:shadow-xl hover:shadow-stone-200/60 hover:-translate-y-1.5">
        {/* Image */}
        <div className="relative aspect-[4/5] overflow-hidden bg-stone-50">
          {image ? (
            <img
              src={image}
              alt={name}
              loading="lazy"
              className="w-full h-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-12 h-12 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}

          {/* Discount Badge */}
          {discount >= 15 && (
            <div className="absolute top-3 left-3 bg-[#E07A5F] text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-md tracking-wide">
              {discount}% OFF
            </div>
          )}

          {/* Bestseller Badge */}
          {bestsellerRank && bestsellerRank <= 10 && (
            <div className="absolute top-3 right-3 bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-md flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              #{bestsellerRank}
            </div>
          )}

          {/* Quick View on Hover */}
          <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-stone-900/80 via-stone-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
            <span className="text-white text-xs font-semibold tracking-wide flex items-center gap-1.5">
              Quick View
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Tags */}
          {tagList.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {tagList.map((tag, i) => (
                <span key={i} className={cn("inline-flex items-center text-[9px] font-semibold px-1.5 py-0.5 rounded border", getTagStyle(tag))}>
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Price */}
          <div className="flex items-baseline flex-wrap gap-x-2 gap-y-0.5 mb-1">
            <span className="text-lg font-bold text-stone-900 tracking-tight">{formatPrice(price)}</span>
            {discount > 0 && (
              <>
                <span className="text-xs text-stone-400 line-through">{formatPrice(mrp)}</span>
                <span className="text-[10px] font-bold text-[#E07A5F] tracking-wide">{discount}% off</span>
              </>
            )}
          </div>

          {/* Savings */}
          {savings > 0 && (
            <p className="text-[10px] font-semibold text-emerald-600 mb-2">
              You save {formatPrice(savings)}
            </p>
          )}

          {/* Name */}
          <h3 className="text-[13px] font-medium text-stone-800 leading-snug line-clamp-2 mb-2 min-h-[36px] tracking-tight group-hover:text-stone-900 transition-colors">
            {name}
          </h3>

          {/* AI Insight - truncated */}
          {aiReasoning && (
            <div className="mb-2.5 p-2 bg-purple-50/50 rounded-lg border border-purple-100/50">
              <div className="flex items-center gap-1 mb-1">
                <Sparkles className="w-3 h-3 text-purple-500" />
                <span className="text-[9px] font-semibold text-purple-600 uppercase tracking-wide">AI Insight</span>
              </div>
              <p className="text-[10px] text-purple-700 leading-relaxed line-clamp-2">
                {aiReasoning.slice(0, 100)}...
              </p>
            </div>
          )}

          {/* MOQ Badge */}
          <div className="mb-2.5">
            <span className="inline-flex items-center bg-emerald-50 text-emerald-700 text-[10px] font-semibold px-2 py-1 rounded-md border border-emerald-100">
              MOQ: {moq} pcs
            </span>
          </div>

          {/* Rating */}
          {rating && rating > 0 && (
            <div className="flex items-center gap-1.5 mb-2.5">
              <StarRating rating={rating} />
              <span className="text-xs font-semibold text-stone-700">{rating.toFixed(1)}</span>
              {ratingCount && (
                <span className="text-[10px] text-stone-400 font-medium">({formatCount(ratingCount)})</span>
              )}
            </div>
          )}

          {/* Verified Badge */}
          {isVerified && (
            <div className="pt-2.5 border-t border-stone-100 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-[10px] font-semibold text-emerald-600 tracking-wide">Verified Supplier</span>
            </div>
          )}
        </div>
      </article>
    </Link>
  );
}

export default ProductCard;
