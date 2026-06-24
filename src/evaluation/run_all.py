"""Run all evaluations and save results.

Usage:
    python -m src.evaluation.run_all
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from src.evaluation.reco_evaluator import RecoEvaluator
from src.evaluation.search_evaluator import SearchEvaluator
from src.utils.db import get_connection
from src.utils.logging_config import get_logger, setup_logging
from src.utils.paths import DATA_DIR

logger = get_logger(__name__)


def run_all() -> dict:
    conn = get_connection()

    n_products = conn.execute("SELECT COUNT(*) FROM products").fetchone()[0]
    if n_products == 0:
        logger.error("No products in DB. Run `make etl && make index` first.")
        sys.exit(1)

    results = {}

    # --- Search Evaluation ---
    logger.info("=== Search Evaluation ===")
    search_eval = SearchEvaluator(conn)

    from src.retrieval.bm25_retriever import BM25Retriever
    from src.retrieval.hybrid_ranker import HybridRanker
    from src.retrieval.vector_retriever import VectorRetriever

    bm25 = BM25Retriever()
    vec = VectorRetriever()
    hybrid = HybridRanker(bm25_retriever=bm25, vector_retriever=vec)

    if bm25.is_ready():
        bm25_metrics = search_eval.run_evaluation(bm25, k_list=[5, 10, 20])
        logger.info("BM25 metrics:\n%s", bm25_metrics.to_string())
        results["search_bm25"] = bm25_metrics.to_dict()
    else:
        logger.warning("BM25 index not found — skipping BM25 eval")

    if vec.is_ready(conn):
        vec_metrics = search_eval.run_evaluation(vec, k_list=[5, 10, 20])
        logger.info("Vector metrics:\n%s", vec_metrics.to_string())
        results["search_vector"] = vec_metrics.to_dict()

        hybrid_metrics = search_eval.run_evaluation(hybrid, k_list=[5, 10, 20])
        logger.info("Hybrid metrics:\n%s", hybrid_metrics.to_string())
        results["search_hybrid"] = hybrid_metrics.to_dict()
    else:
        logger.warning("No embeddings found — skipping vector/hybrid eval")

    # --- Recommendation Evaluation ---
    logger.info("=== Recommendation Evaluation ===")
    from src.models.cold_start import ColdStartModel

    reco_eval = RecoEvaluator(conn)
    cold = ColdStartModel()
    reco_metrics = reco_eval.run_evaluation(cold, k_list=[5, 10, 20])
    logger.info("Recommendation metrics:\n%s", reco_metrics.to_string())
    results["recommendation_cold_start"] = reco_metrics.to_dict()

    # Save results
    out_path = DATA_DIR / "evaluation_results.json"
    with open(out_path, "w") as f:
        json.dump(results, f, indent=2, default=str)
    logger.info("Evaluation results saved → %s", out_path)

    # Print summary table
    print("\n" + "=" * 60)
    print("EVALUATION SUMMARY")
    print("=" * 60)
    for name, metrics in results.items():
        print(f"\n{name}:")
        import pandas as pd
        df = pd.DataFrame(metrics)
        print(df.to_string())
    print("=" * 60)

    return results


if __name__ == "__main__":
    setup_logging()
    run_all()
