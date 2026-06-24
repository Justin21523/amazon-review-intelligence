"""Recommendation evaluation: Precision@K, Recall@K, MAP@K, Coverage."""

from __future__ import annotations

import pandas as pd


def precision_at_k(retrieved: list[str], relevant: set[str], k: int) -> float:
    hits = sum(1 for a in retrieved[:k] if a in relevant)
    return hits / k if k > 0 else 0.0


def recall_at_k(retrieved: list[str], relevant: set[str], k: int) -> float:
    if not relevant:
        return 0.0
    hits = sum(1 for a in retrieved[:k] if a in relevant)
    return hits / len(relevant)


def ap_at_k(retrieved: list[str], relevant: set[str], k: int) -> float:
    """Average Precision@K."""
    hits = 0
    score = 0.0
    for i, a in enumerate(retrieved[:k]):
        if a in relevant:
            hits += 1
            score += hits / (i + 1)
    return score / min(len(relevant), k) if relevant else 0.0


class RecoEvaluator:
    """Evaluate recommendation models via leave-one-out holdout."""

    def __init__(self, conn=None) -> None:
        if conn is None:
            from src.utils.db import get_connection
            conn = get_connection()
        self._conn = conn

    def _build_test_set(self, min_reviews: int = 3) -> list[dict]:
        """Build test set: users with ≥ min_reviews, hold out last interaction."""
        rows = self._conn.execute(
            """
            SELECT user_id, asin, rating, timestamp
            FROM reviews
            ORDER BY user_id, timestamp ASC
            """
        ).fetchall()

        from collections import defaultdict
        user_history: dict[str, list[tuple]] = defaultdict(list)
        for user_id, asin, rating, ts in rows:
            user_history[user_id].append((asin, rating, ts))

        test_set = []
        for user_id, interactions in user_history.items():
            if len(interactions) < min_reviews:
                continue
            # Hold out the last interaction
            train = interactions[:-1]
            held_out = interactions[-1][0]
            test_set.append(
                {
                    "user_id": user_id,
                    "train_asins": {a for a, _, _ in train},
                    "held_out": held_out,
                }
            )
        return test_set

    def run_evaluation(
        self,
        model,
        k_list: list[int] | None = None,
        max_users: int = 100,
    ) -> pd.DataFrame:
        """Evaluate a recommendation model.

        Args:
            model:     Object with .recommend_for_user(user_id, k, conn) → list[{"asin", ...}].
            k_list:    K values to evaluate (default [5, 10, 20]).
            max_users: Max test users (for speed).

        Returns:
            DataFrame with columns [k, precision, recall, map, coverage].
        """
        if k_list is None:
            k_list = [5, 10, 20]
        test_set = self._build_test_set()[:max_users]
        if not test_set:
            return pd.DataFrame(columns=["k", "precision", "recall", "map", "coverage"])

        max_k = max(k_list)
        all_recommended: set[str] = set()
        rows = []
        for entry in test_set:
            try:
                recs = model.recommend_for_user(entry["user_id"], k=max_k, conn=self._conn)
            except Exception:
                recs = []
            retrieved = [r["asin"] for r in recs]
            all_recommended.update(retrieved)
            relevant = {entry["held_out"]}
            for k in k_list:
                rows.append(
                    {
                        "k": k,
                        "precision": precision_at_k(retrieved, relevant, k),
                        "recall": recall_at_k(retrieved, relevant, k),
                        "map": ap_at_k(retrieved, relevant, k),
                    }
                )

        df = pd.DataFrame(rows)
        total_products = self._conn.execute("SELECT COUNT(*) FROM products").fetchone()[0]
        summary = df.groupby("k")[["precision", "recall", "map"]].mean().round(4)
        summary["coverage"] = len(all_recommended) / total_products if total_products else 0
        return summary
