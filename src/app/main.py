"""Streamlit application entry point with sidebar navigation."""

from __future__ import annotations

import streamlit as st

st.set_page_config(
    page_title="Amazon Review Intelligence",
    page_icon="🔍",
    layout="wide",
    initial_sidebar_state="expanded",
)

PAGES = {
    "🔍 Search": "search",
    "📦 Product Detail": "product_detail",
    "📝 Review Summary": "review_summary",
    "🔗 Similar Products": "similar_products",
    "📊 Analytics": "analytics",
    "💡 Recommendations": "recommendation",
}


def main() -> None:
    st.sidebar.title("🛒 Amazon Review Intelligence")
    st.sidebar.markdown("---")
    selection = st.sidebar.radio("Navigate", list(PAGES.keys()))
    st.sidebar.markdown("---")
    st.sidebar.caption("Data: Amazon Reviews 2023 — Home & Kitchen")
    st.sidebar.caption("Category subset · Derived outputs only")

    page_key = PAGES[selection]

    if page_key == "search":
        from src.app.pages.search import render
    elif page_key == "product_detail":
        from src.app.pages.product_detail import render
    elif page_key == "review_summary":
        from src.app.pages.review_summary import render
    elif page_key == "similar_products":
        from src.app.pages.similar_products import render
    elif page_key == "analytics":
        from src.app.pages.analytics import render
    elif page_key == "recommendation":
        from src.app.pages.recommendation import render
    else:
        st.error("Unknown page")
        return

    render()


if __name__ == "__main__":
    main()
