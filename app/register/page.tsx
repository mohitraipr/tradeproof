"use client";

import { useState } from "react";
import Link from "next/link";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu and Kashmir", "Ladakh"
];

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    businessName: "",
    hasGst: true,
    gstNumber: "",
    city: "",
    state: "",
    pincode: "",
    address: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (!formData.acceptTerms) {
      setError("Please accept the terms and conditions");
      return;
    }

    if (formData.hasGst && !formData.gstNumber) {
      setError("Please enter your GST number or select 'No GST'");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/sellers/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Registration failed");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[var(--paper)] flex items-center justify-center px-4">
        <div className="bg-white rounded-xl p-8 max-w-md w-full text-center border border-[var(--border)]">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="font-editorial text-2xl text-stone-900 mb-2">Registration Successful!</h1>
          <p className="text-stone-600 mb-6">
            Your account has been created. You can now login to start ordering.
          </p>
          <Link href="/login" className="btn-primary inline-block px-6 py-3 rounded-lg">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--paper)]">
      {/* Header */}
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Link href="/" className="flex items-center gap-3 w-fit">
            <div className="w-10 h-10 bg-stone-900 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">T</span>
            </div>
            <div>
              <h1 className="font-editorial text-xl text-stone-900">TradeProof</h1>
              <p className="text-xs text-stone-500">B2B Fashion Intelligence</p>
            </div>
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <div className="text-center mb-8">
          <h1 className="font-editorial text-3xl text-stone-900 mb-2">Create Your Account</h1>
          <p className="text-stone-600">
            Join 1000+ retailers who source smarter with TradeProof
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl p-8 border border-[var(--border)] space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Personal Info */}
          <div>
            <h2 className="font-medium text-stone-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-stone-900 text-white rounded-full text-xs flex items-center justify-center">1</span>
              Personal Information
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-stone-600 mb-1">Your Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="input-field w-full px-4 py-2.5 rounded-lg"
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="block text-sm text-stone-600 mb-1">Phone Number *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  pattern="[0-9]{10}"
                  className="input-field w-full px-4 py-2.5 rounded-lg"
                  placeholder="10 digit mobile number"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-stone-600 mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="input-field w-full px-4 py-2.5 rounded-lg"
                  placeholder="your@email.com"
                />
              </div>
            </div>
          </div>

          {/* Business Info */}
          <div className="pt-4 border-t border-stone-100">
            <h2 className="font-medium text-stone-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-stone-900 text-white rounded-full text-xs flex items-center justify-center">2</span>
              Business Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-stone-600 mb-1">Business Name *</label>
                <input
                  type="text"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleChange}
                  required
                  className="input-field w-full px-4 py-2.5 rounded-lg"
                  placeholder="Your shop/business name"
                />
              </div>

              <div>
                <label className="flex items-center gap-3 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    name="hasGst"
                    checked={formData.hasGst}
                    onChange={handleChange}
                    className="w-4 h-4 rounded border-stone-300"
                  />
                  <span className="text-sm text-stone-700">I have GST registration</span>
                </label>

                {formData.hasGst && (
                  <input
                    type="text"
                    name="gstNumber"
                    value={formData.gstNumber}
                    onChange={handleChange}
                    className="input-field w-full px-4 py-2.5 rounded-lg"
                    placeholder="Enter GST number (e.g., 22AAAAA0000A1Z5)"
                    pattern="[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}"
                  />
                )}

                {!formData.hasGst && (
                  <p className="text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
                    Non-GST orders may have higher tax implications. Consider registering for GST if your turnover exceeds ₹40 lakhs.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="pt-4 border-t border-stone-100">
            <h2 className="font-medium text-stone-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-stone-900 text-white rounded-full text-xs flex items-center justify-center">3</span>
              Business Address
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-stone-600 mb-1">City *</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  required
                  className="input-field w-full px-4 py-2.5 rounded-lg"
                  placeholder="City"
                />
              </div>
              <div>
                <label className="block text-sm text-stone-600 mb-1">State *</label>
                <select
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  required
                  className="select-field w-full px-4 py-2.5 rounded-lg"
                >
                  <option value="">Select state</option>
                  {INDIAN_STATES.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-stone-600 mb-1">Pincode *</label>
                <input
                  type="text"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                  required
                  pattern="[0-9]{6}"
                  className="input-field w-full px-4 py-2.5 rounded-lg"
                  placeholder="6 digit"
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm text-stone-600 mb-1">Full Address *</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                  rows={2}
                  className="input-field w-full px-4 py-2.5 rounded-lg resize-none"
                  placeholder="Shop/Building name, Street, Landmark"
                />
              </div>
            </div>
          </div>

          {/* Password */}
          <div className="pt-4 border-t border-stone-100">
            <h2 className="font-medium text-stone-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-stone-900 text-white rounded-full text-xs flex items-center justify-center">4</span>
              Set Password
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-stone-600 mb-1">Password *</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                  className="input-field w-full px-4 py-2.5 rounded-lg"
                  placeholder="Min 6 characters"
                />
              </div>
              <div>
                <label className="block text-sm text-stone-600 mb-1">Confirm Password *</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="input-field w-full px-4 py-2.5 rounded-lg"
                  placeholder="Re-enter password"
                />
              </div>
            </div>
          </div>

          {/* Terms */}
          <div className="pt-4 border-t border-stone-100">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="acceptTerms"
                checked={formData.acceptTerms}
                onChange={handleChange}
                className="w-4 h-4 rounded border-stone-300 mt-0.5"
              />
              <span className="text-sm text-stone-600">
                I agree to the{" "}
                <a href="#" className="text-[var(--accent)] hover:underline">Terms of Service</a>{" "}
                and{" "}
                <a href="#" className="text-[var(--accent)] hover:underline">Privacy Policy</a>
              </span>
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 rounded-lg text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>

          <p className="text-center text-sm text-stone-600">
            Already have an account?{" "}
            <Link href="/login" className="text-[var(--accent)] hover:underline font-medium">
              Login here
            </Link>
          </p>
        </form>
      </main>
    </div>
  );
}
