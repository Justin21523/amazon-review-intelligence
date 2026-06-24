"""Pydantic v2 response schemas for the FastAPI endpoints."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = "ok"
    version: str
    duckdb: str
    products_count: int
    reviews_count: int


class ProductHit(BaseModel):
    asin: str
    title: str | None = None
    avg_rating: float | None = None
    rating_number: int | None = None
    main_category: str | None = None
    price: float | None = None
    bm25_score: float | None = None
    vector_score: float | None = None
    hybrid_score: float | None = None
    rerank_score: float | None = None
    rank: int | None = None
    explanation: str | None = None
    explanation_type: str | None = None
    seed_asin: str | None = None


class SearchResponse(BaseModel):
    query: str
    mode: str
    alpha: float | None = None
    k: int
    total: int
    latency_ms: float
    results: list[ProductHit]


class ReviewSummary(BaseModel):
    review_id: str
    rating: float
    title: str | None
    text: str | None
    sentiment_label: str | None
    helpful_vote: int | None


class ReviewDetail(BaseModel):
    review_id: str
    rating: float
    title: str | None = None
    text: str | None = None
    helpful_vote: int = 0
    sentiment_label: str | None = None
    verified_purchase: bool = False
    date: str | None = None


class ProductDetail(BaseModel):
    asin: str
    title: str | None
    brand: str | None
    main_category: str | None
    description: str | None
    price: float | None
    avg_rating: float | None
    rating_number: int | None
    reputation_score: float | None
    rating_distribution: dict[str, int] = Field(default_factory=dict)
    top_reviews: list[ReviewSummary] = Field(default_factory=list)


class ProductSummary(BaseModel):
    asin: str
    summary_text: str | None
    pros: list[str] = Field(default_factory=list)
    cons: list[str] = Field(default_factory=list)
    sentiment_distribution: dict[str, int] = Field(default_factory=dict)
    total_reviews: int = 0


class RecommendationResponse(BaseModel):
    user_id: str
    strategy: str
    k: int
    user_review_count: int = 0
    recommendations: list[ProductHit]
    seed_product_asin: str | None = None


class BrandStats(BaseModel):
    brand: str
    product_count: int
    avg_rating: float


class CategoryStats(BaseModel):
    category: str
    product_count: int
    review_count: int
    avg_rating: float


class OverviewStats(BaseModel):
    products_count: int
    reviews_count: int
    avg_rating: float
    unique_reviewers: int
    categories_count: int
    embeddings_count: int
    date_range_start: str | None
    date_range_end: str | None
    query_log_count: int
    bm25_doc_count: int | None = None
    vector_doc_count: int | None = None


class TrendPoint(BaseModel):
    month: str
    count: int
    avg_rating: float | None = None
    negative_rate: float | None = None


class TopProduct(BaseModel):
    asin: str
    title: str | None
    avg_rating: float
    rating_number: int
    popularity_score: float


class RatingBucket(BaseModel):
    rating: int
    count: int


class UserSample(BaseModel):
    user_id: str
    review_count: int


class ProductSuggest(BaseModel):
    asin: str
    title: str | None = None
    avg_rating: float | None = None
    rating_number: int | None = None
