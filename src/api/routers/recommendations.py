"""Recommendation endpoint."""

from fastapi import APIRouter, Query

from src.api.schemas import ProductHit, RecommendationResponse
from src.utils.db import get_connection

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.get("/user/{user_id}", response_model=RecommendationResponse)
def get_user_recommendations(user_id: str, k: int = Query(10, ge=1, le=50)) -> RecommendationResponse:
    """Return product recommendations for a user (cold-start aware)."""
    conn = get_connection()
    from src.api.state import get_state
    state = get_state()

    recs = state.cold_start.recommend_for_user(user_id, k=k, conn=conn)

    # Check if user is warm or cold
    user_review_count = conn.execute(
        "SELECT COUNT(*) FROM reviews WHERE user_id = ?", [user_id]
    ).fetchone()[0]
    has_reviews = user_review_count > 0
    strategy = "content_based" if has_reviews else "popularity"

    # Identify seed product (highest-rated review for content_based)
    seed_asin: str | None = None
    if has_reviews:
        seed_row = conn.execute(
            "SELECT asin FROM reviews WHERE user_id = ? ORDER BY rating DESC, helpful_vote DESC LIMIT 1",
            [user_id],
        ).fetchone()
        seed_asin = seed_row[0] if seed_row else None

    if not recs:
        return RecommendationResponse(
            user_id=user_id,
            strategy=strategy,
            k=k,
            user_review_count=user_review_count,
            recommendations=[],
            seed_product_asin=seed_asin,
        )

    asins = [r["asin"] for r in recs]
    placeholders = ", ".join(["?"] * len(asins))
    meta_rows = conn.execute(
        f"SELECT asin, title, avg_rating, rating_number, main_category, price, reputation_score FROM products WHERE asin IN ({placeholders})",
        asins,
    ).fetchall()
    meta = {r[0]: r for r in meta_rows}

    hits = []
    for i, r in enumerate(recs):
        row = meta.get(r["asin"])
        if row is None:
            continue
        score = r.get("similarity_score") or r.get("score")
        rep_score = row[6]
        if strategy == "content_based":
            pct = round((float(score) * 100) if score is not None else 0)
            explanation = f"與你評論過的商品相似 {pct}%"
            explanation_type = "content_based"
        else:
            explanation = f"熱門商品 · 聲譽分 {round(float(rep_score), 1) if rep_score is not None else 0}"
            explanation_type = "popularity"
        hits.append(
            ProductHit(
                asin=r["asin"],
                title=row[1],
                avg_rating=row[2],
                rating_number=row[3],
                main_category=row[4],
                price=row[5],
                vector_score=float(score) if strategy == "content_based" and score is not None else None,
                rerank_score=float(rep_score) if strategy == "popularity" and rep_score is not None else None,
                rank=i + 1,
                explanation=explanation,
                explanation_type=explanation_type,
                seed_asin=seed_asin,
            )
        )

    return RecommendationResponse(
        user_id=user_id,
        strategy=strategy,
        k=k,
        user_review_count=user_review_count,
        recommendations=hits,
        seed_product_asin=seed_asin,
    )
