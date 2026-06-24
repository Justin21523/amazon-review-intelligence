"""Analytics endpoints: brands and categories."""

from fastapi import APIRouter, Query

from src.api.schemas import BrandStats, CategoryStats
from src.utils.db import get_connection

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
