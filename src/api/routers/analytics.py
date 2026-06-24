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
    # Try to read in-memory index sizes from loaded state
    bm25_doc_count: int | None = None
    vector_doc_count: int | None = None
    try:
        from src.api.state import get_state as _gs
        _state = _gs()
        if _state.bm25 and _state.bm25._indexer:
            bm25_doc_count = len(_state.bm25._indexer.doc_ids)
        if _state.vector and _state.vector._embeddings is not None:
            vector_doc_count = int(_state.vector._embeddings.shape[0])
    except Exception:
        pass

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
        bm25_doc_count=bm25_doc_count,
        vector_doc_count=vector_doc_count,
    )


@router.get("/recent-queries")
def get_recent_queries(limit: int = Query(10, ge=1, le=50)) -> list[dict]:
    """Return the most recent search queries from the query log."""
    conn = get_connection()
    try:
        rows = conn.execute(
            """
            SELECT query_text, mode, latency_ms, results_count, timestamp
            FROM query_logs
            ORDER BY timestamp DESC
            LIMIT ?
            """,
            [limit],
        ).fetchall()
        return [
            {
                "query": r[0],
                "mode": r[1],
                "latency_ms": round(float(r[2]), 1),
                "results_count": r[3],
                "timestamp": str(r[4]),
            }
            for r in rows
        ]
    except Exception:
        return []


@router.get("/trends", response_model=list[TrendPoint])
def get_trends() -> list[TrendPoint]:
    """Monthly review volume with avg rating and negative rate for trend chart."""
    conn = get_connection()
    rows = conn.execute(
        """
        SELECT strftime(to_timestamp(timestamp / 1000), '%Y-%m') AS month,
               COUNT(*) AS cnt,
               ROUND(AVG(rating), 3) AS avg_rating,
               ROUND(SUM(CASE WHEN rating <= 2 THEN 1 ELSE 0 END) * 1.0 / COUNT(*), 3) AS negative_rate
        FROM reviews
        WHERE timestamp IS NOT NULL
          AND timestamp > 0
        GROUP BY month
        ORDER BY month
        """
    ).fetchall()
    return [TrendPoint(month=r[0], count=r[1], avg_rating=r[2], negative_rate=r[3])
            for r in rows if r[0]]


@router.get("/product-intelligence")
def get_product_intelligence(limit: int = Query(20, ge=5, le=100)) -> list[dict]:
    """Top products by reputation score with tier classification."""
    conn = get_connection()
    rows = conn.execute(
        """
        WITH review_stats AS (
            SELECT asin,
                   ROUND(SUM(CASE WHEN rating <= 2 THEN 1 ELSE 0 END) * 1.0 / COUNT(*), 3) AS negative_rate,
                   ROUND(AVG(helpful_vote), 3) AS helpful_vote_avg,
                   ROUND(AVG(CASE WHEN verified_purchase THEN 1.0 ELSE 0.0 END), 3) AS verified_ratio
            FROM reviews GROUP BY asin
        )
        SELECT p.asin, p.title, p.avg_rating, p.rating_number,
               ROUND(p.avg_rating * SQRT(p.rating_number), 3) AS reputation_score,
               ROUND(COALESCE(rs.negative_rate, 0), 3) AS negative_rate,
               ROUND(COALESCE(rs.verified_ratio, 0), 3) AS verified_ratio,
               ROUND(COALESCE(rs.helpful_vote_avg, 0), 3) AS helpful_vote_avg,
               CASE
                 WHEN p.avg_rating * SQRT(p.rating_number) >= 30 THEN 'high'
                 WHEN p.avg_rating * SQRT(p.rating_number) >= 15 THEN 'medium'
                 ELSE 'low'
               END AS reputation_tier
        FROM products p
        LEFT JOIN review_stats rs ON p.asin = rs.asin
        WHERE p.avg_rating IS NOT NULL AND p.rating_number > 0
        ORDER BY reputation_score DESC
        LIMIT ?
        """,
        [limit],
    ).fetchall()
    return [
        {
            "asin": r[0], "title": r[1], "avg_rating": r[2], "rating_number": r[3],
            "reputation_score": r[4], "negative_rate": r[5], "verified_ratio": r[6],
            "helpful_vote_avg": r[7], "reputation_tier": r[8],
        }
        for r in rows
    ]


