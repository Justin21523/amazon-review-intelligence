-- Amazon Review Intelligence — DuckDB schema

CREATE TABLE IF NOT EXISTS products (
    asin            VARCHAR PRIMARY KEY,
    parent_asin     VARCHAR,
    title           VARCHAR,
    brand           VARCHAR,
    main_category   VARCHAR DEFAULT 'Home_and_Kitchen',
    description     TEXT,
    price           FLOAT,
    avg_rating      FLOAT,
    rating_number   INTEGER,
    rating_std      FLOAT,
    negative_rate   FLOAT,
    verified_ratio  FLOAT,
    helpful_vote_avg FLOAT,
    reputation_score FLOAT,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reviews (
    review_id           VARCHAR PRIMARY KEY,
    asin                VARCHAR REFERENCES products(asin),
    user_id             VARCHAR,
    rating              FLOAT,
    title               VARCHAR,
    text                TEXT,
    helpful_vote        INTEGER DEFAULT 0,
    verified_purchase   BOOLEAN DEFAULT FALSE,
    sentiment_label     VARCHAR,
    review_length       INTEGER,
    word_count          INTEGER,
    timestamp           BIGINT,
    review_datetime     TIMESTAMP
);

CREATE TABLE IF NOT EXISTS review_sentences (
    sentence_id     VARCHAR PRIMARY KEY,
    review_id       VARCHAR REFERENCES reviews(review_id),
    asin            VARCHAR,
    sentence        TEXT,
    sentiment_label VARCHAR,
    sentiment_score FLOAT
);

CREATE TABLE IF NOT EXISTS brands (
    brand_id      VARCHAR PRIMARY KEY,
    name          VARCHAR,
    product_count INTEGER DEFAULT 0,
    avg_rating    FLOAT
);

CREATE TABLE IF NOT EXISTS categories (
    category_id   VARCHAR PRIMARY KEY,
    name          VARCHAR,
    parent_name   VARCHAR,
    product_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS product_embeddings (
    asin        VARCHAR PRIMARY KEY REFERENCES products(asin),
    embedding   FLOAT[],
    model_name  VARCHAR,
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS review_embeddings (
    review_id   VARCHAR PRIMARY KEY,
    embedding   FLOAT[],
    model_name  VARCHAR,
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS summary_cache (
    asin            VARCHAR PRIMARY KEY REFERENCES products(asin),
    summary_text    TEXT,
    pros            VARCHAR[],
    cons            VARCHAR[],
    generated_at    TIMESTAMP DEFAULT NOW(),
    model_name      VARCHAR DEFAULT 'rule_based'
);

CREATE TABLE IF NOT EXISTS query_logs (
    query_id        VARCHAR PRIMARY KEY,
    query_text      VARCHAR,
    mode            VARCHAR,
    k               INTEGER,
    results_count   INTEGER,
    latency_ms      FLOAT,
    timestamp       TIMESTAMP DEFAULT NOW()
);
