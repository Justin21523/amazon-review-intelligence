"""Manual faithfulness checklist template for review summaries."""

from __future__ import annotations


def generate_checklist_template() -> str:
    return """# Review Summary Faithfulness Checklist

## Product: _______________  (ASIN: _______________)
## Evaluator: _______________  Date: _______________

### Faithfulness (Does the summary match the reviews?)
- [ ] Every claim in the summary is supported by at least one review
- [ ] No information was hallucinated or fabricated
- [ ] Sentiment direction (positive/negative) matches the review distribution
- [ ] Numbers/statistics cited are accurate (if any)

### Completeness (Does the summary cover key themes?)
- [ ] Main pros mentioned by ≥20% of reviewers are included
- [ ] Main cons mentioned by ≥20% of reviewers are included
- [ ] Dominant use-case or product type is described

### Clarity
- [ ] Summary is readable without having read any reviews
- [ ] No jargon or brand-specific terms left unexplained
- [ ] Length is appropriate (50-200 words)

### Pros/Cons Quality
- [ ] Pros are specific (not generic like "good quality")
- [ ] Cons are specific (not generic like "bad product")
- [ ] Pros and cons are balanced relative to rating distribution

### Overall Rating
- Faithfulness: ___/5
- Completeness: ___/5
- Clarity: ___/5

### Notes / Issues
_______________________________________________________________
"""


def save_checklist(output_path: str, product_asin: str = "EXAMPLE") -> None:
    """Write checklist template to file."""
    from pathlib import Path
    template = generate_checklist_template().replace(
        "ASIN: _______________", f"ASIN: {product_asin}"
    )
    Path(output_path).write_text(template)
    print(f"Checklist saved: {output_path}")
