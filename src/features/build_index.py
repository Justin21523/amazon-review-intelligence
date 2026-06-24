"""Build all search indexes and feature caches.

Usage:
    python -m src.features.build_index [--skip-embeddings] [--skip-summaries]
"""

from __future__ import annotations

import argparse

from src.features.aspect_extractor import populate_summary_cache
from src.features.bm25_indexer import BM25Indexer
from src.features.embedding_generator import EmbeddingGenerator
from src.utils.config import get_settings
from src.utils.db import get_connection
from src.utils.logging_config import get_logger, setup_logging

logger = get_logger(__name__)


def build_all(skip_embeddings: bool = False, skip_summaries: bool = False) -> None:
    settings = get_settings()
    conn = get_connection()

    n_products = conn.execute("SELECT COUNT(*) FROM products").fetchone()[0]
    if n_products == 0:
        logger.error("No products in DB. Run `make etl` first.")
        return

    # BM25 index
    logger.info("Building BM25 index …")
    bm25 = BM25Indexer()
    bm25.build(conn)
    bm25.save()
    logger.info("BM25 index built: %d docs", len(bm25.doc_ids))

    # Embeddings
    if not skip_embeddings:
        logger.info("Generating product embeddings …")
        gen = EmbeddingGenerator(settings.embeddings_model)
        n = gen.encode_products(conn, batch_size=settings.embeddings_batch_size)
        logger.info("Product embeddings done: %d", n)
    else:
        logger.info("Skipping embeddings (--skip-embeddings)")

    # Summary cache
    if not skip_summaries:
        logger.info("Populating summary cache …")
        n = populate_summary_cache(conn)
        logger.info("Summary cache done: %d products", n)
    else:
        logger.info("Skipping summaries (--skip-summaries)")

    logger.info("Index build complete.")


if __name__ == "__main__":
    setup_logging()
    parser = argparse.ArgumentParser()
    parser.add_argument("--skip-embeddings", action="store_true")
    parser.add_argument("--skip-summaries", action="store_true")
    args = parser.parse_args()
    build_all(skip_embeddings=args.skip_embeddings, skip_summaries=args.skip_summaries)
