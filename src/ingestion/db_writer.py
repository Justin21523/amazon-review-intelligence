"""Write normalized DataFrames into DuckDB tables."""

from __future__ import annotations

import duckdb
import pandas as pd

from src.utils.logging_config import get_logger

logger = get_logger(__name__)

_PRODUCTS_COLS = [
    "asin", "parent_asin", "title", "brand", "main_category",
    "description", "price", "avg_rating", "rating_number",
    "rating_std", "negative_rate", "verified_ratio",
    "helpful_vote_avg", "reputation_score",
]
_REVIEWS_COLS = [
    "review_id", "asin", "user_id", "rating", "title", "text",
    "helpful_vote", "verified_purchase", "sentiment_label",
    "review_length", "word_count", "timestamp", "review_datetime",
]


def _ensure_cols(df: pd.DataFrame, cols: list[str]) -> pd.DataFrame:
    for c in cols:
        if c not in df.columns:
            df[c] = None
    return df[cols]


def write_products(conn: duckdb.DuckDBPyConnection, df: pd.DataFrame) -> int:
    """Upsert products into DuckDB. Returns row count written."""
    df = _ensure_cols(df.copy(), _PRODUCTS_COLS)
    # Explicitly insert named columns so DEFAULT (created_at) is handled by DuckDB
    cols = ", ".join(_PRODUCTS_COLS)
    placeholders = ", ".join([f"src.{c}" for c in _PRODUCTS_COLS])
    conn.register("_products_df", df)
    conn.execute(
        f"""
        INSERT OR REPLACE INTO products ({cols})
        SELECT {cols} FROM _products_df src
        """
    )
    conn.unregister("_products_df")
    count = conn.execute("SELECT COUNT(*) FROM products").fetchone()[0]
    logger.info("products table: %d rows", count)
    return count


def write_reviews(conn: duckdb.DuckDBPyConnection, df: pd.DataFrame) -> int:
    """Upsert reviews into DuckDB. Returns row count written."""
    df = _ensure_cols(df.copy(), _REVIEWS_COLS)
    # Only keep reviews for products that exist
    valid_asins = set(
        r[0] for r in conn.execute("SELECT asin FROM products").fetchall()
    )
    df = df[df["asin"].isin(valid_asins)]
    if df.empty:
        logger.warning("No reviews to write (no matching products)")
        return 0
    conn.register("_reviews_df", df)
    conn.execute("INSERT OR REPLACE INTO reviews SELECT * FROM _reviews_df")
    conn.unregister("_reviews_df")
    count = conn.execute("SELECT COUNT(*) FROM reviews").fetchone()[0]
    logger.info("reviews table: %d rows", count)
    return count


def write_categories(conn: duckdb.DuckDBPyConnection) -> None:
    """Populate categories table from existing products."""
    conn.execute(
        """
        INSERT OR REPLACE INTO categories
        SELECT
            main_category AS category_id,
            main_category AS name,
            NULL AS parent_name,
            COUNT(*) AS product_count
        FROM products
        GROUP BY main_category
        """
    )


def write_brands(conn: duckdb.DuckDBPyConnection) -> None:
    """Populate brands table from existing products."""
    conn.execute(
        """
        INSERT OR REPLACE INTO brands
        SELECT
            COALESCE(brand, 'Unknown') AS brand_id,
            COALESCE(brand, 'Unknown') AS name,
            COUNT(*) AS product_count,
            AVG(avg_rating) AS avg_rating
        FROM products
        GROUP BY brand
        """
    )
