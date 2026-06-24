"""User sample endpoint for demo purposes."""

from fastapi import APIRouter, Query

from src.api.schemas import UserSample
from src.utils.db import get_connection

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/sample", response_model=list[UserSample])
def get_user_samples(limit: int = Query(20, ge=1, le=100)) -> list[UserSample]:
    """Return a diverse mix of user IDs with review counts for demo selection.

    Returns users across three tiers:
    - Power users (>=50 reviews) — content_based strategy
    - Regular users (5-49 reviews) — content_based strategy
    - Light users (1-4 reviews) — borderline / cold-start
    """
    conn = get_connection()

    tier_top = limit // 3
    tier_mid = limit // 3
    tier_light = limit - tier_top - tier_mid

    if limit >= 3:
        tier_top = max(1, tier_top)
        tier_mid = max(1, tier_mid)
        tier_light = max(1, limit - tier_top - tier_mid)
    elif limit == 2:
        tier_top, tier_mid, tier_light = 1, 1, 0
    else:
        tier_top, tier_mid, tier_light = 1, 0, 0

    rows_top = conn.execute(
        """
        SELECT user_id, COUNT(*) AS review_count
        FROM reviews
        GROUP BY user_id
        HAVING COUNT(*) >= 50
        ORDER BY review_count DESC
        LIMIT ?
        """,
        [tier_top],
    ).fetchall()

    rows_mid = conn.execute(
        """
        SELECT user_id, COUNT(*) AS review_count
        FROM reviews
        GROUP BY user_id
        HAVING COUNT(*) BETWEEN 5 AND 49
        ORDER BY RANDOM()
        LIMIT ?
        """,
        [tier_mid],
    ).fetchall()

    rows_light = conn.execute(
        """
        SELECT user_id, COUNT(*) AS review_count
        FROM reviews
        GROUP BY user_id
        HAVING COUNT(*) BETWEEN 1 AND 4
        ORDER BY RANDOM()
        LIMIT ?
        """,
        [tier_light],
    ).fetchall()

    combined = list(rows_top) + list(rows_mid) + list(rows_light)
    return [UserSample(user_id=r[0], review_count=r[1]) for r in combined]
