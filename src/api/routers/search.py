"""Search endpoint: BM25, vector, and hybrid search."""

from __future__ import annotations

import time
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query

from src.api.schemas import ProductHit, SearchResponse
from src.utils.db import get_connection

router = APIRouter(prefix="/search", tags=["search"])


def _get_product_meta(conn, asins: list[str]) -> dict[str, dict]:
    """Fetch product metadata for a list of ASINs."""
    if not asins:
        return {}
    placeholders = ", ".join(["?"] * len(asins))
    rows = conn.execute(
        f"SELECT asin, title, avg_rating, rating_number, main_category, price FROM products WHERE asin IN ({placeholders})",
        asins,
    ).fetchall()
    return {r[0]: {"asin": r[0], "title": r[1], "avg_rating": r[2], "rating_number": r[3], "main_category": r[4], "price": r[5]} for r in rows}


def _log_query(conn, query: str, mode: str, k: int, n_results: int, latency_ms: float) -> None:
    try:
        conn.execute(
            "INSERT INTO query_logs VALUES (?, ?, ?, ?, ?, ?, NOW())",
            [str(uuid.uuid4())[:20], query, mode, k, n_results, latency_ms],
        )
    except Exception:
        pass


@router.get("", response_model=SearchResponse)
def search(
    q: str = Query(..., description="Search query"),
    k: int = Query(10, ge=1, le=100),
    mode: str = Query("hybrid", pattern="^(bm25|vector|hybrid)$"),
    alpha: float = Query(0.5, ge=0.0, le=1.0, description="Blend weight (0=BM25, 1=vector)"),
    min_rating: float = Query(0.0, ge=0.0, le=5.0, description="Minimum avg_rating filter"),
    min_reviews: int = Query(0, ge=0, description="Minimum rating_number filter"),
) -> SearchResponse:
    """Search products using BM25, vector, or hybrid retrieval."""
    from src.api.state import get_state

    state = get_state()
    conn = get_connection()
    t0 = time.perf_counter()

    try:
        if mode == "bm25":
            raw = state.bm25.search(q, k=k * 3 if (min_rating or min_reviews) else k)
        elif mode == "vector":
            raw = state.vector.search(q, k=k * 3 if (min_rating or min_reviews) else k, conn=conn)
        else:
            raw = state.hybrid.search(q, k=k * 3 if (min_rating or min_reviews) else k, alpha=alpha, conn=conn)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    latency_ms = (time.perf_counter() - t0) * 1000
    asins = [r["asin"] for r in raw]
    meta = _get_product_meta(conn, asins)

    all_hits = [
        ProductHit(
            **meta.get(r["asin"], {"asin": r["asin"]}),
            bm25_score=r.get("bm25_score"),
            vector_score=r.get("vector_score"),
            hybrid_score=r.get("hybrid_score"),
            rank=r.get("rank"),
        )
        for r in raw
    ]

    hits = [
        h for h in all_hits
        if (h.avg_rating or 0.0) >= min_rating
        and (h.rating_number or 0) >= min_reviews
    ][:k]

    _log_query(conn, q, mode, k, len(hits), latency_ms)

    return SearchResponse(
        query=q,
        mode=mode,
        alpha=alpha if mode == "hybrid" else None,
        k=k,
        total=len(hits),
        latency_ms=round(latency_ms, 2),
        results=hits,
    )
