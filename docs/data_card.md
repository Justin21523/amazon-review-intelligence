# Data Card

## Dataset Overview

| Field | Value |
|-------|-------|
| **Name** | Amazon Reviews 2023 — Home & Kitchen subset |
| **Source** | McAuley Lab, UC San Diego |
| **URL** | https://amazon-reviews-2023.github.io/ |
| **Category used** | Home_and_Kitchen |
| **Sample size** | 100,000 reviews, 83,119 unique products |
| **Date range** | 2000-08-06 to 2023-03-17 |
| **License** | Research use; no redistribution of raw data |

## Schema

### Review Fields Used

| Field | Type | Description |
|-------|------|-------------|
| `asin` | string | Product identifier |
| `user_id` | string | Reviewer identifier (anonymized) |
| `rating` | float | Star rating (1.0–5.0) |
| `title` | string | Review headline |
| `text` | string | Review body |
| `helpful_vote` | int | Number of helpful votes |
| `verified_purchase` | bool | Whether purchase was verified |
| `timestamp` | int (ms) | Review timestamp |

### Derived Product Fields (aggregated from reviews)

| Field | Source |
|-------|--------|
| `avg_rating` | mean of ratings per asin |
| `rating_number` | count of reviews per asin |
| `rating_std` | std dev of ratings |
| `negative_rate` | fraction of ratings ≤ 2 |
| `reputation_score` | avg_rating × sqrt(rating_count) |

## Statistics

| Metric | Value |
|--------|-------|
| Total reviews | 99,946 |
| Unique products | 83,119 |
| Unique reviewers | 6,801 |
| Average rating | 4.39 |
| Verified review ratio | 70.8% |
| Negative review rate | 9.1% |
| Reviews with images | 11.6% |

## Preprocessing Steps

1. Load canonical parquet (pre-normalized by `commercial-ml-analysis` pipeline)
2. Map field names: `product_id` → `asin`, `review_title` → `title`, etc.
3. Clean text: strip HTML tags (`<br />`), normalize unicode, collapse whitespace
4. Truncate review text to 2,000 characters for embedding
5. Derive product titles from most helpful review title per product
6. Compute sentiment labels from review ratings (positive ≥4, negative ≤2, neutral =3)

## Known Biases and Limitations

- **Rating inflation**: 70%+ of reviews are 4–5 stars (typical Amazon distribution)
- **No product metadata**: original dataset has no product titles/descriptions in this subset; titles are proxies derived from review headlines
- **Reviewer concentration**: 6,801 reviewers × 83,119 products = very sparse matrix (avg 1.2 reviews/user)
- **Temporal skew**: reviews span 2000–2023; older products are underrepresented
- **English only**: dataset is English-language reviews
- **Category scope**: Home & Kitchen only; no cross-category generalization
