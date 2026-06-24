"""Shared pytest fixtures."""

from __future__ import annotations

import pytest
import duckdb

from src.utils.db import reset_connection


@pytest.fixture(autouse=True)
def reset_db_singleton():
    """Reset the DuckDB singleton between tests to avoid state leakage."""
    reset_connection()
    yield
    reset_connection()


@pytest.fixture
def in_memory_conn():
    """Return a fresh in-memory DuckDB connection with schema applied."""
    from pathlib import Path
    conn = duckdb.connect(":memory:")
    schema_dir = Path(__file__).resolve().parents[1] / "data" / "schema"
    for ddl_file in sorted(schema_dir.glob("*.sql")):
        sql = ddl_file.read_text()
        for stmt in sql.split(";"):
            stmt = stmt.strip()
            if stmt:
                try:
                    conn.execute(stmt)
                except Exception:
                    pass
    yield conn
    conn.close()


@pytest.fixture
def sample_products_df():
    """Return a small DataFrame of synthetic products for testing."""
    import pandas as pd
    return pd.DataFrame(
        [
            {
                "asin": "B001AAAAA1",
                "parent_asin": "B001AAAAA1",
                "title": "Sony Wireless Headphones Pro",
                "brand": "Sony",
                "main_category": "Electronics",
                "description": "Premium noise-cancelling headphones",
                "price": 99.99,
                "avg_rating": 4.5,
                "rating_number": 120,
                "rating_std": 0.8,
                "negative_rate": 0.05,
                "verified_ratio": 0.9,
                "helpful_vote_avg": 2.5,
                "reputation_score": 49.4,
            },
            {
                "asin": "B002BBBBB2",
                "parent_asin": "B002BBBBB2",
                "title": "Bose Bluetooth Speaker Max",
                "brand": "Bose",
                "main_category": "Electronics",
                "description": "Powerful portable speaker",
                "price": 149.99,
                "avg_rating": 4.2,
                "rating_number": 80,
                "rating_std": 1.0,
                "negative_rate": 0.08,
                "verified_ratio": 0.85,
                "helpful_vote_avg": 1.8,
                "reputation_score": 37.6,
            },
            {
                "asin": "B003CCCCC3",
                "parent_asin": "B003CCCCC3",
                "title": "Anker USB-C Cable Plus",
                "brand": "Anker",
                "main_category": "Electronics",
                "description": "Fast charging USB-C cable",
                "price": 14.99,
                "avg_rating": 4.7,
                "rating_number": 300,
                "rating_std": 0.5,
                "negative_rate": 0.02,
                "verified_ratio": 0.95,
                "helpful_vote_avg": 0.5,
                "reputation_score": 81.4,
            },
        ]
    )


@pytest.fixture
def sample_reviews_df():
    """Return a small DataFrame of synthetic reviews for testing."""
    import pandas as pd
    return pd.DataFrame(
        [
            {
                "review_id": "REV001",
                "asin": "B001AAAAA1",
                "user_id": "USER_A",
                "rating": 5.0,
                "title": "Great headphones!",
                "text": "Amazing sound quality. Love the noise cancellation.",
                "helpful_vote": 10,
                "verified_purchase": True,
                "sentiment_label": "positive",
                "review_length": 52,
                "word_count": 9,
                "timestamp": 1700000000000,
                "review_datetime": pd.Timestamp("2023-11-14"),
            },
            {
                "review_id": "REV002",
                "asin": "B001AAAAA1",
                "user_id": "USER_B",
                "rating": 2.0,
                "title": "Stopped working",
                "text": "Broke after two weeks. Terrible build quality.",
                "helpful_vote": 5,
                "verified_purchase": True,
                "sentiment_label": "negative",
                "review_length": 45,
                "word_count": 7,
                "timestamp": 1700100000000,
                "review_datetime": pd.Timestamp("2023-11-15"),
            },
            {
                "review_id": "REV003",
                "asin": "B002BBBBB2",
                "user_id": "USER_A",
                "rating": 4.0,
                "title": "Good speaker",
                "text": "Loud and clear. Battery life could be better.",
                "helpful_vote": 3,
                "verified_purchase": False,
                "sentiment_label": "positive",
                "review_length": 43,
                "word_count": 8,
                "timestamp": 1700200000000,
                "review_datetime": pd.Timestamp("2023-11-16"),
            },
        ]
    )
