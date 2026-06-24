"""Tests for the hybrid BM25 + vector ranker."""

from __future__ import annotations

import numpy as np
import pytest


def _make_bm25_results(asins):
    return [{"asin": a, "bm25_score": float(10 - i), "rank": i + 1} for i, a in enumerate(asins)]


def _make_vec_results(asins):
    return [{"asin": a, "vector_score": float(1.0 - i * 0.1), "rank": i + 1} for i, a in enumerate(asins)]


class _MockBM25:
    def __init__(self, results):
        self._results = results

    def search(self, query, k=10):
        return self._results[:k]


class _MockVector:
    def __init__(self, results):
        self._results = results

    def search(self, query, k=10, conn=None):
        return self._results[:k]


def test_alpha_0_produces_bm25_dominated_ranking():
    """With alpha=0, hybrid should rely entirely on BM25 scores."""
    bm25_asins = ["A", "B", "C"]
    vec_asins = ["C", "B", "A"]  # reversed order

    from src.retrieval.hybrid_ranker import HybridRanker, _normalize_scores
    bm25 = _MockBM25(_make_bm25_results(bm25_asins))
    vec = _MockVector(_make_vec_results(vec_asins))
    ranker = HybridRanker(bm25_retriever=bm25, vector_retriever=vec)

    results = ranker.search("test", k=3, alpha=0.0)
    # alpha=0 → purely BM25; A should rank first
    assert results[0]["asin"] == "A"


def test_alpha_1_produces_vector_dominated_ranking():
    """With alpha=1, hybrid should rely entirely on vector scores."""
    bm25_asins = ["A", "B", "C"]
    vec_asins = ["C", "B", "A"]  # reversed order

    from src.retrieval.hybrid_ranker import HybridRanker
    bm25 = _MockBM25(_make_bm25_results(bm25_asins))
    vec = _MockVector(_make_vec_results(vec_asins))
    ranker = HybridRanker(bm25_retriever=bm25, vector_retriever=vec)

    results = ranker.search("test", k=3, alpha=1.0)
    assert results[0]["asin"] == "C"


def test_alpha_05_blends_both_scores():
    """With alpha=0.5, the hybrid score should be the average of normalized BM25 and vector."""
    from src.retrieval.hybrid_ranker import HybridRanker, _normalize_scores
    asins = ["A", "B"]
    bm25 = _MockBM25(_make_bm25_results(asins))
    vec = _MockVector(_make_vec_results(asins))
    ranker = HybridRanker(bm25_retriever=bm25, vector_retriever=vec)

    results = ranker.search("test", k=2, alpha=0.5)
    for r in results:
        # hybrid_score should be between 0 and 1
        assert 0.0 <= r["hybrid_score"] <= 1.0


def test_hybrid_returns_exactly_k_results():
    asins = ["A", "B", "C", "D", "E"]
    from src.retrieval.hybrid_ranker import HybridRanker
    bm25 = _MockBM25(_make_bm25_results(asins))
    vec = _MockVector(_make_vec_results(asins))
    ranker = HybridRanker(bm25_retriever=bm25, vector_retriever=vec)

    results = ranker.search("test", k=3, alpha=0.5)
    assert len(results) == 3


def test_normalize_scores_maps_to_unit_interval():
    from src.retrieval.hybrid_ranker import _normalize_scores
    items = [{"asin": "A", "score": 10}, {"asin": "B", "score": 0}, {"asin": "C", "score": 5}]
    normalized = _normalize_scores(items, "score")
    assert normalized["A"] == pytest.approx(1.0)
    assert normalized["B"] == pytest.approx(0.0)
    assert 0.0 < normalized["C"] < 1.0
