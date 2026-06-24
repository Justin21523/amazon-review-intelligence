"""Product detail, similar products, and summary endpoints."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from src.api.schemas import ProductDetail, ProductHit, ProductSummary
from src.utils.db import get_connection

router = APIRouter(prefix="/products", tags=["products"])


def _product_or_404(conn, asin: str) -> dict:
    row = conn.execute(
        """
        SELECT asin, title, brand, main_category, description, price,
               avg_rating, rating_number, reputation_score
        FROM products WHERE asin = ?
        """,
        [asin],
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"Product {asin} not found")
    keys = ["asin", "title", "brand", "main_category", "description", "price", "avg_rating", "rating_number", "reputation_score"]
    return dict(zip(keys, row))


@router.get("/{asin}", response_model=ProductDetail)
def get_product(asin: str) -> ProductDetail:
    """Return product detail page data including rating distribution and top reviews."""
    conn = get_connection()
    product = _product_or_404(conn, asin)

    # Rating distribution
    rating_rows = conn.execute(
        """
        SELECT CAST(rating AS INTEGER) AS r, COUNT(*) AS cnt
        FROM reviews WHERE asin = ?
        GROUP BY r ORDER BY r
        """,
        [asin],
    ).fetchall()
    rating_dist = {str(r[0]): r[1] for r in rating_rows}

    # Top reviews (by helpful_vote)
    rev_rows = conn.execute(
        """
        SELECT review_id, rating, title, text, sentiment_label, helpful_vote
        FROM reviews WHERE asin = ?
        ORDER BY helpful_vote DESC
        LIMIT 5
        """,
        [asin],
    ).fetchall()
    from src.api.schemas.responses import ReviewSummary
    top_reviews = [
        ReviewSummary(
            review_id=r[0],
            rating=r[1],
            title=r[2],
            text=(r[3] or "")[:500],
            sentiment_label=r[4],
            helpful_vote=r[5],
        )
        for r in rev_rows
    ]

    return ProductDetail(
        **product,
        rating_distribution=rating_dist,
        top_reviews=top_reviews,
    )


@router.get("/{asin}/similar", response_model=list[ProductHit])
def get_similar_products(asin: str, k: int = 10) -> list[ProductHit]:
    """Return similar products using content-based embedding similarity."""
    conn = get_connection()
    _product_or_404(conn, asin)

    from src.api.state import get_state
    state = get_state()

    try:
        similar = state.content_based.similar_products(asin, k=k, conn=conn)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    if not similar:
        return []

    asins = [s["asin"] for s in similar]
    placeholders = ", ".join(["?"] * len(asins))
    meta_rows = conn.execute(
        f"SELECT asin, title, avg_rating, rating_number, main_category, price FROM products WHERE asin IN ({placeholders})",
        asins,
    ).fetchall()
    meta = {r[0]: r for r in meta_rows}

    return [
        ProductHit(
            asin=s["asin"],
            title=meta.get(s["asin"], [None] * 6)[1],
            avg_rating=meta.get(s["asin"], [None] * 6)[2],
            rating_number=meta.get(s["asin"], [None] * 6)[3],
            main_category=meta.get(s["asin"], [None] * 6)[4],
            price=meta.get(s["asin"], [None] * 6)[5],
            vector_score=s.get("similarity_score"),
            rank=s.get("rank"),
        )
        for s in similar
    ]


@router.get("/{asin}/summary", response_model=ProductSummary)
def get_product_summary(asin: str) -> ProductSummary:
    """Return review summary, pros/cons, and sentiment distribution."""
    conn = get_connection()
    _product_or_404(conn, asin)

    row = conn.execute(
        "SELECT summary_text, pros, cons FROM summary_cache WHERE asin = ?",
        [asin],
    ).fetchone()
    summary_text = row[0] if row else None
    pros = list(row[1]) if row and row[1] else []
    cons = list(row[2]) if row and row[2] else []

    sentiment_rows = conn.execute(
        """
        SELECT sentiment_label, COUNT(*) FROM reviews
        WHERE asin = ?
        GROUP BY sentiment_label
        """,
        [asin],
    ).fetchall()
    sentiment_dist = {r[0]: r[1] for r in sentiment_rows}

    total = conn.execute("SELECT COUNT(*) FROM reviews WHERE asin = ?", [asin]).fetchone()[0]

    return ProductSummary(
        asin=asin,
        summary_text=summary_text,
        pros=pros,
        cons=cons,
        sentiment_distribution=sentiment_dist,
        total_reviews=total,
    )
