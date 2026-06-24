"""Popularity-based product recommender."""

from __future__ import annotations

import math


class PopularityModel:
    """Rank products by a popularity score: avg_rating * sqrt(rating_number)."""

    def recommend(
        self,
        category: str | None = None,
        k: int = 10,
        conn=None,
    ) -> list[dict]:
        """Return top-k most popular products, optionally filtered by category.

        Returns:
            List of {"asin", "avg_rating", "rating_number", "popularity_score"}.
        """
        if conn is None:
            from src.utils.db import get_connection
            conn = get_connection()

        if category:
            rows = conn.execute(
                """
                SELECT asin, avg_rating, rating_number, title
                FROM products
                WHERE main_category = ?
                ORDER BY avg_rating * SQRT(rating_number) DESC
                LIMIT ?
                """,
                [category, k],
            ).fetchall()
        else:
            rows = conn.execute(
                """
                SELECT asin, avg_rating, rating_number, title
                FROM products
                ORDER BY avg_rating * SQRT(rating_number) DESC
                LIMIT ?
                """,
                [k],
            ).fetchall()

        return [
            {
                "asin": r[0],
                "avg_rating": r[1],
                "rating_number": r[2],
                "title": r[3],
                "popularity_score": round((r[1] or 0) * math.sqrt(r[2] or 0), 3),
            }
            for r in rows
        ]
