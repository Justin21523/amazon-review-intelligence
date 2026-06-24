"""Text cleaning utilities."""

from __future__ import annotations

import re
import unicodedata

_HTML_TAG = re.compile(r"<[^>]+>")
_WHITESPACE = re.compile(r"\s+")
_MAX_CHARS = 2000


def clean_text(text: str, max_chars: int = _MAX_CHARS) -> str:
    """Strip HTML, normalize unicode, collapse whitespace, truncate."""
    if not text:
        return ""
    text = _HTML_TAG.sub(" ", text)
    text = unicodedata.normalize("NFKC", text)
    text = _WHITESPACE.sub(" ", text).strip()
    return text[:max_chars]


def clean_for_bm25(text: str) -> str:
    """Light cleaning for BM25 tokenization (preserves more tokens)."""
    text = clean_text(text, max_chars=5000)
    return text.lower()
