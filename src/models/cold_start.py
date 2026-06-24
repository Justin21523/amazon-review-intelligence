"""Cold-start recommender: popularity baseline with category/brand context."""

from __future__ import annotations

from src.models.content_based import ContentBasedModel
from src.models.popularity_model import PopularityModel
from src.utils.logging_config import get_logger

logger = get_logger(__name__)


class ColdStartModel:
    """Recommend products for new or sparse users.

    Strategy:
    - If user has ≥1 reviewed product: use content-based similarity to their
      highest-rated product.
    - Otherwise: fall back to global popularity within their inferred category.
    """

    def __init__(self) -> None:
        self._pop = PopularityModel()
        self._cb: ContentBasedModel | None = None

    def _get_cb(self) -> ContentBasedModel:
        if self._cb is None:
            self._cb = ContentBasedModel()
        return self._cb

    def recommend_by_category(
        self,
        category: str,
        k: int = 10,
        conn=None,
    ) -> list[dict]:
        """Return popular products in a given category."""
        return self._pop.recommend(category=category, k=k, conn=conn)

    def recommend_for_user(
        self,
        user_id: str,
        k: int = 10,
        conn=None,
    ) -> list[dict]:
        """Return recommendations for a user.

        - Warm path: content-based from their highest-rated product.
        - Cold path: global popularity.
        """
        if conn is None:
            from src.utils.db import get_connection
            conn = get_connection()

        rows = conn.execute(
            """
            SELECT asin, rating FROM reviews
            WHERE user_id = ?
            ORDER BY rating DESC
            LIMIT 1
            """,
            [user_id],
        ).fetchall()

        if rows:
            seed_asin = rows[0][0]
            logger.debug("Warm start for user %s from product %s", user_id, seed_asin)
            try:
                cb = self._get_cb()
                similar = cb.similar_products(seed_asin, k=k, conn=conn)
                if similar:
                    return similar
            except Exception as e:
                logger.warning("Content-based fallback failed: %s", e)

        logger.debug("Cold start for user %s → popularity", user_id)
        return self._pop.recommend(k=k, conn=conn)
