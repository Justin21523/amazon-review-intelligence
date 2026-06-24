export interface HealthResponse {
  status: string;
  version: string;
  duckdb: string;
  products_count: number;
  reviews_count: number;
}

export interface ProductHit {
  asin: string;
  title?: string;
  avg_rating?: number;
  rating_number?: number;
  main_category?: string;
  price?: number;
  bm25_score?: number;
  vector_score?: number;
  hybrid_score?: number;
  rerank_score?: number;
  rank?: number;
}

export interface SearchResponse {
  query: string;
  mode: string;
  alpha?: number;
  k: number;
  total: number;
  latency_ms: number;
  results: ProductHit[];
}

export interface ReviewSummary {
  review_id: string;
  rating: number;
  title?: string;
  text?: string;
  sentiment_label?: string;
  helpful_vote?: number;
}

export interface ProductDetail {
  asin: string;
  title?: string;
  brand?: string;
  main_category?: string;
  description?: string;
  price?: number;
  avg_rating?: number;
  rating_number?: number;
  reputation_score?: number;
  rating_distribution: Record<string, number>;
  top_reviews: ReviewSummary[];
}

export interface ProductSummary {
  asin: string;
  summary_text?: string;
  pros: string[];
  cons: string[];
  sentiment_distribution: Record<string, number>;
  total_reviews: number;
}

export interface RecommendationResponse {
  user_id: string;
  strategy: string;
  k: number;
  recommendations: ProductHit[];
}

export interface BrandStats {
  brand: string;
  product_count: number;
  avg_rating: number;
}

export interface CategoryStats {
  category: string;
  product_count: number;
  review_count: number;
  avg_rating: number;
}

export interface OverviewStats {
  products_count: number;
  reviews_count: number;
  avg_rating: number;
  unique_reviewers: number;
  categories_count: number;
  embeddings_count: number;
  date_range_start?: string;
  date_range_end?: string;
  query_log_count: number;
}

export interface TrendPoint {
  month: string;
  count: number;
}

export interface TopProduct {
  asin: string;
  title?: string;
  avg_rating: number;
  rating_number: number;
  popularity_score: number;
}

export interface RatingBucket {
  rating: number;
  count: number;
}

export interface EvaluationResults {
  search_bm25: Record<string, Record<string, number>>;
  search_vector: Record<string, Record<string, number>>;
  search_hybrid: Record<string, Record<string, number>>;
  recommendation_cold_start?: Record<string, Record<string, number>>;
}
