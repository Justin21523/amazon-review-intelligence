"""Hybrid BM25 + vector search with configurable alpha blending."""

from __future__ import annotations

import numpy as np

from src.retrieval.bm25_retriever import BM25Retriever
from src.retrieval.vector_retriever import VectorRetriever
from src.utils.logging_config import get_logger

logger = get_logger(__name__)


def _normalize_scores(items: list[dict], score_key: str) -> dict[str, float]:
    """Min-max normalize scores to [0, 1], return {asin: normalized_score}."""
    scores = np.array([item[score_key] for item in items], dtype=float)
    mn, mx = scores.min(), scores.max()
    if mx == mn:
        normalized = np.ones_like(scores)
    else:
        normalized = (scores - mn) / (mx - mn)
    return {item["asin"]: float(s) for item, s in zip(items, normalized)}


class HybridRanker:
    """Fuse BM25 and vector scores with a linear alpha blend.

    alpha=0.0 → pure BM25 (lexical)
    alpha=1.0 → pure vector (semantic)
    alpha=0.5 → equal blend (default)
    """

    def __init__(
        self,
        bm25_retriever: BM25Retriever | None = None,
        vector_retriever: VectorRetriever | None = None,
    ) -> None:
        self._bm25 = bm25_retriever or BM25Retriever()
        self._vec = vector_retriever or VectorRetriever()

    def search(
        self,
        query: str,
        k: int = 10,
        alpha: float = 0.5,
        conn=None,
        fetch_k: int | None = None,
    ) -> list[dict]:
        """Return top-k products by blended score.

        Args:
            query:    Search query string.
            k:        Number of results to return.
            alpha:    Blend weight — 0 = BM25 only, 1 = vector only.
            conn:     Optional DuckDB connection (uses singleton if None).
            fetch_k:  Internal candidate pool size (defaults to k * 4).

        Returns:
            List of {"asin", "bm25_score", "vector_score", "hybrid_score", "rank"}.
        """
        if conn is None:
            from src.utils.db import get_connection
            conn = get_connection()

        pool = fetch_k or max(k * 4, 50)

        # Retrieve candidates from each retriever
        bm25_results = self._bm25.search(query, k=pool)
        vec_results = self._vec.search(query, k=pool, conn=conn)

        bm25_norm = _normalize_scores(bm25_results, "bm25_score")
        vec_norm = _normalize_scores(vec_results, "vector_score")

        # Union of candidate asins
        all_asins = set(bm25_norm) | set(vec_norm)
        blended: list[dict] = []
        for asin in all_asins:
            b = bm25_norm.get(asin, 0.0)
            v = vec_norm.get(asin, 0.0)
            hybrid = (1 - alpha) * b + alpha * v
            blended.append(
                {
                    "asin": asin,
                    "bm25_score": b,
                    "vector_score": v,
                    "hybrid_score": hybrid,
                }
            )

        blended.sort(key=lambda x: -x["hybrid_score"])
        for rank, item in enumerate(blended[:k]):
            item["rank"] = rank + 1

        return blended[:k]
