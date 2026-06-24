"""Generate synthetic sample data matching Amazon Reviews 2023 schema.

Writes data/sample/products.jsonl and data/sample/reviews.jsonl.
Real data can be drop-in replaced — the schema is identical.
"""

from __future__ import annotations

import json
import random
import sys
import time
import uuid
from pathlib import Path

from src.utils.logging_config import get_logger, setup_logging
from src.utils.paths import SAMPLE_DIR

logger = get_logger(__name__)

_BRANDS = ["Sony", "Samsung", "Apple", "Bose", "Anker", "JBL", "Logitech", "Razer"]
_PRODUCT_TEMPLATES = [
    ("{brand} Wireless Headphones {model}", "Electronics"),
    ("{brand} Bluetooth Speaker {model}", "Electronics"),
    ("{brand} USB-C Charging Cable {model}", "Electronics"),
    ("{brand} Laptop Charger 65W {model}", "Electronics"),
    ("{brand} True Wireless Earbuds {model}", "Electronics"),
    ("{brand} Mechanical Keyboard {model}", "Electronics"),
    ("{brand} 27-inch 4K Monitor {model}", "Electronics"),
    ("{brand} 1080p Webcam {model}", "Electronics"),
    ("{brand} Gaming Mouse {model}", "Electronics"),
    ("{brand} Smart Watch Series {model}", "Electronics"),
]
_POSITIVE_REVIEWS = [
    "Excellent build quality. Works perfectly right out of the box.",
    "Amazing sound quality for the price. Highly recommend.",
    "Battery life is outstanding. Lasts all day without issues.",
    "Super easy to set up. Connected in under two minutes.",
    "The design is sleek and premium. Feels much more expensive than it is.",
    "Noise cancellation is top-notch. Perfect for working from home.",
    "Comfortable to wear for extended periods. No ear fatigue.",
    "Great value for the money. Performs as advertised.",
]
_NEGATIVE_REVIEWS = [
    "Stopped working after two weeks. Very disappointed.",
    "The sound is tinny and lacks bass. Not worth the price.",
    "Battery drains extremely fast. Barely lasts two hours.",
    "Difficult to pair with devices. Constant disconnections.",
    "Build quality feels cheap. The buttons feel loose.",
    "Customer service was unhelpful when I had an issue.",
    "Does not match the product description at all.",
]
_NEUTRAL_REVIEWS = [
    "It works as expected. Nothing spectacular but gets the job done.",
    "Average product for the price range.",
    "Decent quality. Has some minor issues but overall acceptable.",
]


def _random_asin(rng: random.Random) -> str:
    chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    return "B0" + "".join(rng.choices(chars, k=8))


def generate_sample_data(
    n_products: int = 100,
    n_reviews: int = 500,
    seed: int = 42,
    output_dir: Path | None = None,
) -> tuple[Path, Path]:
    """Generate synthetic products and reviews in Amazon Reviews 2023 format.

    Returns:
        Tuple of (products_path, reviews_path).
    """
    rng = random.Random(seed)
    out_dir = Path(output_dir or SAMPLE_DIR)
    out_dir.mkdir(parents=True, exist_ok=True)

    # Generate products
    products: list[dict] = []
    asins: list[str] = []
    for i in range(n_products):
        brand = rng.choice(_BRANDS)
        template, cat = rng.choice(_PRODUCT_TEMPLATES)
        model = rng.choice(["Pro", "Lite", "Plus", "Max", "Ultra", "SE", "Air"])
        title = template.format(brand=brand, model=model)
        asin = _random_asin(rng)
        asins.append(asin)
        products.append(
            {
                "main_category": cat,
                "title": title,
                "average_rating": round(rng.uniform(3.2, 5.0), 1),
                "rating_number": rng.randint(5, 800),
                "features": [
                    f"Feature highlight {j + 1}" for j in range(rng.randint(2, 5))
                ],
                "description": [f"{title} offers excellent performance and durability."],
                "price": round(rng.uniform(15.0, 299.0), 2),
                "images": [],
                "videos": [],
                "store": brand,
                "categories": [cat, brand],
                "details": {},
                "parent_asin": asin,
                "bought_together": [],
                "asin": asin,
            }
        )

    products_path = out_dir / "products.jsonl"
    with open(products_path, "w") as f:
        for p in products:
            f.write(json.dumps(p) + "\n")
    logger.info("Wrote %d products → %s", len(products), products_path)

    # Generate reviews (realistic rating distribution: heavy 4-5 stars)
    reviews: list[dict] = []
    rating_weights = [1, 2, 3, 15, 25]  # 1★ through 5★
    for _ in range(n_reviews):
        asin = rng.choice(asins)
        rating = float(rng.choices([1, 2, 3, 4, 5], weights=rating_weights)[0])
        if rating >= 4:
            text = rng.choice(_POSITIVE_REVIEWS)
            title = "Great product!"
        elif rating <= 2:
            text = rng.choice(_NEGATIVE_REVIEWS)
            title = "Disappointed"
        else:
            text = rng.choice(_NEUTRAL_REVIEWS)
            title = "It's okay"

        reviews.append(
            {
                "rating": rating,
                "title": title,
                "text": text,
                "images": [],
                "asin": asin,
                "parent_asin": asin,
                "user_id": "U" + uuid.UUID(int=rng.getrandbits(128)).hex[:16].upper(),
                "timestamp": int(time.time() * 1000) - rng.randint(0, 3 * 365 * 86400 * 1000),
                "helpful_vote": rng.randint(0, 15),
                "verified_purchase": rng.random() > 0.2,
            }
        )

    reviews_path = out_dir / "reviews.jsonl"
    with open(reviews_path, "w") as f:
        for r in reviews:
            f.write(json.dumps(r) + "\n")
    logger.info("Wrote %d reviews → %s", len(reviews), reviews_path)

    return products_path, reviews_path


if __name__ == "__main__":
    setup_logging()
    p, r = generate_sample_data()
    print(f"Sample data generated:\n  products: {p}\n  reviews:  {r}")
