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
  explanation?: string;
  explanation_type?: 'content_based' | 'popularity';
  seed_asin?: string | null;
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

export interface TopReview {
  text: string;
  rating: number;
  helpful_vote: number;
}

export interface ProductSummary {
  asin: string;
  summary_text?: string;
  pros: string[];
  cons: string[];
  sentiment_distribution: Record<string, number>;
  total_reviews: number;
  avg_rating?: number;
  review_count?: number;
  top_reviews?: TopReview[];
}

export interface RecommendationResponse {
  user_id: string;
  strategy: string;
  k: number;
  user_review_count: number;
  recommendations: ProductHit[];
  seed_product_asin?: string | null;
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
  bm25_doc_count?: number | null;
  vector_doc_count?: number | null;
}

export interface RecentQuery {
  query: string;
  mode: string;
  latency_ms: number;
  results_count: number;
  timestamp: string;
}

export interface TrendPoint {
  month: string;
  count: number;
  avg_rating?: number;
  negative_rate?: number;
}

export interface ProductIntelligenceItem {
  asin: string;
  title?: string | null;
  avg_rating: number;
  rating_number: number;
  reputation_score: number;
  negative_rate: number;
  verified_ratio: number;
  helpful_vote_avg: number;
  reputation_tier: 'high' | 'medium' | 'low';
}

export interface ReviewerSegment {
  segment: string;
  reviewer_count: number;
  avg_reviews: number;
  avg_rating: number;
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

export interface ReviewDensityBucket {
  bucket: string;
  product_count: number;
}

export interface UserSample {
  user_id: string;
  review_count: number;
}

export interface ProductSuggest {
  asin: string;
  title?: string;
  avg_rating?: number;
  rating_number?: number;
}

export interface ProductGroupMetric {
  rating_tier: string;
  review_tier: string;
  product_count: number;
  avg_rating: number;
  avg_negative_rate: number;
  avg_review_count: number;
  avg_helpful_vote: number;
  avg_verified_ratio: number;
}

export interface ProductQualityTier {
  rating_tier: string;
  product_count: number;
  avg_rating: number;
  avg_negative_rate: number;
  avg_helpful_vote: number;
  avg_verified_ratio: number;
}

export interface UserGroupMetric {
  activity_tier: string;
  rating_style: string;
  user_count: number;
  avg_reviews: number;
  avg_rating: number;
  avg_helpful: number;
  strategy: 'content_based' | 'cold_start';
}

export interface SearchQualityMetric {
  avg_rating: number;
  high_quality_pct: number;
  premium_pct: number;
  sample_size: number;
}

export interface RatingTimelinePoint {
  month: string;
  review_count: number;
  avg_rating: number;
  negative_count: number;
}

export interface ClusterPoint {
  asin: string;
  x: number;
  y: number;
  title?: string;
  category?: string;
  avg_rating?: number;
  rating_number?: number;
}

export interface ReviewDetail {
  review_id: string;
  rating: number;
  title?: string;
  text?: string;
  helpful_vote: number;
  sentiment_label?: string;
  verified_purchase?: boolean;
  date?: string;
}

export interface ReviewsPage {
  reviews: ReviewDetail[];
  total: number;
  has_more: boolean;
}

export interface EvaluationExtended {
  product_groups: ProductGroupMetric[];
  product_quality: ProductQualityTier[];
  user_groups: UserGroupMetric[];
  search_quality: Record<string, SearchQualityMetric>;
}
