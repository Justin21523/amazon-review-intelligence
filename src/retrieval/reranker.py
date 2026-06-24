"""Reranker interface and simple popularity-aware implementation.

The RerankerInterface is ready to swap in a cross-encoder model
(e.g., cross-encoder/ms-marco-MiniLM-L-6-v2) for production use.
"""

from __future__ import annotations

import math
from abc import ABC, abstractmethod


class RerankerInterface(ABC):
    """Abstract reranker — takes candidates, returns re-scored list."""

    @abstractmethod
    def rerank(
        self,
        query: str,
        candidates: list[dict],
        conn=None,
    ) -> list[dict]:
        """Rerank candidates and return sorted list with 'rerank_score' key."""
        ...


class SimpleReranker(RerankerInterface):
    """Boost retrieval scores by product popularity and rating.

    score = retrieval_score * (1 + log(1 + rating_number) * avg_rating / 10)

    This biases results toward well-reviewed products without overriding
    the retrieval signal. To upgrade: replace with cross-encoder scoring.
    """

    def rerank(self, query: str, candidates: list[dict], conn=None) -> list[dict]:
        if not candidates:
            return candidates
        if conn is None:
            from src.utils.db import get_connection
            conn = get_connection()

        asins = [c["asin"] for c in candidates]
        placeholders = ", ".join(["?"] * len(asins))
        rows = conn.execute(
            f"SELECT asin, avg_rating, rating_number FROM products WHERE asin IN ({placeholders})",
            asins,
        ).fetchall()
        stats = {r[0]: (r[1] or 0.0, r[2] or 0) for r in rows}

        reranked = []
        for item in candidates:
            asin = item["asin"]
            avg_r, n = stats.get(asin, (0.0, 0))
            boost = 1.0 + math.log1p(n) * avg_r / 10.0
            base = item.get("hybrid_score", item.get("bm25_score", item.get("vector_score", 0.0)))
            item = dict(item)
            item["rerank_score"] = round(base * boost, 4)
            reranked.append(item)

        reranked.sort(key=lambda x: -x["rerank_score"])
        for rank, item in enumerate(reranked):
            item["rank"] = rank + 1
        return reranked
