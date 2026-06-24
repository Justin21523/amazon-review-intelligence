"""Brand and category analytics dashboard."""

from __future__ import annotations

import altair as alt
import pandas as pd
import streamlit as st

from src.app._api import api_get


def render() -> None:
    st.title("📊 Analytics Dashboard")

    tab1, tab2 = st.tabs(["Brands", "Categories"])

    with tab1:
        st.subheader("Top Brands by Product Count")
        limit = st.slider("Number of brands", 5, 50, 20, key="brand_limit")
        data = api_get("/analytics/brands", params={"limit": limit})
        if data:
            df = pd.DataFrame(data)
            if not df.empty:
                chart = (
                    alt.Chart(df.head(20))
                    .mark_bar()
                    .encode(
                        x=alt.X("product_count:Q", title="Product Count"),
                        y=alt.Y("brand:O", sort="-x", title="Brand"),
                        color=alt.Color("avg_rating:Q", scale=alt.Scale(scheme="oranges")),
                        tooltip=["brand", "product_count", "avg_rating"],
                    )
                    .properties(height=400)
                )
                st.altair_chart(chart, use_container_width=True)

                st.dataframe(
                    df[["brand", "product_count", "avg_rating"]]
                    .rename(columns={"product_count": "Products", "avg_rating": "Avg Rating"}),
                    use_container_width=True,
                )

    with tab2:
        st.subheader("Category Breakdown")
        data = api_get("/analytics/categories")
        if data:
            df = pd.DataFrame(data)
            if not df.empty:
                col1, col2 = st.columns(2)
                with col1:
                    chart = (
                        alt.Chart(df)
                        .mark_arc(innerRadius=60)
                        .encode(
                            theta=alt.Theta("product_count:Q"),
                            color=alt.Color("category:N"),
                            tooltip=["category", "product_count", "review_count", "avg_rating"],
                        )
                        .properties(title="Products by Category", height=300)
                    )
                    st.altair_chart(chart, use_container_width=True)

                with col2:
                    chart2 = (
                        alt.Chart(df)
                        .mark_bar(color="#FF9900")
                        .encode(
                            x=alt.X("review_count:Q", title="Review Count"),
                            y=alt.Y("category:O", sort="-x"),
                            tooltip=["category", "review_count"],
                        )
                        .properties(title="Reviews by Category", height=300)
                    )
                    st.altair_chart(chart2, use_container_width=True)

                st.dataframe(df, use_container_width=True)
