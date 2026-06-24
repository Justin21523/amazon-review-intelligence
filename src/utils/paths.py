"""Canonical path constants for the project."""

from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = PROJECT_ROOT / "data"
SAMPLE_DIR = DATA_DIR / "sample"
SCHEMA_DIR = DATA_DIR / "schema"

DUCKDB_PATH = DATA_DIR / "amazon_reviews.duckdb"
BM25_INDEX_PATH = DATA_DIR / "bm25_index.joblib"

# External data source (commercial-ml-analysis project)
_EXTERNAL_ROOT = PROJECT_ROOT.parent / "commercial-ml-analysis" / "artifacts" / "amazon_reviews_real_hk"
EXTERNAL_FEATURES_PARQUET = _EXTERNAL_ROOT / "features" / "features.parquet"
EXTERNAL_CANONICAL_PARQUET = _EXTERNAL_ROOT / "canonical" / "Home_and_Kitchen_canonical.parquet"
EXTERNAL_PRODUCT_REPUTATION = _EXTERNAL_ROOT / "analysis" / "product_intelligence" / "product_reputation.parquet"
EXTERNAL_SIMILAR_PRODUCTS = _EXTERNAL_ROOT / "analysis" / "product_similarity" / "similar_products.parquet"
EXTERNAL_NLP_KEYWORDS = _EXTERNAL_ROOT / "analysis" / "nlp" / "positive_keywords.parquet"
EXTERNAL_NEGATIVE_KEYWORDS = _EXTERNAL_ROOT / "analysis" / "nlp" / "negative_keywords.parquet"
