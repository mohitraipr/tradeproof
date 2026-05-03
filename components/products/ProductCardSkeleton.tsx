"use client";

import { cn } from "@/lib/utils";

interface ProductCardSkeletonProps {
  className?: string;
}

export function ProductCardSkeleton({ className }: ProductCardSkeletonProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm",
        className
      )}
      aria-busy="true"
      aria-label="Loading product"
    >
      {/* Image */}
      <div className="aspect-[4/5] bg-stone-100 skeleton-shimmer" />

      {/* Content */}
      <div className="p-4 space-y-2.5">
        {/* Name */}
        <div className="space-y-1.5">
          <div className="h-3.5 bg-stone-100 rounded-md w-full skeleton-shimmer" />
          <div className="h-3.5 bg-stone-100 rounded-md w-3/4 skeleton-shimmer" />
        </div>

        {/* Price */}
        <div className="flex items-center gap-2 pt-1">
          <div className="h-5 bg-stone-100 rounded-md w-20 skeleton-shimmer" />
          <div className="h-3.5 bg-stone-50 rounded-md w-14 skeleton-shimmer" />
        </div>

        {/* MOQ */}
        <div className="h-5 bg-emerald-50 rounded-md w-20 skeleton-shimmer" />

        {/* Rating */}
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="w-3 h-3 bg-stone-100 rounded skeleton-shimmer" />
            ))}
          </div>
          <div className="h-3.5 bg-stone-100 rounded-md w-8 skeleton-shimmer" />
        </div>

        {/* Verified */}
        <div className="pt-2.5 border-t border-stone-100">
          <div className="h-3.5 bg-emerald-50 rounded-md w-24 skeleton-shimmer" />
        </div>
      </div>
    </div>
  );
}

export default ProductCardSkeleton;
