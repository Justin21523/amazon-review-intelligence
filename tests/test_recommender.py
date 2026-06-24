"""Tests for recommendation models."""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest


def _seed_db(conn, products_df, reviews_df):
    from src.ingestion.db_writer import write_products, write_reviews
    write_products(conn, products_df)
    write_reviews(conn, reviews_df)


def test_popularity_model_returns_k_items(in_memory_conn, sample_products_df, sample_reviews_df):
    _seed_db(in_memory_conn, sample_products_df, sample_reviews_df)

    from src.models.popularity_model import PopularityModel
    model = PopularityModel()
    recs = model.recommend(k=2, conn=in_memory_conn)
    assert len(recs) == 2
    assert all("asin" in r for r in recs)


def test_popularity_model_sorted_by_score(in_memory_conn, sample_products_df, sample_reviews_df):
    _seed_db(in_memory_conn, sample_products_df, sample_reviews_df)

    from src.models.popularity_model import PopularityModel
    model = PopularityModel()
    recs = model.recommend(k=3, conn=in_memory_conn)
    scores = [r["popularity_score"] for r in recs]
    assert scores == sorted(scores, reverse=True)


def test_content_based_excludes_query_product(in_memory_conn, sample_products_df):
    from src.ingestion.db_writer import write_products
    write_products(in_memory_conn, sample_products_df)

    # Insert mock embeddings
    asins = [r[0] for r in in_memory_conn.execute("SELECT asin FROM products").fetchall()]
    rng = np.random.default_rng(42)
    vecs = rng.random((len(asins), 8)).astype(np.float32)
    vecs = vecs / (np.linalg.norm(vecs, axis=1, keepdims=True) + 1e-10)
    emb_df = pd.DataFrame({
        "asin": asins,
        "embedding": list(vecs.tolist()),
        "model_name": "test",
        "created_at": pd.Timestamp.now(),
    })
    in_memory_conn.register("_emb", emb_df)
    in_memory_conn.execute("INSERT OR REPLACE INTO product_embeddings SELECT * FROM _emb")
    in_memory_conn.unregister("_emb")

    from src.models.content_based import ContentBasedModel
    model = ContentBasedModel()
    target = asins[0]
    results = model.similar_products(target, k=2, conn=in_memory_conn)
    assert all(r["asin"] != target for r in results), "Query product should not appear in results"


def test_cold_start_returns_results_for_new_user(in_memory_conn, sample_products_df, sample_reviews_df):
    _seed_db(in_memory_conn, sample_products_df, sample_reviews_df)

    from src.models.cold_start import ColdStartModel
    model = ColdStartModel()
    recs = model.recommend_for_user("BRAND_NEW_USER_XYZ", k=3, conn=in_memory_conn)
    assert len(recs) > 0  # cold start → popularity
