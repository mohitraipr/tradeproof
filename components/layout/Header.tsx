"use client";

import Link from "next/link";
import { useState } from "react";
import { Search, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <header className="bg-white border-b border-stone-200 sticky top-0 z-50">
      {/* Top Announcement Bar */}
      <div className="bg-stone-900 hidden sm:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-9 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-stone-400">New Seller?</span>
            <span className="font-semibold text-[#E07A5F]">Get 10% off your first order</span>
            <Link href="/register" className="text-white hover:text-[#E07A5F] ml-1 font-medium transition-colors">→ Register</Link>
          </div>
          <div className="flex items-center gap-5 text-stone-400">
            <Link href="#" className="hover:text-white transition-colors">Help</Link>
            <Link href="#" className="hover:text-white transition-colors">Track Order</Link>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center h-14 gap-4 lg:gap-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 bg-stone-900 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">T</span>
            </div>
            <div className="hidden sm:block">
              <span className="font-semibold text-stone-900">TradeProof</span>
              <span className="text-[10px] text-stone-400 block -mt-0.5">B2B MARKETPLACE</span>
            </div>
          </Link>

          {/* Search Bar */}
          <div className="flex-1 max-w-xl">
            <div className="relative">
              <input
                type="text"
                placeholder="Search 17,000+ products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-[#E07A5F] focus:ring-2 focus:ring-[#E07A5F]/10 transition-all"
              />
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              {searchQuery && (
                <Link
                  href={`/products?q=${encodeURIComponent(searchQuery)}`}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-[#E07A5F] text-white text-xs font-medium rounded-lg hover:bg-[#D16A4F] transition-colors"
                >
                  Search
                </Link>
              )}
            </div>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/products" className="text-sm text-stone-600 hover:text-stone-900 transition-colors">
              Products
            </Link>
            <Link href="/products?sort=demand" className="text-sm text-stone-600 hover:text-stone-900 transition-colors">
              Trending
            </Link>
          </div>

          {/* Auth Buttons */}
          <div className="flex items-center gap-2">
            <Link href="/" className="text-sm font-medium text-stone-600 hover:text-stone-900 hidden sm:block transition-colors">
              Sign in
            </Link>
            <Button size="sm" className="bg-[#E07A5F] hover:bg-[#D16A4F] text-white rounded-xl text-xs">
              Get Started
            </Button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-stone-100 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Secondary Nav - Desktop */}
      <div className="border-t border-stone-100 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <nav className="flex items-center h-10 gap-6 text-sm">
            <button className="flex items-center gap-1.5 font-medium text-stone-900 hover:text-[#E07A5F] transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              All Categories
            </button>
            <Link href="/products?sort=demand" className="text-stone-600 hover:text-[#E07A5F] transition-colors">Best Sellers</Link>
            <Link href="/products" className="text-stone-600 hover:text-[#E07A5F] transition-colors">New Arrivals</Link>
            <Link href="/products?sort=rating" className="text-stone-600 hover:text-[#E07A5F] transition-colors">Top Rated</Link>
            <Link href="/products" className="text-stone-600 hover:text-[#E07A5F] transition-colors flex items-center gap-1">
              Flash Deals
              <span className="bg-[#E07A5F] text-white text-[9px] font-bold px-1.5 py-0.5 rounded">HOT</span>
            </Link>
            <div className="ml-auto">
              <Link href="#" className="text-stone-500 hover:text-stone-900 transition-colors">Bulk Orders</Link>
            </div>
          </nav>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-stone-200 bg-white">
          <nav className="px-4 py-4 space-y-3">
            <Link href="/products" className="block py-2 text-stone-700 font-medium">All Products</Link>
            <Link href="/products?sort=demand" className="block py-2 text-stone-600">Best Sellers</Link>
            <Link href="/products?sort=rating" className="block py-2 text-stone-600">Top Rated</Link>
            <Link href="/products" className="block py-2 text-stone-600">New Arrivals</Link>
            <div className="pt-3 border-t border-stone-100">
              <Link href="#" className="block py-2 text-stone-500">Help</Link>
              <Link href="#" className="block py-2 text-stone-500">Track Order</Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

export default Header;
