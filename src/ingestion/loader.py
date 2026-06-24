"""Load Amazon Reviews 2023 format data from JSONL / parquet files."""

from __future__ import annotations

import gzip
import json
from pathlib import Path

import pandas as pd

from src.utils.logging_config import get_logger
from src.utils.paths import (
    EXTERNAL_FEATURES_PARQUET,
    EXTERNAL_PRODUCT_REPUTATION,
    SAMPLE_DIR,
)

logger = get_logger(__name__)


def load_reviews_jsonl(path: Path) -> pd.DataFrame:
    """Load reviews from .jsonl or .jsonl.gz (Amazon Reviews 2023 raw format)."""
    records: list[dict] = []
    opener = gzip.open if str(path).endswith(".gz") else open
    with opener(path, "rt", encoding="utf-8") as f:  # type: ignore[call-overload]
        for line in f:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    df = pd.DataFrame(records)
    logger.info("Loaded %d reviews from %s", len(df), path)
    return df


def load_products_jsonl(path: Path) -> pd.DataFrame:
    """Load product metadata from .jsonl or .jsonl.gz."""
    records: list[dict] = []
    opener = gzip.open if str(path).endswith(".gz") else open
    with opener(path, "rt", encoding="utf-8") as f:  # type: ignore[call-overload]
        for line in f:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    df = pd.DataFrame(records)
    logger.info("Loaded %d products from %s", len(df), path)
    return df


def load_real_reviews() -> pd.DataFrame:
    """Load the real Home & Kitchen dataset from commercial-ml-analysis artifacts.

    Falls back to sample data if external path not found.
    """
    if EXTERNAL_FEATURES_PARQUET.exists():
        logger.info("Loading real data from %s", EXTERNAL_FEATURES_PARQUET)
        df = pd.read_parquet(EXTERNAL_FEATURES_PARQUET)
        logger.info("Loaded %d rows", len(df))
        return df

    logger.warning("External parquet not found. Falling back to sample data.")
    sample_path = SAMPLE_DIR / "reviews.jsonl"
    if not sample_path.exists():
        raise FileNotFoundError(
            f"No data found. Run `make sample-data` first. Expected: {sample_path}"
        )
    return load_reviews_jsonl(sample_path)


def load_real_product_reputation() -> pd.DataFrame | None:
    """Load pre-computed product reputation stats if available."""
    if EXTERNAL_PRODUCT_REPUTATION.exists():
        return pd.read_parquet(EXTERNAL_PRODUCT_REPUTATION)
    return None


def load_sample_products() -> pd.DataFrame:
    """Load generated sample product metadata."""
    path = SAMPLE_DIR / "products.jsonl"
    if not path.exists():
        raise FileNotFoundError(f"Run `make sample-data` first. Expected: {path}")
    return load_products_jsonl(path)
