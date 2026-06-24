"""ETL pipeline: load → normalize → write to DuckDB.

Usage:
    python -m src.ingestion.pipeline [--limit N] [--sample]
"""

from __future__ import annotations

import argparse
import sys

from src.ingestion.db_writer import write_brands, write_categories, write_products, write_reviews
from src.ingestion.loader import load_real_reviews, load_sample_products
from src.ingestion.normalizer import normalize_products_from_reviews, normalize_products_jsonl, normalize_reviews
from src.utils.db import get_connection
from src.utils.logging_config import get_logger, setup_logging
from src.utils.paths import EXTERNAL_FEATURES_PARQUET, SAMPLE_DIR

logger = get_logger(__name__)


def run_pipeline(limit: int | None = None, use_sample: bool = False) -> None:
    """Execute the full ingestion pipeline."""
    conn = get_connection()

    # Decide data source
    if use_sample or not EXTERNAL_FEATURES_PARQUET.exists():
        logger.info("Using sample data from %s", SAMPLE_DIR)
        raw_reviews = None
        try:
            from src.ingestion.loader import load_reviews_jsonl
            raw_reviews = load_reviews_jsonl(SAMPLE_DIR / "reviews.jsonl")
        except FileNotFoundError:
            logger.error("Sample data not found. Run `make sample-data` first.")
            sys.exit(1)
        reviews_df = normalize_reviews(raw_reviews)

        try:
            raw_products = load_sample_products()
            products_df = normalize_products_jsonl(raw_products)
        except FileNotFoundError:
            products_df = normalize_products_from_reviews(raw_reviews)
    else:
        logger.info("Loading real data from commercial-ml-analysis artifacts")
        raw = load_real_reviews()
        if limit:
            raw = raw.head(limit)
            logger.info("Limited to %d rows", limit)
        reviews_df = normalize_reviews(raw)
        products_df = normalize_products_from_reviews(raw)

    logger.info("Writing products (%d) …", len(products_df))
    write_products(conn, products_df)

    logger.info("Writing reviews (%d) …", len(reviews_df))
    write_reviews(conn, reviews_df)

    write_categories(conn)
    write_brands(conn)

    # Summary
    for table in ("products", "reviews", "categories", "brands"):
        n = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        logger.info("  %-20s %d rows", table, n)

    logger.info("ETL pipeline complete.")


if __name__ == "__main__":
    setup_logging()
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None, help="Limit number of reviews loaded")
    parser.add_argument("--sample", action="store_true", help="Force using sample data")
    args = parser.parse_args()
    run_pipeline(limit=args.limit, use_sample=args.sample)
