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
    has_reviews = conn.execute(
        "SELECT COUNT(*) FROM reviews WHERE user_id = ?", [user_id]
    ).fetchone()[0] > 0
    strategy = "content_based" if has_reviews else "popularity"

    if not recs:
        return RecommendationResponse(
            user_id=user_id, strategy=strategy, k=k, recommendations=[]
        )

    asins = [r["asin"] for r in recs]
    placeholders = ", ".join(["?"] * len(asins))
    meta_rows = conn.execute(
        f"SELECT asin, title, avg_rating, rating_number, main_category, price FROM products WHERE asin IN ({placeholders})",
        asins,
    ).fetchall()
    meta = {r[0]: r for r in meta_rows}

    hits = [
        ProductHit(
            asin=r["asin"],
            title=meta.get(r["asin"], [None] * 6)[1],
            avg_rating=meta.get(r["asin"], [None] * 6)[2],
            rating_number=meta.get(r["asin"], [None] * 6)[3],
            main_category=meta.get(r["asin"], [None] * 6)[4],
            price=meta.get(r["asin"], [None] * 6)[5],
            rank=i + 1,
        )
        for i, r in enumerate(recs)
    ]

    return RecommendationResponse(
        user_id=user_id, strategy=strategy, k=k, recommendations=hits
    )