@router.get("/reviewer-segments")
def get_reviewer_segments() -> list[dict]:
    """Reviewer segmentation by review count."""
    conn = get_connection()
    rows = conn.execute(
        """
        SELECT segment, segment_order, COUNT(*) AS reviewer_count,
               ROUND(AVG(review_count), 1) AS avg_reviews,
               ROUND(AVG(avg_rating), 3) AS avg_rating
        FROM (
          SELECT user_id,
                 COUNT(*) AS review_count,
                 AVG(rating) AS avg_rating,
                 CASE
                   WHEN COUNT(*) >= 100 THEN '高影響力'
                   WHEN COUNT(*) >= 20  THEN '活躍'
                   WHEN COUNT(*) >= 5   THEN '一般'
                   WHEN COUNT(*) >= 2   THEN '偶發'
                   ELSE '一次性'
                 END AS segment,
                 CASE
                   WHEN COUNT(*) >= 100 THEN 1
                   WHEN COUNT(*) >= 20  THEN 2
                   WHEN COUNT(*) >= 5   THEN 3
                   WHEN COUNT(*) >= 2   THEN 4
                   ELSE 5
                 END AS segment_order
          FROM reviews GROUP BY user_id
        ) t
        GROUP BY segment, segment_order
        ORDER BY segment_order
        """
    ).fetchall()
    return [
        {"segment": r[0], "reviewer_count": r[2], "avg_reviews": r[3], "avg_rating": r[4]}
        for r in rows
    ]


