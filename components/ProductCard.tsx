"use client";

import type { RankedProduct } from "@/lib/types";

interface ProductCardProps {
  product: RankedProduct;
}

export function ProductCard({ product }: ProductCardProps) {
  const discount =
    product.mrp > 0 ? Math.round((1 - product.price / product.mrp) * 100) : 0;

  const getScoreColor = (score: number) => {
    if (score >= 80) return "var(--accent-cyan)";
    if (score >= 60) return "var(--accent-amber)";
    return "var(--accent-rose)";
  };

  const circumference = 2 * Math.PI * 26;
  const progress = (product.score / 100) * circumference;

  return (
    <div className="glass-card glow-border p-5 group">
      <div className="flex items-start gap-5">
        {/* Rank & Score */}
        <div className="flex-shrink-0 flex flex-col items-center gap-2">
          {/* Rank badge */}
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center font-display font-bold text-sm ${
              product.rank <= 3
                ? "bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-violet)] text-[var(--bg-deep)]"
                : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
            }`}
          >
            {product.rank}
          </div>

          {/* Score ring */}
          <div className="score-ring">
            <svg width="64" height="64" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="26" className="score-ring-bg" />
              <circle
                cx="32"
                cy="32"
                r="26"
                className="score-ring-progress"
                stroke={getScoreColor(product.score)}
                strokeDasharray={circumference}
                strokeDashoffset={circumference - progress}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className="font-display font-bold text-base"
                style={{ color: getScoreColor(product.score) }}
              >
                {product.score}
              </span>
            </div>
          </div>
        </div>

        {/* Product Info */}
        <div className="flex-grow min-w-0">
          {/* Header row */}
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-[var(--accent-violet)] uppercase tracking-wider">
                  {product.brand}
                </span>
                {product.category && (
                  <span className="tag tag-violet text-[10px] py-0.5">
                    {product.category}
                  </span>
                )}
              </div>
              <h3 className="font-display font-semibold text-[var(--text-primary)] leading-tight group-hover:text-[var(--accent-cyan)] transition-colors line-clamp-2">
                {product.name}
              </h3>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap items-center gap-4 mb-3">
            {/* Price */}
            <div className="flex items-baseline gap-2">
              <span className="font-display font-semibold text-lg text-[var(--text-primary)]">
                ₹{product.price.toLocaleString()}
              </span>
              {discount > 0 && (
                <>
                  <span className="text-sm text-[var(--text-muted)] line-through">
                    ₹{product.mrp.toLocaleString()}
                  </span>
                  <span className="tag tag-cyan text-[10px] py-0.5">
                    {discount}% OFF
                  </span>
                </>
              )}
            </div>

            {/* Divider */}
            <div className="w-px h-4 bg-[var(--border-subtle)]" />

            {/* Rating */}
            <div className="flex items-center gap-1.5">
              <svg
                className="w-4 h-4 text-[var(--accent-amber)]"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="font-medium text-[var(--text-primary)]">
                {product.rating?.toFixed(1)}
              </span>
              <span className="text-sm text-[var(--text-muted)]">
                ({product.ratingCount?.toLocaleString()})
              </span>
            </div>

            {/* Material if available */}
            {product.material && (
              <>
                <div className="w-px h-4 bg-[var(--border-subtle)]" />
                <span className="text-xs text-[var(--text-muted)] truncate max-w-[150px]">
                  {product.material}
                </span>
              </>
            )}
          </div>

          {/* AI Reasoning */}
          <div className="relative pl-4 border-l-2 border-[var(--accent-cyan)]/30">
            <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-[var(--accent-cyan)]" />
            <p className="text-sm text-[var(--text-secondary)] italic leading-relaxed">
              {product.reasoning}
            </p>
          </div>

          {/* Enriched data badges */}
          {(product.sizes?.length || product.colors?.length) && (
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[var(--border-subtle)]">
              {product.sizes && product.sizes.length > 0 && (
                <span className="text-xs text-[var(--text-muted)]">
                  <span className="text-[var(--text-secondary)]">{product.sizes.length}</span> sizes
                </span>
              )}
              {product.colors && product.colors.length > 0 && (
                <span className="text-xs text-[var(--text-muted)]">
                  <span className="text-[var(--text-secondary)]">{product.colors.length}</span> colors
                </span>
              )}
              {product.seller && (
                <span className="text-xs text-[var(--text-muted)]">
                  by <span className="text-[var(--text-secondary)]">{product.seller}</span>
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
