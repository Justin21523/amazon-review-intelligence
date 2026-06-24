"""BM25 lexical retriever."""

from __future__ import annotations

from pathlib import Path

from src.features.bm25_indexer import BM25Indexer
from src.preprocessing.text_cleaner import clean_for_bm25
from src.utils.logging_config import get_logger
from src.utils.paths import BM25_INDEX_PATH

logger = get_logger(__name__)


class BM25Retriever:
    """Lazy-loading BM25 retriever over the product corpus."""

    def __init__(self, index_path: Path | None = None) -> None:
        self._path = Path(index_path or BM25_INDEX_PATH)
        self._indexer: BM25Indexer | None = None

    def _ensure_loaded(self) -> BM25Indexer:
        if self._indexer is None:
            self._indexer = BM25Indexer(self._path).load()
        return self._indexer

    def search(self, query: str, k: int = 10) -> list[dict]:
        """Return top-k products by BM25 score.

        Returns:
            List of {"asin", "bm25_score", "rank"} dicts.
        """
        indexer = self._ensure_loaded()
        tokens = clean_for_bm25(query).split()
        scores = indexer.index.get_scores(tokens)

        doc_ids = indexer.doc_ids
        ranked = sorted(zip(doc_ids, scores), key=lambda x: -x[1])
        return [
            {"asin": asin, "bm25_score": float(score), "rank": i + 1}
            for i, (asin, score) in enumerate(ranked[:k])
        ]

    def is_ready(self) -> bool:
        return self._path.exists()
