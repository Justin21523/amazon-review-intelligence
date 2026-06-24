"""Analytics endpoints: brands, categories, overview, trends, top-products, evaluation."""

import json
from pathlib import Path

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from src.api.schemas import BrandStats, CategoryStats, OverviewStats, RatingBucket, TrendPoint, TopProduct
from src.utils.db import get_connection
from src.utils.paths import DATA_DIR

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/brands", response_model=list[BrandStats])
def get_brand_analytics(limit: int = Query(20, ge=1, le=100)) -> list[BrandStats]:
    """Return top brands by product count and average rating."""
    conn = get_connection()
    rows = conn.execute(
        """
        SELECT COALESCE(brand, 'Unknown') AS brand,
               COUNT(*) AS product_count,
               ROUND(AVG(avg_rating), 3) AS avg_rating
        FROM products
        GROUP BY brand
        ORDER BY product_count DESC
        LIMIT ?
        """,
        [limit],
    ).fetchall()
    return [BrandStats(brand=r[0], product_count=r[1], avg_rating=r[2] or 0.0) for r in rows]


@router.get("/categories", response_model=list[CategoryStats])
def get_category_analytics() -> list[CategoryStats]:
    """Return category breakdown with review counts."""
    conn = get_connection()
    rows = conn.execute(
        """
        SELECT p.main_category,
               COUNT(DISTINCT p.asin) AS product_count,
               COUNT(r.review_id) AS review_count,
               ROUND(AVG(p.avg_rating), 3) AS avg_rating
        FROM products p
        LEFT JOIN reviews r ON p.asin = r.asin
        GROUP BY p.main_category
        ORDER BY product_count DESC
        """
    ).fetchall()
    return [
        CategoryStats(
            category=r[0] or "Unknown",
            product_count=r[1],
            review_count=r[2],
            avg_rating=r[3] or 0.0,
        )
        for r in rows
    ]


@router.get("/overview", response_model=OverviewStats)
def get_overview() -> OverviewStats:
    """Platform-wide KPI summary for the overview dashboard."""
    conn = get_connection()
    row = conn.execute(
        """
        SELECT
            (SELECT COUNT(*) FROM products) AS products_count,
            (SELECT COUNT(*) FROM reviews) AS reviews_count,
            (SELECT ROUND(AVG(avg_rating), 3) FROM products) AS avg_rating,
            (SELECT COUNT(DISTINCT user_id) FROM reviews) AS unique_reviewers,
            (SELECT COUNT(DISTINCT main_category) FROM products) AS categories_count,
            (SELECT COUNT(*) FROM product_embeddings) AS embeddings_count,
            (SELECT strftime(to_timestamp(MIN(timestamp)/1000), '%Y-%m-%d') FROM reviews WHERE timestamp IS NOT NULL AND timestamp > 0) AS date_start,
            (SELECT strftime(to_timestamp(MAX(timestamp)/1000), '%Y-%m-%d') FROM reviews WHERE timestamp IS NOT NULL AND timestamp > 0) AS date_end,
            (SELECT COUNT(*) FROM query_logs) AS query_count
        """
    ).fetchone()
    return OverviewStats(
        products_count=row[0] or 0,
        reviews_count=row[1] or 0,
        avg_rating=row[2] or 0.0,
        unique_reviewers=row[3] or 0,
        categories_count=row[4] or 0,
        embeddings_count=row[5] or 0,
        date_range_start=row[6],
        date_range_end=row[7],
        query_log_count=row[8] or 0,
    )


@router.get("/trends", response_model=list[TrendPoint])
def get_trends() -> list[TrendPoint]:
    """Monthly review volume for trend chart."""
    conn = get_connection()
    rows = conn.execute(
        """
        SELECT strftime(to_timestamp(timestamp / 1000), '%Y-%m') AS month,
               COUNT(*) AS cnt
        FROM reviews
        WHERE timestamp IS NOT NULL
          AND timestamp > 0
        GROUP BY month
        ORDER BY month
        """
    ).fetchall()
    return [TrendPoint(month=r[0], count=r[1]) for r in rows if r[0]]


@router.get("/top-products", response_model=list[TopProduct])
def get_top_products(limit: int = Query(20, ge=1, le=100)) -> list[TopProduct]:
    """Top products by popularity score (avg_rating * ln(1+rating_number))."""
    conn = get_connection()
    rows = conn.execute(
        """
        SELECT asin, title,
               avg_rating,
               rating_number,
               ROUND(avg_rating * LN(1.0 + rating_number), 4) AS pop_score
        FROM products
        WHERE avg_rating IS NOT NULL AND rating_number IS NOT NULL AND rating_number > 0
        ORDER BY pop_score DESC
        LIMIT ?
        """,
        [limit],
    ).fetchall()
    return [
        TopProduct(
            asin=r[0],
            title=r[1],
            avg_rating=r[2] or 0.0,
            rating_number=r[3] or 0,
            popularity_score=r[4] or 0.0,
        )
        for r in rows
    ]


@router.get("/rating-distribution", response_model=list[RatingBucket])
def get_rating_distribution() -> list[RatingBucket]:
    """Review-level star rating distribution."""
    conn = get_connection()
    rows = conn.execute(
        """
        SELECT CAST(rating AS INT) AS star, COUNT(*) AS cnt
        FROM reviews
        WHERE rating IS NOT NULL
        GROUP BY star
        ORDER BY star
        """
    ).fetchall()
    return [RatingBucket(rating=r[0], count=r[1]) for r in rows]


@router.get("/evaluation")
def get_evaluation() -> JSONResponse:
    """Serve evaluation_results.json for the evaluation dashboard."""
    eval_path = DATA_DIR / "evaluation_results.json"
    if not eval_path.exists():
        return JSONResponse(content={}, status_code=404)
    with open(eval_path) as f:
        data = json.load(f)
    return JSONResponse(content=data)
