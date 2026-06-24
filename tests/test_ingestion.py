"""Tests for data ingestion and normalization."""

from __future__ import annotations

from pathlib import Path

import pandas as pd
import pytest


def test_sample_generator_produces_valid_schema(tmp_path):
    from src.ingestion.sample_generator import generate_sample_data

    products_path, reviews_path = generate_sample_data(
        n_products=10, n_reviews=30, seed=1, output_dir=tmp_path
    )
    assert products_path.exists()
    assert reviews_path.exists()

    # Products schema check
    import json
    with open(products_path) as f:
        first_product = json.loads(f.readline())
    required_product_fields = {"asin", "title", "store", "main_category", "average_rating", "rating_number"}
    assert required_product_fields.issubset(set(first_product.keys()))

    # Reviews schema check
    with open(reviews_path) as f:
        first_review = json.loads(f.readline())
    required_review_fields = {"asin", "rating", "text", "user_id", "timestamp", "verified_purchase"}
    assert required_review_fields.issubset(set(first_review.keys()))


def test_sample_generator_review_count(tmp_path):
    from src.ingestion.sample_generator import generate_sample_data
    import json

    _, reviews_path = generate_sample_data(n_products=5, n_reviews=25, seed=2, output_dir=tmp_path)
    with open(reviews_path) as f:
        lines = [l for l in f if l.strip()]
    assert len(lines) == 25


def test_normalizer_maps_review_fields(sample_reviews_df):
    from src.ingestion.normalizer import normalize_reviews

    result = normalize_reviews(sample_reviews_df)
    assert "review_id" in result.columns
    assert "asin" in result.columns
    assert "rating" in result.columns
    assert len(result) == len(sample_reviews_df)


def test_normalizer_extracts_brand_from_store():
    from src.ingestion.normalizer import normalize_products_jsonl

    df = pd.DataFrame(
        [{"asin": "B001TEST01", "title": "Test Product", "store": "TestBrand", "main_category": "Electronics",
          "average_rating": 4.0, "rating_number": 10, "features": [], "description": []}]
    )
    result = normalize_products_jsonl(df)
    assert result.iloc[0]["brand"] == "TestBrand"
    assert result.iloc[0]["asin"] == "B001TEST01"


def test_db_writer_inserts_products(in_memory_conn, sample_products_df):
    from src.ingestion.db_writer import write_products

    count = write_products(in_memory_conn, sample_products_df)
    assert count == len(sample_products_df)
    rows = in_memory_conn.execute("SELECT COUNT(*) FROM products").fetchone()[0]
    assert rows == len(sample_products_df)


def test_db_writer_inserts_reviews(in_memory_conn, sample_products_df, sample_reviews_df):
    from src.ingestion.db_writer import write_products, write_reviews

    write_products(in_memory_conn, sample_products_df)
    write_reviews(in_memory_conn, sample_reviews_df)
    rows = in_memory_conn.execute("SELECT COUNT(*) FROM reviews").fetchone()[0]
    assert rows > 0
