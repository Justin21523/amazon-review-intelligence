"""Lightweight rule-based sentiment scoring (no heavy ML dependency)."""

from __future__ import annotations

_POSITIVE_WORDS = {
    "great", "excellent", "amazing", "love", "perfect", "best", "good",
    "wonderful", "fantastic", "awesome", "outstanding", "superb", "nice",
    "recommend", "worth", "happy", "pleased", "impressive", "quality",
    "beautiful", "comfortable", "easy", "fast", "reliable", "durable",
}
_NEGATIVE_WORDS = {
    "bad", "terrible", "awful", "horrible", "worst", "poor", "cheap",
    "broken", "disappointed", "waste", "useless", "defective", "stopped",
    "broken", "not working", "issue", "problem", "return", "refund",
    "slow", "loud", "flimsy", "difficult", "confusing", "unreliable",
}


def score_sentiment(sentence: str) -> tuple[str, float]:
    """Return (label, score) for a sentence.

    Returns:
        label: 'positive' | 'negative' | 'neutral'
        score: float in [-1, 1]
    """
    tokens = set(sentence.lower().split())
    pos = len(tokens & _POSITIVE_WORDS)
    neg = len(tokens & _NEGATIVE_WORDS)
    total = pos + neg
    if total == 0:
        return "neutral", 0.0
    score = (pos - neg) / total
    if score > 0.1:
        return "positive", round(score, 3)
    if score < -0.1:
        return "negative", round(score, 3)
    return "neutral", round(score, 3)
