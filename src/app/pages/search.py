"""Search page."""

from __future__ import annotations

import streamlit as st

from src.app._api import api_get, stars


def render() -> None:
    st.title("🔍 Product Search")

    col1, col2 = st.columns([3, 1])
    with col1:
        query = st.text_input("Search query", placeholder="wireless headphones, kitchen knife, coffee maker …")
    with col2:
        k = st.number_input("Results (k)", min_value=1, max_value=50, value=10)

    mode = st.radio("Search mode", ["hybrid", "bm25", "vector"], horizontal=True)
    alpha = 0.5
    if mode == "hybrid":
        alpha = st.slider("Alpha (0 = BM25, 1 = Vector)", 0.0, 1.0, 0.5, step=0.1)

    if not query:
        st.info("Enter a search query to get started.")
        return

    with st.spinner("Searching …"):
        data = api_get("/search", params={"q": query, "k": k, "mode": mode, "alpha": alpha})

    if not data:
        return

    results = data.get("results", [])
    st.markdown(
        f"**{data.get('total', 0)} results** · mode=`{data.get('mode')}` · "
        f"{data.get('latency_ms', 0):.1f} ms"
    )

    if not results:
        st.warning("No results found. Try a different query.")
        return

    for r in results:
        with st.container():
            col1, col2 = st.columns([4, 1])
            with col1:
                st.markdown(f"**{r.get('rank', '?')}. {r.get('title') or r['asin']}**")
                st.caption(f"ASIN: `{r['asin']}` · Category: {r.get('main_category', '—')}")
            with col2:
                st.markdown(stars(r.get("avg_rating")))
                st.caption(f"{r.get('rating_number', 0)} reviews")
            if r.get("price"):
                st.caption(f"${r['price']:.2f}")

            scores = []
            if r.get("hybrid_score") is not None:
                scores.append(f"hybrid={r['hybrid_score']:.3f}")
            if r.get("bm25_score") is not None:
                scores.append(f"bm25={r['bm25_score']:.3f}")
            if r.get("vector_score") is not None:
                scores.append(f"vector={r['vector_score']:.3f}")
            if scores:
                st.caption(" · ".join(scores))

            btn_col1, btn_col2, btn_col3 = st.columns(3)
            with btn_col1:
                if st.button("View detail", key=f"detail_{r['asin']}"):
                    st.session_state["selected_asin"] = r["asin"]
                    st.session_state["nav"] = "product_detail"
            st.divider()
