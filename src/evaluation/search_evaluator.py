"""Search evaluation: Recall@K, MRR, nDCG@K."""

from __future__ import annotations

import math

import pandas as pd


def recall_at_k(retrieved: list[str], relevant: set[str], k: int) -> float:
    if not relevant:
        return 0.0
    hits = sum(1 for a in retrieved[:k] if a in relevant)
    return hits / len(relevant)


def mrr(retrieved: list[str], relevant: set[str]) -> float:
    for i, a in enumerate(retrieved):
        if a in relevant:
            return 1.0 / (i + 1)
    return 0.0


def ndcg_at_k(retrieved: list[str], relevant: set[str], k: int) -> float:
    dcg = sum(
        1.0 / math.log2(i + 2) for i, a in enumerate(retrieved[:k]) if a in relevant
    )
    ideal_hits = min(len(relevant), k)
    idcg = sum(1.0 / math.log2(i + 2) for i in range(ideal_hits))
    return dcg / idcg if idcg > 0 else 0.0


class SearchEvaluator:
    """Evaluate search retrievers using synthetic relevance judgments.

    Relevance is defined as: any product in the same category as the query seed.
    """

    def __init__(self, conn=None) -> None:
        if conn is None:
            from src.utils.db import get_connection
            conn = get_connection()
        self._conn = conn

    def _build_queries(self, n_queries: int = 20) -> list[dict]:
        """Sample products as query seeds and define relevant sets."""
        rows = self._conn.execute(
            """
            SELECT p.asin, p.title, p.main_category
            FROM products p
            WHERE p.rating_number >= 3
            ORDER BY p.rating_number DESC
            LIMIT ?
            """,
            [n_queries],
        ).fetchall()

        queries = []
        for asin, title, cat in rows:
            # Relevant = other products in the same category (proxy)
            relevant_asins = set(
                r[0]
                for r in self._conn.execute(
                    "SELECT asin FROM products WHERE main_category = ? AND asin != ?",
                    [cat, asin],
                ).fetchall()
            )
            queries.append(
                {
                    "query": title or asin,
                    "seed_asin": asin,
                    "category": cat,
                    "relevant": relevant_asins,
                }
            )
        return queries

    def run_evaluation(
        self,
        retriever,
        k_list: list[int] | None = None,
        n_queries: int = 20,
    ) -> pd.DataFrame:
        """Evaluate a retriever across multiple K values.

        Args:
            retriever: Object with .search(query, k) → list[{"asin", ...}].
            k_list:    K values to evaluate at (default [5, 10, 20]).
            n_queries: Number of test queries.

        Returns:
            DataFrame with columns [k, recall, mrr, ndcg].
        """
        if k_list is None:
            k_list = [5, 10, 20]
        queries = self._build_queries(n_queries)
        if not queries:
            return pd.DataFrame(columns=["k", "recall", "mrr", "ndcg"])

        max_k = max(k_list)
        results = []
        for q in queries:
            try:
                hits = retriever.search(q["query"], k=max_k)
            except Exception:
                hits = []
            retrieved = [h["asin"] for h in hits]
            relevant = q["relevant"]
            for k in k_list:
                results.append(
                    {
                        "query": q["query"][:50],
                        "k": k,
                        "recall": recall_at_k(retrieved, relevant, k),
                        "mrr": mrr(retrieved, relevant),
                        "ndcg": ndcg_at_k(retrieved, relevant, k),
                    }
                )

        df = pd.DataFrame(results)
        summary = df.groupby("k")[["recall", "mrr", "ndcg"]].mean().round(4)
        return summary
