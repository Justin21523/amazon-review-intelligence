"""Tests for FastAPI endpoints using TestClient."""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def seeded_conn(in_memory_conn, sample_products_df, sample_reviews_df):
    """In-memory DuckDB connection with products and reviews."""
    from src.ingestion.db_writer import write_products, write_reviews
    write_products(in_memory_conn, sample_products_df)
    write_reviews(in_memory_conn, sample_reviews_df)
    return in_memory_conn


@pytest.fixture
def client(seeded_conn, tmp_path, monkeypatch):
    """TestClient with patched DB and mock retrieval state."""
    # Patch get_connection to return the in-memory conn
    monkeypatch.setattr("src.utils.db.get_connection", lambda *a, **kw: seeded_conn)
    monkeypatch.setattr("src.api.routers.health.get_connection", lambda *a, **kw: seeded_conn)
    monkeypatch.setattr("src.api.routers.search.get_connection", lambda *a, **kw: seeded_conn)
    monkeypatch.setattr("src.api.routers.products.get_connection", lambda *a, **kw: seeded_conn)
    monkeypatch.setattr("src.api.routers.recommendations.get_connection", lambda *a, **kw: seeded_conn)
    monkeypatch.setattr("src.api.routers.analytics.get_connection", lambda *a, **kw: seeded_conn)

    # Build BM25 index
    from src.features.bm25_indexer import BM25Indexer
    bm25_path = tmp_path / "bm25.joblib"
    indexer = BM25Indexer(bm25_path)
    indexer.build(seeded_conn)
    indexer.save()

    # Insert embeddings for vector search
    asins = [r[0] for r in seeded_conn.execute("SELECT asin FROM products").fetchall()]
    rng = np.random.default_rng(0)
    vecs = rng.random((len(asins), 384)).astype(np.float32)
    vecs = vecs / (np.linalg.norm(vecs, axis=1, keepdims=True) + 1e-10)
    emb_df = pd.DataFrame({
        "asin": asins,
        "embedding": list(vecs.tolist()),
        "model_name": "test",
        "created_at": pd.Timestamp.now(),
    })
    seeded_conn.register("_emb_test", emb_df)
    seeded_conn.execute("INSERT OR REPLACE INTO product_embeddings SELECT * FROM _emb_test")
    seeded_conn.unregister("_emb_test")

    from src.retrieval.bm25_retriever import BM25Retriever
    from src.retrieval.vector_retriever import VectorRetriever
    from src.retrieval.hybrid_ranker import HybridRanker
    from src.models.content_based import ContentBasedModel
    from src.models.cold_start import ColdStartModel
    from src.api import state as api_state

    bm25 = BM25Retriever(bm25_path)
    vec = VectorRetriever("all-MiniLM-L6-v2")
    vec._gen.encode_query = lambda q: vecs[0]  # mock encode

    st = api_state.AppState(
        bm25=bm25,
        vector=vec,
        hybrid=HybridRanker(bm25_retriever=bm25, vector_retriever=vec),
        content_based=ContentBasedModel(),
        cold_start=ColdStartModel(),
    )
    # Inject the content_based model's embeddings
    st.content_based._asins = asins
    st.content_based._embeddings = vecs

    monkeypatch.setattr(api_state, "_state", st)

    from src.api.main import app
    return TestClient(app, raise_server_exceptions=True)


def test_health_endpoint_returns_ok(client):
    r = client.get("/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert data["duckdb"] == "connected"
    assert data["products_count"] >= 0


def test_search_endpoint_returns_results(client):
    r = client.get("/search", params={"q": "headphones", "k": 2, "mode": "bm25"})
    assert r.status_code == 200
    data = r.json()
    assert "results" in data
    assert data["mode"] == "bm25"
    assert len(data["results"]) <= 2


def test_search_hybrid_mode(client):
    r = client.get("/search", params={"q": "speaker", "k": 2, "mode": "hybrid", "alpha": 0.5})
    assert r.status_code == 200
    data = r.json()
    assert data["mode"] == "hybrid"


def test_product_detail_endpoint(client, sample_products_df):
    asin = sample_products_df["asin"].iloc[0]
    r = client.get(f"/products/{asin}")
    assert r.status_code == 200
    data = r.json()
    assert data["asin"] == asin


def test_product_not_found_returns_404(client):
    r = client.get("/products/DOES_NOT_EXIST_XYZ")
    assert r.status_code == 404


def test_product_similar_endpoint(client, sample_products_df):
    asin = sample_products_df["asin"].iloc[0]
    r = client.get(f"/products/{asin}/similar", params={"k": 2})
    assert r.status_code == 200


def test_analytics_brands_endpoint(client):
    r = client.get("/analytics/brands")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)


def test_analytics_categories_endpoint(client):
    r = client.get("/analytics/categories")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
