"""Content-based recommender using product embedding cosine similarity."""

from __future__ import annotations

import numpy as np

from src.utils.logging_config import get_logger

logger = get_logger(__name__)


class ContentBasedModel:
    """Find similar products by embedding cosine similarity."""

    def __init__(self) -> None:
        self._embeddings: np.ndarray | None = None
        self._asins: list[str] = []

    def _ensure_loaded(self, conn) -> None:
        if self._embeddings is not None:
            return
        rows = conn.execute(
            "SELECT asin, embedding FROM product_embeddings ORDER BY asin"
        ).fetchall()
        if not rows:
            raise RuntimeError("No product embeddings. Run `make index` first.")
        self._asins = [r[0] for r in rows]
        self._embeddings = np.array([r[1] for r in rows], dtype=np.float32)
        logger.info("ContentBasedModel loaded %d embeddings", len(self._asins))

    def similar_products(
        self,
        asin: str,
        k: int = 10,
        conn=None,
    ) -> list[dict]:
        """Return top-k products most similar to the given product.

        Excludes the query product itself.

        Returns:
            List of {"asin", "similarity_score", "rank"}.
        """
        if conn is None:
            from src.utils.db import get_connection
            conn = get_connection()
        self._ensure_loaded(conn)

        if asin not in self._asins:
            logger.warning("asin %s not found in embeddings; returning empty", asin)
            return []

        idx = self._asins.index(asin)
        q_emb = self._embeddings[idx]
        scores = self._embeddings @ q_emb

        ranked = sorted(
            ((self._asins[i], float(scores[i])) for i in range(len(self._asins)) if i != idx),
            key=lambda x: -x[1],
        )
        return [
            {"asin": asin_, "similarity_score": score, "rank": rank + 1}
            for rank, (asin_, score) in enumerate(ranked[:k])
        ]
