"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Seller {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  businessName: string;
  hasGst: boolean;
  gstNumber: string | null;
  city: string;
  state: string;
  pincode: string;
  address: string;
  isVerified: boolean;
  createdAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSeller() {
      try {
        const res = await fetch("/api/sellers/me");
        if (!res.ok) {
          router.push("/login");
          return;
        }
        const data = await res.json();
        setSeller(data.seller);
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }
    fetchSeller();
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/sellers/me", { method: "DELETE" });
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--paper)] flex items-center justify-center">
        <div className="animate-pulse text-stone-500">Loading...</div>
      </div>
    );
  }

  if (!seller) return null;

  return (
    <div className="min-h-screen bg-[var(--paper)]">
      {/* Header */}
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-stone-900 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">T</span>
            </div>
            <div>
              <h1 className="font-editorial text-xl text-stone-900">TradeProof</h1>
              <p className="text-xs text-stone-500">Seller Dashboard</p>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-stone-600 hover:text-stone-900">
              Browse Products
            </Link>
            <button
              onClick={handleLogout}
              className="btn-secondary px-4 py-2 rounded-lg text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h2 className="font-editorial text-3xl text-stone-900 mb-2">
            Welcome, {seller.name.split(" ")[0]}!
          </h2>
          <p className="text-stone-600">
            Manage your orders and discover trending products
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-[var(--border)] p-6">
              <h3 className="font-medium text-stone-900 mb-4">Business Profile</h3>

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-stone-500 uppercase tracking-wide">Business</p>
                  <p className="text-stone-900">{seller.businessName}</p>
                </div>

                <div>
                  <p className="text-xs text-stone-500 uppercase tracking-wide">Phone</p>
                  <p className="text-stone-900">{seller.phone}</p>
                </div>

                {seller.email && (
                  <div>
                    <p className="text-xs text-stone-500 uppercase tracking-wide">Email</p>
                    <p className="text-stone-900">{seller.email}</p>
                  </div>
                )}

                <div>
                  <p className="text-xs text-stone-500 uppercase tracking-wide">Location</p>
                  <p className="text-stone-900">{seller.city}, {seller.state}</p>
                </div>

                <div>
                  <p className="text-xs text-stone-500 uppercase tracking-wide">GST Status</p>
                  {seller.hasGst ? (
                    <p className="text-emerald-700">{seller.gstNumber}</p>
                  ) : (
                    <p className="text-amber-700">Non-GST</p>
                  )}
                </div>

                <div className="pt-3 border-t border-stone-100">
                  {seller.isVerified ? (
                    <span className="inline-flex items-center gap-1.5 text-sm text-emerald-700">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Verified Seller
                    </span>
                  ) : (
                    <span className="text-sm text-stone-500">Verification pending</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-[var(--border)] p-5">
                <p className="text-2xl font-semibold text-stone-900">0</p>
                <p className="text-sm text-stone-500">Total Orders</p>
              </div>
              <div className="bg-white rounded-xl border border-[var(--border)] p-5">
                <p className="text-2xl font-semibold text-stone-900">0</p>
                <p className="text-sm text-stone-500">Samples Ordered</p>
              </div>
              <div className="bg-white rounded-xl border border-[var(--border)] p-5">
                <p className="text-2xl font-semibold text-stone-900">₹0</p>
                <p className="text-sm text-stone-500">Total Spent</p>
              </div>
            </div>

            {/* Empty State */}
            <div className="bg-white rounded-xl border border-[var(--border)] p-12 text-center">
              <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <h3 className="font-medium text-stone-900 mb-2">No orders yet</h3>
              <p className="text-stone-500 mb-6 max-w-sm mx-auto">
                Browse our data-backed catalog and place your first order to get started.
              </p>
              <Link href="/" className="btn-primary inline-block px-6 py-2.5 rounded-lg">
                Browse Products
              </Link>
            </div>

            {/* Recent Orders would go here */}
          </div>
        </div>
      </main>
    </div>
  );
}
