"""Extract pros, cons, and generate review summaries using rule-based patterns."""

from __future__ import annotations

import re

from src.preprocessing.text_cleaner import clean_text
from src.utils.logging_config import get_logger

logger = get_logger(__name__)

_PRO_SIGNALS = re.compile(
    r"\b(love|excellent|amazing|perfect|great|best|outstanding|recommend|fantastic|"
    r"easy to use|highly recommend|well built|sturdy|durable|comfortable|good quality|"
    r"worth|impressive|exceeded|beautiful|clear|bright|loud|powerful)\b",
    re.I,
)
_CON_SIGNALS = re.compile(
    r"\b(bad|terrible|poor|horrible|worst|broken|defective|disappointed|issue|problem|"
    r"stopped working|not working|returned|waste|flimsy|cheap feel|loud noise|"
    r"slow|difficult|complicated|confusing|unreliable|short battery)\b",
    re.I,
)


def _sentence_split(text: str) -> list[str]:
    return [s.strip() for s in re.split(r"[.!?]+", text) if len(s.strip()) > 15]


def extract_pros_cons(
    reviews: list[str],
    max_pros: int = 3,
    max_cons: int = 3,
) -> dict[str, list[str]]:
    """Extract top pro and con sentences from a list of review texts.

    Returns:
        {"pros": [...], "cons": [...]}
    """
    pros: list[tuple[int, str]] = []
    cons: list[tuple[int, str]] = []

    for review in reviews:
        clean = clean_text(review)
        for sent in _sentence_split(clean):
            pro_hits = len(_PRO_SIGNALS.findall(sent))
            con_hits = len(_CON_SIGNALS.findall(sent))
            if pro_hits > con_hits and pro_hits > 0:
                pros.append((pro_hits, sent))
            elif con_hits > pro_hits and con_hits > 0:
                cons.append((con_hits, sent))

    # Sort by signal strength, deduplicate roughly
    pros.sort(key=lambda x: -x[0])
    cons.sort(key=lambda x: -x[0])

    seen_pros: set[str] = set()
    unique_pros: list[str] = []
    for _, s in pros:
        key = s[:40].lower()
        if key not in seen_pros:
            seen_pros.add(key)
            unique_pros.append(s[:200])
        if len(unique_pros) >= max_pros:
            break

    seen_cons: set[str] = set()
    unique_cons: list[str] = []
    for _, s in cons:
        key = s[:40].lower()
        if key not in seen_cons:
            seen_cons.add(key)
            unique_cons.append(s[:200])
        if len(unique_cons) >= max_cons:
            break

    return {"pros": unique_pros, "cons": unique_cons}


def generate_summary(reviews: list[str], max_reviews: int = 20) -> str:
    """Select the most representative sentence as a product summary.

    Strategy: pick the sentence with the highest combined pro+con signal
    from high-rated reviews — gives a balanced, informative description.
    """
    candidates: list[tuple[int, str]] = []
    for review in reviews[:max_reviews]:
        clean = clean_text(review)
        for sent in _sentence_split(clean):
            score = len(_PRO_SIGNALS.findall(sent)) + len(_CON_SIGNALS.findall(sent))
            if 20 <= len(sent) <= 250:
                candidates.append((score, sent))

    if not candidates:
        return reviews[0][:300] if reviews else "(no summary available)"

    candidates.sort(key=lambda x: -x[0])
    return candidates[0][1]


def populate_summary_cache(conn, batch_size: int = 200) -> int:
    """Compute and store summaries + pros/cons for all products in DuckDB."""
    asins = [r[0] for r in conn.execute("SELECT asin FROM products ORDER BY rating_number DESC").fetchall()]
    count = 0
    for i in range(0, len(asins), batch_size):
        batch_asins = asins[i : i + batch_size]
        placeholders = ", ".join(["?"] * len(batch_asins))
        rows = conn.execute(
            f"SELECT asin, text FROM reviews WHERE asin IN ({placeholders})",
            batch_asins,
        ).fetchall()

        product_reviews: dict[str, list[str]] = {}
        for asin, text in rows:
            product_reviews.setdefault(asin, []).append(text or "")

        import pandas as pd
        records = []
        for asin in batch_asins:
            texts = product_reviews.get(asin, [])
            if not texts:
                continue
            pros_cons = extract_pros_cons(texts)
            summary = generate_summary(texts)
            records.append(
                {
                    "asin": asin,
                    "summary_text": summary,
                    "pros": pros_cons["pros"],
                    "cons": pros_cons["cons"],
                    "generated_at": pd.Timestamp.now(),
                    "model_name": "rule_based",
                }
            )

        if records:
            df = pd.DataFrame(records)
            conn.register("_summ_df", df)
            conn.execute("INSERT OR REPLACE INTO summary_cache SELECT * FROM _summ_df")
            conn.unregister("_summ_df")
            count += len(records)
            logger.info("Summary cache: %d products processed", i + batch_size)

    logger.info("Summary cache populated: %d products", count)
    return count