@router.get("/top-products", response_model=list[TopProduct])
def get_top_products(limit: int = Query(20, ge=1, le=100)) -> list[TopProduct]:
    """Top products by popularity score (avg_rating * ln(1+rating_number))."""
    conn = get_connection()
    rows = conn.execute(
        """
        SELECT asin,
               CASE WHEN LENGTH(COALESCE(title,'')) < 10 THEN asin ELSE title END AS display_title,
               avg_rating,
               rating_number,
               ROUND(avg_rating * LN(1.0 + rating_number), 4) AS pop_score
        FROM products
        WHERE avg_rating IS NOT NULL AND rating_number IS NOT NULL AND rating_number >= 5
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


@router.get("/review-density")
def get_review_density() -> list[dict]:
    """Products grouped by review count bucket — shows data sparsity."""
    conn = get_connection()
    rows = conn.execute(
        """
        SELECT bucket, COUNT(*) AS product_count FROM (
          SELECT
            CASE
              WHEN rating_number = 1         THEN '1'
              WHEN rating_number <= 5        THEN '2–5'
              WHEN rating_number <= 20       THEN '6–20'
              WHEN rating_number <= 100      THEN '21–100'
              ELSE '100+'
            END AS bucket,
            CASE
              WHEN rating_number = 1         THEN 1
              WHEN rating_number <= 5        THEN 2
              WHEN rating_number <= 20       THEN 3
              WHEN rating_number <= 100      THEN 4
              ELSE 5
            END AS bucket_order
          FROM products
          WHERE rating_number IS NOT NULL AND rating_number > 0
        )
        GROUP BY bucket, bucket_order
        ORDER BY bucket_order
        """
    ).fetchall()
    return [{"bucket": r[0], "product_count": r[1]} for r in rows]


@router.get("/evaluation")
def get_evaluation() -> JSONResponse:
    """Serve evaluation_results.json for the evaluation dashboard."""
    eval_path = DATA_DIR / "evaluation_results.json"
    if not eval_path.exists():
        return JSONResponse(content={}, status_code=404)
    with open(eval_path) as f:
        data = json.load(f)
    return JSONResponse(content=data)


@router.get("/evaluation-extended")
def get_evaluation_extended() -> dict:
    """Extended evaluation: product group + user group + live search quality metrics."""
    conn = get_connection()

    # ── 1. Product group matrix (rating_tier × review_tier) ──────────────────
    pg_rows = conn.execute(
        """
        WITH review_stats AS (
            SELECT asin,
                   SUM(CASE WHEN rating <= 2 THEN 1 ELSE 0 END) * 1.0 / COUNT(*) AS negative_rate,
                   AVG(helpful_vote) AS helpful_vote_avg,
                   AVG(CASE WHEN verified_purchase THEN 1.0 ELSE 0.0 END) AS verified_ratio
            FROM reviews GROUP BY asin
        )
        SELECT
            CASE WHEN p.avg_rating >= 4.5 THEN '高評分(≥4.5★)'
                 WHEN p.avg_rating >= 4.0 THEN '良好(4.0-4.5★)'
                 WHEN p.avg_rating >= 3.5 THEN '普通(3.5-4.0★)'
                 ELSE '低評分(<3.5★)' END AS rating_tier,
            CASE WHEN p.rating_number >= 20 THEN '熱門(≥20則)'
                 WHEN p.rating_number >= 5  THEN '活躍(5-19則)'
                 ELSE '稀少(<5則)' END AS review_tier,
            CASE WHEN p.avg_rating >= 4.5 THEN 4
                 WHEN p.avg_rating >= 4.0 THEN 3
                 WHEN p.avg_rating >= 3.5 THEN 2
                 ELSE 1 END AS rt_ord,
            CASE WHEN p.rating_number >= 20 THEN 3
                 WHEN p.rating_number >= 5  THEN 2
                 ELSE 1 END AS rv_ord,
            COUNT(*) AS product_count,
            ROUND(AVG(p.avg_rating), 3) AS avg_rating,
            ROUND(AVG(COALESCE(rs.negative_rate, 0)), 3) AS avg_negative_rate,
            ROUND(AVG(p.rating_number), 1) AS avg_review_count,
            ROUND(AVG(COALESCE(rs.helpful_vote_avg, 0)), 3) AS avg_helpful_vote,
            ROUND(AVG(COALESCE(rs.verified_ratio, 0)), 3) AS avg_verified_ratio
        FROM products p
        LEFT JOIN review_stats rs ON p.asin = rs.asin
        WHERE p.avg_rating IS NOT NULL AND p.rating_number > 0
        GROUP BY rating_tier, review_tier, rt_ord, rv_ord
        ORDER BY rt_ord DESC, rv_ord DESC
        """
    ).fetchall()

    product_groups = [
        {
            "rating_tier": r[0], "review_tier": r[1],
            "product_count": r[4], "avg_rating": r[5],
            "avg_negative_rate": r[6], "avg_review_count": r[7],
            "avg_helpful_vote": r[8], "avg_verified_ratio": r[9],
        }
        for r in pg_rows
    ]

    # ── 2. Product quality tiers (for IR metric simulation) ───────────────────
    pq_rows = conn.execute(
        """
        WITH review_stats AS (
            SELECT asin,
                   SUM(CASE WHEN rating <= 2 THEN 1 ELSE 0 END) * 1.0 / COUNT(*) AS negative_rate,
                   AVG(helpful_vote) AS helpful_vote_avg,
                   AVG(CASE WHEN verified_purchase THEN 1.0 ELSE 0.0 END) AS verified_ratio
            FROM reviews GROUP BY asin
        )
        SELECT rating_tier,
               COUNT(*) AS product_count,
               ROUND(AVG(avg_rating), 3) AS tier_avg_rating,
               ROUND(AVG(COALESCE(rs.negative_rate, 0)), 3) AS tier_neg_rate,
               ROUND(AVG(COALESCE(rs.helpful_vote_avg, 0)), 3) AS tier_helpful,
               ROUND(AVG(COALESCE(rs.verified_ratio, 0)), 3) AS tier_verified
        FROM (
            SELECT p.asin, p.avg_rating,
                   CASE WHEN p.avg_rating >= 4.5 THEN '高評分(≥4.5★)'
                        WHEN p.avg_rating >= 4.0 THEN '良好(4.0-4.5★)'
                        WHEN p.avg_rating >= 3.5 THEN '普通(3.5-4.0★)'
                        ELSE '低評分(<3.5★)' END AS rating_tier,
                   CASE WHEN p.avg_rating >= 4.5 THEN 4
                        WHEN p.avg_rating >= 4.0 THEN 3
                        WHEN p.avg_rating >= 3.5 THEN 2
                        ELSE 1 END AS tier_order
            FROM products p WHERE p.avg_rating IS NOT NULL AND p.rating_number > 0
        ) t
        LEFT JOIN review_stats rs ON t.asin = rs.asin
        GROUP BY rating_tier, tier_order
        ORDER BY tier_order DESC
        """
    ).fetchall()

    product_quality = [
        {
            "rating_tier": r[0], "product_count": r[1],
            "avg_rating": r[2], "avg_negative_rate": r[3],
            "avg_helpful_vote": r[4], "avg_verified_ratio": r[5],
        }
        for r in pq_rows
    ]

    # ── 3. User group matrix (activity_tier × rating_style) ───────────────────
    ug_rows = conn.execute(
        """
        SELECT
            CASE WHEN review_cnt >= 20 THEN '高活躍(≥20則)'
                 WHEN review_cnt >= 5  THEN '一般(5-19則)'
                 WHEN review_cnt >= 2  THEN '輕度(2-4則)'
                 ELSE '新用戶(1則)' END AS activity_tier,
            CASE WHEN avg_r >= 4.5 THEN '正面評論者(≥4.5★)'
                 WHEN avg_r >= 3.5 THEN '均衡評論者(3.5-4.5★)'
                 ELSE '批判評論者(<3.5★)' END AS rating_style,
            CASE WHEN review_cnt >= 20 THEN 1
                 WHEN review_cnt >= 5  THEN 2
                 WHEN review_cnt >= 2  THEN 3
                 ELSE 4 END AS at_ord,
            COUNT(*) AS user_count,
            ROUND(AVG(review_cnt), 1) AS avg_reviews,
            ROUND(AVG(avg_r), 3) AS avg_rating,
            ROUND(AVG(total_helpful), 1) AS avg_helpful,
            CASE WHEN AVG(review_cnt) >= 5 THEN 'content_based'
                 ELSE 'cold_start' END AS strategy
        FROM (
            SELECT user_id,
                   COUNT(*) AS review_cnt,
                   AVG(rating) AS avg_r,
                   SUM(helpful_vote) AS total_helpful
            FROM reviews GROUP BY user_id
        ) t
        GROUP BY activity_tier, rating_style, at_ord
        ORDER BY at_ord, rating_style
        """
    ).fetchall()

    user_groups = [
        {
            "activity_tier": r[0], "rating_style": r[1],
            "user_count": r[3], "avg_reviews": r[4],
            "avg_rating": r[5], "avg_helpful": r[6], "strategy": r[7],
        }
        for r in ug_rows
    ]

    # ── 4. Live search quality (5 representative queries per mode) ────────────
    SAMPLE_QUERIES = ["coffee maker", "knife set", "pan", "bowl", "teapot"]
    search_quality: dict = {}

    try:
        from src.api.state import get_state
        state = get_state()

        for mode in ("bm25", "vector", "hybrid"):
            ratings: list[float] = []
            for q in SAMPLE_QUERIES:
                try:
                    if mode == "bm25" and state.bm25:
                        raw = state.bm25.search(q, k=10)
                    elif mode == "vector" and state.vector:
                        raw = state.vector.search(q, k=10, conn=conn)
                    elif mode == "hybrid" and state.hybrid:
                        raw = state.hybrid.search(q, k=10, alpha=0.5, conn=conn)
                    else:
                        continue

                    asins = [r["asin"] for r in raw]
                    if asins:
                        placeholders = ", ".join(["?"] * len(asins))
                        meta_rows = conn.execute(
                            f"SELECT avg_rating, rating_number FROM products WHERE asin IN ({placeholders}) AND avg_rating IS NOT NULL",
                            asins,
                        ).fetchall()
                        ratings.extend(r[0] for r in meta_rows)
                except Exception:
                    pass

            if ratings:
                four_plus = sum(1 for r in ratings if r >= 4.0)
                four_half_plus = sum(1 for r in ratings if r >= 4.5)
                search_quality[mode] = {
                    "avg_rating": round(sum(ratings) / len(ratings), 3),
                    "high_quality_pct": round(four_plus / len(ratings), 3),
                    "premium_pct": round(four_half_plus / len(ratings), 3),
                    "sample_size": len(ratings),
                }
    except Exception:
        pass

    return {
        "product_groups": product_groups,
        "product_quality": product_quality,
        "user_groups": user_groups,
        "search_quality": search_quality,
    }


@router.get("/embeddings-2d")
def get_embeddings_2d(limit: int = Query(3000, ge=100, le=10000)) -> list[dict]:
    """Return pre-computed UMAP 2D projection for scatter plot visualization."""
    umap_path = DATA_DIR / "umap_2d.json"
    if not umap_path.exists():
        return []
    try:
        records = json.loads(umap_path.read_text())
        # Already sorted by rating_number desc; just slice
        return records[:limit]
    except Exception:
        return []
