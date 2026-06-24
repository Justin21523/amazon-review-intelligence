import type {
  HealthResponse,
  SearchResponse,
  ProductDetail,
  ProductHit,
  ProductSummary,
  RecommendationResponse,
  BrandStats,
  CategoryStats,
  OverviewStats,
  TrendPoint,
  TopProduct,
  RatingBucket,
  EvaluationResults,
} from './types';

const BASE = '/api';

async function apiFetch<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
): Promise<T> {
  const url = new URL(BASE + path, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) url.searchParams.set(k, String(v));
    });
  }
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`API error ${response.status}: ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

export async function fetchHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>('/health');
}

export async function fetchSearch(
  q: string,
  k: number = 10,
  mode: string = 'hybrid',
  alpha: number = 0.5,
): Promise<SearchResponse> {
  return apiFetch<SearchResponse>('/search', { q, k, mode, alpha });
}

export async function fetchProduct(asin: string): Promise<ProductDetail> {
  return apiFetch<ProductDetail>(`/products/${asin}`);
}

export async function fetchProductSimilar(asin: string, k: number = 6): Promise<ProductHit[]> {
  return apiFetch<ProductHit[]>(`/products/${asin}/similar`, { k });
}

export async function fetchProductSummary(asin: string): Promise<ProductSummary> {
  return apiFetch<ProductSummary>(`/products/${asin}/summary`);
}

export async function fetchRecommendations(
  userId: string,
  k: number = 10,
): Promise<RecommendationResponse> {
  return apiFetch<RecommendationResponse>('/recommendations', { user_id: userId, k });
}

export async function fetchBrands(limit: number = 20): Promise<BrandStats[]> {
  return apiFetch<BrandStats[]>('/analytics/brands', { limit });
}

export async function fetchCategories(): Promise<CategoryStats[]> {
  return apiFetch<CategoryStats[]>('/analytics/categories');
}

export async function fetchOverview(): Promise<OverviewStats> {
  return apiFetch<OverviewStats>('/analytics/overview');
}

export async function fetchTrends(): Promise<TrendPoint[]> {
  return apiFetch<TrendPoint[]>('/analytics/trends');
}

export async function fetchTopProducts(limit: number = 10): Promise<TopProduct[]> {
  return apiFetch<TopProduct[]>('/analytics/top-products', { limit });
}

export async function fetchRatingDistribution(): Promise<RatingBucket[]> {
  return apiFetch<RatingBucket[]>('/analytics/rating-distribution');
}

export async function fetchEvaluation(): Promise<EvaluationResults> {
  return apiFetch<EvaluationResults>('/evaluation');
}
