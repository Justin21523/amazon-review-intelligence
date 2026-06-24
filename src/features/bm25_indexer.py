"""Build, save, and load a BM25 index over product documents."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import joblib
from rank_bm25 import BM25Okapi

from src.preprocessing.text_cleaner import clean_for_bm25
from src.utils.logging_config import get_logger
from src.utils.paths import BM25_INDEX_PATH

logger = get_logger(__name__)


def _tokenize(text: str) -> list[str]:
    return clean_for_bm25(text).split()


class BM25Indexer:
    """Build and persist a BM25 index over products."""

    def __init__(self, index_path: Path | None = None) -> None:
        self._path = Path(index_path or BM25_INDEX_PATH)
        self._index: BM25Okapi | None = None
        self._doc_ids: list[str] = []
        self._corpus_texts: list[str] = []

    def build(self, conn) -> BM25Okapi:
        """Build index from products in DuckDB."""
        rows = conn.execute(
            "SELECT asin, title, COALESCE(description, '') FROM products ORDER BY asin"
        ).fetchall()

        self._doc_ids = [r[0] for r in rows]
        self._corpus_texts = [f"{r[1]} {r[2]}" for r in rows]
        tokenized = [_tokenize(doc) for doc in self._corpus_texts]

        logger.info("Building BM25 index over %d documents …", len(tokenized))
        self._index = BM25Okapi(tokenized)
        logger.info("BM25 index built.")
        return self._index

    def save(self, path: Path | None = None) -> Path:
        """Serialize index to disk."""
        out = Path(path or self._path)
        out.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "index": self._index,
            "doc_ids": self._doc_ids,
            "corpus_texts": self._corpus_texts,
        }
        joblib.dump(payload, out)
        logger.info("BM25 index saved → %s", out)
        return out

    def load(self, path: Path | None = None) -> "BM25Indexer":
        """Load index from disk into this instance."""
        src = Path(path or self._path)
        payload = joblib.load(src)
        self._index = payload["index"]
        self._doc_ids = payload["doc_ids"]
        self._corpus_texts = payload["corpus_texts"]
        logger.info("BM25 index loaded from %s (%d docs)", src, len(self._doc_ids))
        return self

    @property
    def index(self) -> BM25Okapi:
        if self._index is None:
            raise RuntimeError("Index not built or loaded yet.")
        return self._index

    @property
    def doc_ids(self) -> list[str]:
        return self._doc_ids
