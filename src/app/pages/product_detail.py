"""Product detail page."""

from __future__ import annotations

import altair as alt
import pandas as pd
import streamlit as st

from src.app._api import api_get, stars


def render() -> None:
    st.title("📦 Product Detail")

    asin = st.session_state.get("selected_asin", "")
    asin_input = st.text_input("Enter ASIN", value=asin)
    if not asin_input:
        st.info("Enter an ASIN or select a product from the Search page.")
        return
    st.session_state["selected_asin"] = asin_input

    data = api_get(f"/products/{asin_input}")
    if not data:
        return

    # Header
    col1, col2, col3 = st.columns([3, 1, 1])
    with col1:
        st.subheader(data.get("title") or data["asin"])
        st.caption(f"ASIN: `{data['asin']}` · {data.get('main_category', '')}")
    with col2:
        st.metric("Avg Rating", stars(data.get("avg_rating")))
    with col3:
        st.metric("Reviews", data.get("rating_number", 0))

    if data.get("price"):
        st.markdown(f"**Price:** ${data['price']:.2f}")
    if data.get("description"):
        st.markdown(f"**Description:** {data['description'][:500]}")

    st.divider()

    # Rating distribution
    rd = data.get("rating_distribution", {})
    if rd:
        st.subheader("Rating Distribution")
        df = pd.DataFrame(
            [{"Stars": f"{k}★", "Count": v} for k, v in sorted(rd.items(), reverse=True)]
        )
        chart = (
            alt.Chart(df)
            .mark_bar(color="#FF9900")
            .encode(x=alt.X("Count:Q"), y=alt.Y("Stars:O", sort="-x"))
            .properties(height=160)
        )
        st.altair_chart(chart, use_container_width=True)

    # Top reviews
    reviews = data.get("top_reviews", [])
    if reviews:
        st.subheader("Top Reviews")
        for rev in reviews:
            sentiment_color = {"positive": "🟢", "negative": "🔴", "neutral": "🟡"}.get(
                rev.get("sentiment_label", ""), "⚪"
            )
            st.markdown(
                f"{sentiment_color} **{rev.get('title', '')}** — {stars(rev.get('rating'))} "
                f"({rev.get('helpful_vote', 0)} helpful)"
            )
            st.caption(rev.get("text", "")[:300])
            st.divider()
