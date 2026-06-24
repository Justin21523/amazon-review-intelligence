"""Split review text into sentences and score sentiment per sentence."""

from __future__ import annotations

import hashlib

from src.preprocessing.sentiment import score_sentiment
from src.preprocessing.text_cleaner import clean_text
from src.utils.logging_config import get_logger

logger = get_logger(__name__)

_nltk_available = False
try:
    import nltk

    try:
        nltk.data.find("tokenizers/punkt_tab")
    except LookupError:
        nltk.download("punkt_tab", quiet=True)
    try:
        nltk.data.find("tokenizers/punkt")
    except LookupError:
        nltk.download("punkt", quiet=True)
    _nltk_available = True
except ImportError:
    pass


def _simple_split(text: str) -> list[str]:
    """Fallback sentence splitter on period/question/exclamation."""
    import re
    parts = re.split(r"(?<=[.!?])\s+", text)
    return [p.strip() for p in parts if len(p.strip()) > 10]


def split_into_sentences(
    review_id: str,
    asin: str,
    text: str,
    max_sentences: int = 10,
) -> list[dict]:
    """Tokenize review text into sentences with sentiment scores.

    Returns:
        List of dicts matching the review_sentences table schema.
    """
    cleaned = clean_text(text)
    if not cleaned:
        return []

    if _nltk_available:
        import nltk
        sentences = nltk.sent_tokenize(cleaned)
    else:
        sentences = _simple_split(cleaned)

    results: list[dict] = []
    for i, sent in enumerate(sentences[:max_sentences]):
        if len(sent.strip()) < 5:
            continue
        label, score = score_sentiment(sent)
        sid = hashlib.sha256(f"{review_id}:{i}:{sent[:30]}".encode()).hexdigest()[:20]
        results.append(
            {
                "sentence_id": sid,
                "review_id": review_id,
                "asin": asin,
                "sentence": sent,
                "sentiment_label": label,
                "sentiment_score": score,
            }
        )
    return results


def process_reviews_to_sentences(
    conn,
    batch_size: int = 1000,
) -> int:
    """Process all reviews in DB into review_sentences table.

    Returns total sentence count written.
    """
    import duckdb

    rows = conn.execute("SELECT review_id, asin, text FROM reviews ORDER BY review_id").fetchall()
    total = 0
    batch: list[dict] = []

    for review_id, asin, text in rows:
        sents = split_into_sentences(review_id, asin, text or "")
        batch.extend(sents)
        if len(batch) >= batch_size:
            _write_batch(conn, batch)
            total += len(batch)
            batch = []

    if batch:
        _write_batch(conn, batch)
        total += len(batch)

    logger.info("Wrote %d review sentences", total)
    return total


def _write_batch(conn, batch: list[dict]) -> None:
    import pandas as pd
    df = pd.DataFrame(batch)
    conn.register("_sent_df", df)
    conn.execute("INSERT OR REPLACE INTO review_sentences SELECT * FROM _sent_df")
    conn.unregister("_sent_df")
