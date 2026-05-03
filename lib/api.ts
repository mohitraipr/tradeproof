const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const url = `${API_URL}${endpoint}`;

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  const data = await response.json();
  return data;
}

// Products
export async function getProducts(params?: {
  category?: string;
  brand?: string;
  origin?: string;
  minRating?: number;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
  limit?: number;
  offset?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.set(key, String(value));
      }
    });
  }
  const query = searchParams.toString();
  return fetchApi(`/api/products${query ? `?${query}` : ""}`);
}

export async function getProduct(id: number) {
  return fetchApi(`/api/products/${id}`);
}

export async function getTopProducts(count: number) {
  return fetchApi(`/api/products/top/${count}`);
}

// Brands
export async function getBrands(params?: { sort?: string; limit?: number }) {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.set(key, String(value));
      }
    });
  }
  const query = searchParams.toString();
  return fetchApi(`/api/brands${query ? `?${query}` : ""}`);
}

export async function getBrand(name: string) {
  return fetchApi(`/api/brands/${encodeURIComponent(name)}`);
}

export async function refreshBrands() {
  return fetchApi("/api/brands/refresh", { method: "POST" });
}

// Agent
export async function runAnalysis(params: {
  productIds?: number[];
  count?: number;
  skipEnrich?: boolean;
}) {
  return fetchApi("/api/agent/analyze", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function enrichProducts(productIds: number[]) {
  return fetchApi("/api/agent/enrich", {
    method: "POST",
    body: JSON.stringify({ productIds }),
  });
}

export async function getRankings(limit?: number) {
  return fetchApi(`/api/agent/rankings${limit ? `?limit=${limit}` : ""}`);
}

export async function getRankingHistory(productId: number) {
  return fetchApi(`/api/agent/history/${productId}`);
}

// Health check
export async function checkHealth() {
  return fetchApi("/health");
}

export default {
  getProducts,
  getProduct,
  getTopProducts,
  getBrands,
  getBrand,
  refreshBrands,
  runAnalysis,
  enrichProducts,
  getRankings,
  getRankingHistory,
  checkHealth,
};
