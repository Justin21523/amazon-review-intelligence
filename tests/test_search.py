"""Tests for BM25 and vector search."""

from __future__ import annotations

import numpy as np
import pytest


def _build_bm25_with_products(tmp_path, in_memory_conn, sample_products_df):
    from src.ingestion.db_writer import write_products
    from src.features.bm25_indexer import BM25Indexer

    write_products(in_memory_conn, sample_products_df)
    indexer = BM25Indexer(index_path=tmp_path / "bm25_test.joblib")
    indexer.build(in_memory_conn)
    indexer.save()
    return indexer


def test_bm25_returns_k_results(tmp_path, in_memory_conn, sample_products_df):
    indexer = _build_bm25_with_products(tmp_path, in_memory_conn, sample_products_df)
    from src.retrieval.bm25_retriever import BM25Retriever

    retriever = BM25Retriever(tmp_path / "bm25_test.joblib")
    results = retriever.search("headphones", k=2)
    assert len(results) == 2
    assert all("asin" in r for r in results)
    assert all("bm25_score" in r for r in results)


def test_bm25_returns_ranked_results(tmp_path, in_memory_conn, sample_products_df):
    indexer = _build_bm25_with_products(tmp_path, in_memory_conn, sample_products_df)
    from src.retrieval.bm25_retriever import BM25Retriever

    retriever = BM25Retriever(tmp_path / "bm25_test.joblib")
    results = retriever.search("sony wireless headphones", k=3)
    assert results[0]["rank"] == 1
    assert results[0]["bm25_score"] >= results[-1]["bm25_score"]


def test_bm25_relevant_product_ranks_higher(tmp_path, in_memory_conn, sample_products_df):
    """Headphones query should rank the headphones product above cable."""
    indexer = _build_bm25_with_products(tmp_path, in_memory_conn, sample_products_df)
    from src.retrieval.bm25_retriever import BM25Retriever

    retriever = BM25Retriever(tmp_path / "bm25_test.joblib")
    results = retriever.search("wireless headphones", k=3)
    top_asin = results[0]["asin"]
    assert top_asin == "B001AAAAA1"  # Sony Wireless Headphones


def test_vector_search_scores_between_0_and_1(tmp_path, in_memory_conn, sample_products_df):
    """Vector search cosine scores should be in [0, 1] for normalized embeddings."""
    import numpy as np
    from src.ingestion.db_writer import write_products

    write_products(in_memory_conn, sample_products_df)

    # Insert mock embeddings
    asins = [r[0] for r in in_memory_conn.execute("SELECT asin FROM products").fetchall()]
    import pandas as pd
    emb_data = pd.DataFrame({
        "asin": asins,
        "embedding": [list(np.random.randn(384).astype(np.float32)) for _ in asins],
        "model_name": "test",
        "created_at": pd.Timestamp.now(),
    })
    # Normalize embeddings
    vecs = np.array(emb_data["embedding"].tolist())
    vecs = vecs / (np.linalg.norm(vecs, axis=1, keepdims=True) + 1e-10)
    emb_data["embedding"] = list(vecs.tolist())
    in_memory_conn.register("_test_emb", emb_data)
    in_memory_conn.execute("INSERT OR REPLACE INTO product_embeddings SELECT * FROM _test_emb")
    in_memory_conn.unregister("_test_emb")

    from src.retrieval.vector_retriever import VectorRetriever
    retriever = VectorRetriever("all-MiniLM-L6-v2")

    # Mock encode_query to avoid loading the model in tests
    retriever._gen.encode_query = lambda q: vecs[0]

    results = retriever.search("headphones", k=2, conn=in_memory_conn)
    assert len(results) == 2
    for r in results:
        assert -1.0 <= r["vector_score"] <= 1.0
