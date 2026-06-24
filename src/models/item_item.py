"""Item-item collaborative filtering based on rating co-occurrence."""

from __future__ import annotations

import numpy as np
from sklearn.preprocessing import normalize

from src.utils.logging_config import get_logger

logger = get_logger(__name__)


class ItemItemModel:
    """Adjusted cosine item-item similarity from user-product rating matrix."""

    def __init__(self) -> None:
        self._item_vectors: np.ndarray | None = None
        self._asins: list[str] = []

    def fit(self, conn) -> "ItemItemModel":
        """Build item vectors from reviews table in DuckDB."""
        rows = conn.execute(
            "SELECT user_id, asin, rating FROM reviews WHERE rating IS NOT NULL"
        ).fetchall()
        if not rows:
            logger.warning("No review ratings found for item-item model.")
            return self

        import pandas as pd

        df = pd.DataFrame(rows, columns=["user_id", "asin", "rating"])
        # Only keep users with ≥2 reviews and products with ≥2 reviews
        user_counts = df["user_id"].value_counts()
        product_counts = df["asin"].value_counts()
        df = df[
            df["user_id"].isin(user_counts[user_counts >= 2].index)
            & df["asin"].isin(product_counts[product_counts >= 2].index)
        ]
        if df.empty:
            logger.warning("Sparse matrix; using mean-centered ratings.")
            df = pd.DataFrame(rows, columns=["user_id", "asin", "rating"])

        # Adjusted cosine: center each user's ratings
        user_mean = df.groupby("user_id")["rating"].mean()
        df["centered"] = df["rating"] - df["user_id"].map(user_mean)

        matrix = df.pivot_table(
            index="asin", columns="user_id", values="centered", fill_value=0
        )
        self._asins = list(matrix.index)
        self._item_vectors = normalize(matrix.values, norm="l2")
        logger.info("ItemItemModel fit: %d items", len(self._asins))
        return self

    def similar_products(self, asin: str, k: int = 10) -> list[dict]:
        """Return top-k similar items by adjusted cosine similarity."""
        if self._item_vectors is None:
            raise RuntimeError("Model not fitted. Call fit() first.")
        if asin not in self._asins:
            return []

        idx = self._asins.index(asin)
        scores = self._item_vectors @ self._item_vectors[idx]
        ranked = sorted(
            ((self._asins[i], float(scores[i])) for i in range(len(self._asins)) if i != idx),
            key=lambda x: -x[1],
        )
        return [
            {"asin": a, "similarity_score": s, "rank": r + 1}
            for r, (a, s) in enumerate(ranked[:k])
        ]
