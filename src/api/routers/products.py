"""Product detail, similar products, and summary endpoints."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from fastapi import Query

from src.api.schemas import ProductDetail, ProductHit, ProductSuggest, ProductSummary
from src.api.schemas.responses import ReviewDetail
from src.utils.db import get_connection

router = APIRouter(prefix="/products", tags=["products"])

_SORT_COLS = {
    "rating_number": "rating_number DESC",
    "avg_rating": "avg_rating DESC",
    "popularity": "ROUND(avg_rating * LN(1.0 + rating_number), 4) DESC",
}

def _clean_title(title: str | None, asin: str) -> str:
    """Return ASIN when the title looks like a review headline."""
    t = (title or "").strip()
    if len(t) < 8:
        return asin
    # Very likely review titles: short exclamatory sentences, ends with "!"
    if t.endswith("!") and len(t) < 25:
        return asin
    return t


@router.get("", tags=["products"])
def list_products(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    sort_by: str = Query("rating_number"),
    q: str | None = Query(None),
) -> dict:
    """Browse products with pagination and optional title search."""
    conn = get_connection()
    order = _SORT_COLS.get(sort_by, "rating_number DESC")
    base_where = "avg_rating IS NOT NULL AND rating_number > 0"
    params: list = []

    if q and q.strip():
        base_where += " AND LOWER(title) LIKE LOWER('%' || ? || '%')"
        params.append(q.strip())

    total_row = conn.execute(
        f"SELECT COUNT(*) FROM products WHERE {base_where}", params
    ).fetchone()
    total = total_row[0] if total_row else 0

    rows = conn.execute(
        f"""
        SELECT asin, title, brand, main_category, avg_rating, rating_number,
               ROUND(avg_rating * LN(1.0 + rating_number), 4) AS popularity_score
        FROM products
        WHERE {base_where}
        ORDER BY {order}
        LIMIT ? OFFSET ?
        """,
        [*params, limit, offset],
    ).fetchall()

    products = [
        {
            "asin": r[0],
            "title": _clean_title(r[1], r[0]),
            "brand": r[2],
            "main_category": r[3],
            "avg_rating": r[4] or 0.0,
            "rating_number": r[5] or 0,
            "popularity_score": r[6] or 0.0,
        }
        for r in rows
    ]
    return {"products": products, "total": total, "offset": offset, "limit": limit, "has_more": offset + limit < total}


@router.get("/suggest", response_model=list[ProductSuggest])
def suggest_products(
    q: str = Query(..., min_length=1),
    limit: int = Query(10, ge=1, le=30),
) -> list[ProductSuggest]:
    """Title-based product search for autocomplete."""
    conn = get_connection()
    rows = conn.execute(
        """
        SELECT asin, title, avg_rating, rating_number
        FROM products
        WHERE title IS NOT NULL AND LOWER(title) LIKE LOWER('%' || ? || '%')
        ORDER BY rating_number DESC NULLS LAST
        LIMIT ?
        """,
        [q, limit],
    ).fetchall()
    return [
        ProductSuggest(asin=r[0], title=r[1], avg_rating=r[2], rating_number=r[3])
        for r in rows
    ]


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


@router.get("/{asin}/reviews")
def get_product_reviews(
    asin: str,
    q: str | None = Query(None, description="Full-text search in title and text"),
    sentiment: str | None = Query(None, description="positive | neutral | negative"),
    sort_by: str = Query("helpful_vote", description="helpful_vote | rating | date"),
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
) -> dict:
    """Paginated review list for a product with optional full-text and sentiment filter."""
    conn = get_connection()
    _product_or_404(conn, asin)

    params: list = [asin]
    where_clauses = ["asin = ?"]

    if q:
        where_clauses.append(
            "(LOWER(COALESCE(title,'')) LIKE LOWER('%'||?||'%') OR LOWER(COALESCE(text,'')) LIKE LOWER('%'||?||'%'))"
        )
        params += [q, q]

    if sentiment:
        where_clauses.append("sentiment_label = ?")
        params.append(sentiment)

    where_sql = " AND ".join(where_clauses)

    order_col = {
        "rating": "rating",
        "date": "timestamp",
    }.get(sort_by, "helpful_vote")

    total_row = conn.execute(f"SELECT COUNT(*) FROM reviews WHERE {where_sql}", params).fetchone()
    total = total_row[0] if total_row else 0

    rows = conn.execute(
        f"""
        SELECT review_id, rating, title, text, helpful_vote,
               sentiment_label, verified_purchase,
               strftime(to_timestamp(timestamp / 1000), '%Y-%m-%d') AS date
        FROM reviews
        WHERE {where_sql}
        ORDER BY {order_col} DESC NULLS LAST
        LIMIT ? OFFSET ?
        """,
        params + [limit, offset],
    ).fetchall()

    reviews = [
        ReviewDetail(
            review_id=r[0],
            rating=r[1],
            title=r[2],
            text=(r[3] or "")[:800] if r[3] else None,
            helpful_vote=r[4] or 0,
            sentiment_label=r[5],
            verified_purchase=bool(r[6]),
            date=r[7],
        )
        for r in rows
    ]

    return {
        "reviews": [rv.model_dump() for rv in reviews],
        "total": total,
        "has_more": offset + limit < total,
    }


@router.get("/{asin}/rating-timeline")
def product_rating_timeline(asin: str) -> list[dict]:
    """Return per-month review volume and average rating for a product."""
    conn = get_connection()
    _product_or_404(conn, asin)
    rows = conn.execute(
        """
        SELECT
            strftime(to_timestamp(timestamp / 1000), '%Y-%m') AS month,
            COUNT(*)                                           AS review_count,
            ROUND(AVG(rating), 3)                             AS avg_rating,
            SUM(CASE WHEN rating <= 2 THEN 1 ELSE 0 END)      AS negative_count
        FROM reviews
        WHERE asin = ?
          AND timestamp IS NOT NULL
          AND timestamp > 0
        GROUP BY month
        ORDER BY month
        """,
        [asin],
    ).fetchall()
    return [
        {"month": r[0], "review_count": r[1], "avg_rating": float(r[2]), "negative_count": r[3]}
        for r in rows
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
