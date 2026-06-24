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
  EvaluationExtended,
  ReviewDensityBucket,
  UserSample,
  ProductSuggest,
  ProductIntelligenceItem,
  ReviewerSegment,
  RatingTimelinePoint,
  RecentQuery,
  ReviewsPage,
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
  minRating: number = 0,
  minReviews: number = 0,
): Promise<SearchResponse> {
  return apiFetch<SearchResponse>('/search', {
    q, k, mode, alpha,
    ...(minRating > 0 ? { min_rating: minRating } : {}),
    ...(minReviews > 0 ? { min_reviews: minReviews } : {}),
  });
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

export async function fetchProductSuggest(q: string, limit: number = 10): Promise<ProductSuggest[]> {
  return apiFetch<ProductSuggest[]>('/products/suggest', { q, limit });
}

export async function fetchRecommendations(
  userId: string,
  k: number = 10,
): Promise<RecommendationResponse> {
  return apiFetch<RecommendationResponse>(`/recommendations/user/${encodeURIComponent(userId)}`, { k });
}

export async function fetchUserSamples(limit: number = 15): Promise<UserSample[]> {
  return apiFetch<UserSample[]>('/users/sample', { limit });
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

export async function fetchReviewDensity(): Promise<ReviewDensityBucket[]> {
  return apiFetch<ReviewDensityBucket[]>('/analytics/review-density');
}

export async function fetchEvaluation(): Promise<EvaluationResults> {
  return apiFetch<EvaluationResults>('/analytics/evaluation');
}

export async function fetchProductIntelligence(limit: number = 20): Promise<ProductIntelligenceItem[]> {
  return apiFetch<ProductIntelligenceItem[]>('/analytics/product-intelligence', { limit });
}

export async function fetchReviewerSegments(): Promise<ReviewerSegment[]> {
  return apiFetch<ReviewerSegment[]>('/analytics/reviewer-segments');
}

export async function fetchEvaluationExtended(): Promise<EvaluationExtended> {
  return apiFetch<EvaluationExtended>('/analytics/evaluation-extended');
}

export async function fetchProductRatingTimeline(asin: string): Promise<RatingTimelinePoint[]> {
  return apiFetch<RatingTimelinePoint[]>(`/products/${asin}/rating-timeline`);
}

export async function fetchRecentQueries(limit = 10): Promise<RecentQuery[]> {
  return apiFetch<RecentQuery[]>('/analytics/recent-queries', { limit });
}

export async function fetchEmbeddings2d(limit = 3000): Promise<import('./types').ClusterPoint[]> {
  return apiFetch<import('./types').ClusterPoint[]>('/analytics/embeddings-2d', { limit });
}

export async function fetchProductReviews(
  asin: string,
  opts: { q?: string; sentiment?: string; sort_by?: string; limit?: number; offset?: number },
): Promise<ReviewsPage> {
  return apiFetch<ReviewsPage>(`/products/${asin}/reviews`, opts);
}

export interface ProductListItem {
  asin: string;
  title: string;
  brand: string | null;
  main_category: string | null;
  avg_rating: number;
  rating_number: number;
  popularity_score: number;
}

export interface ProductListResponse {
  products: ProductListItem[];
  total: number;
  offset: number;
  limit: number;
  has_more: boolean;
}

export async function fetchProducts(
  limit: number = 20,
  offset: number = 0,
  sortBy: string = 'rating_number',
  q?: string,
): Promise<ProductListResponse> {
  return apiFetch<ProductListResponse>('/products', {
    limit,
    offset,
    sort_by: sortBy,
    ...(q ? { q } : {}),
  });
}
