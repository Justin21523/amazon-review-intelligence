"""Review summary page: pros, cons, and sentiment distribution."""

from __future__ import annotations

import altair as alt
import pandas as pd
import streamlit as st

from src.app._api import api_get


def render() -> None:
    st.title("📝 Review Summary")

    asin = st.session_state.get("selected_asin", "")
    asin_input = st.text_input("Enter ASIN", value=asin)
    if not asin_input:
        st.info("Enter an ASIN to see its review summary.")
        return

    data = api_get(f"/products/{asin_input}/summary")
    if not data:
        return

    st.subheader(f"ASIN: `{data['asin']}`")
    st.caption(f"Based on {data.get('total_reviews', 0)} reviews")

    if data.get("summary_text"):
        st.info(f"**Summary:** {data['summary_text']}")

    col1, col2 = st.columns(2)
    with col1:
        st.markdown("### ✅ Pros")
        pros = data.get("pros", [])
        if pros:
            for p in pros:
                st.markdown(f"- {p}")
        else:
            st.caption("No pros extracted yet.")

    with col2:
        st.markdown("### ❌ Cons")
        cons = data.get("cons", [])
        if cons:
            for c in cons:
                st.markdown(f"- {c}")
        else:
            st.caption("No cons extracted yet.")

    st.divider()
    sentiment = data.get("sentiment_distribution", {})
    if sentiment:
        st.subheader("Sentiment Distribution")
        df = pd.DataFrame(
            [{"Sentiment": k, "Count": v} for k, v in sentiment.items()]
        )
        color_map = {"positive": "#27ae60", "negative": "#e74c3c", "neutral": "#f39c12"}
        chart = (
            alt.Chart(df)
            .mark_arc(innerRadius=50)
            .encode(
                theta=alt.Theta("Count:Q"),
                color=alt.Color(
                    "Sentiment:N",
                    scale=alt.Scale(
                        domain=list(color_map.keys()),
                        range=list(color_map.values()),
                    ),
                ),
                tooltip=["Sentiment", "Count"],
            )
            .properties(height=250)
        )
        st.altair_chart(chart, use_container_width=True)
