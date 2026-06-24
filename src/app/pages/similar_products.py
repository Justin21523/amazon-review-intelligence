"""Similar products page."""

from __future__ import annotations

import streamlit as st

from src.app._api import api_get, stars


def render() -> None:
    st.title("🔗 Similar Products")

    asin = st.session_state.get("selected_asin", "")
    asin_input = st.text_input("Enter ASIN", value=asin)
    k = st.slider("Number of similar products", 4, 20, 8)

    if not asin_input:
        st.info("Enter an ASIN to find similar products.")
        return

    with st.spinner("Finding similar products …"):
        products = api_get(f"/products/{asin_input}/similar", params={"k": k})

    if products is None:
        return
    if not products:
        st.warning("No similar products found. Run `make index` to generate embeddings.")
        return

    st.markdown(f"**{len(products)} similar products** to `{asin_input}`")
    st.divider()

    # Display in a responsive grid (3 columns)
    cols = st.columns(3)
    for i, p in enumerate(products):
        with cols[i % 3]:
            st.markdown(f"**{p.get('title') or p['asin']}**")
            st.caption(f"`{p['asin']}`")
            st.markdown(stars(p.get("avg_rating")))
            st.caption(f"{p.get('rating_number', 0)} reviews")
            if p.get("vector_score") is not None:
                st.progress(float(p["vector_score"]), text=f"similarity: {p['vector_score']:.3f}")
            if st.button("Select", key=f"sel_{p['asin']}_{i}"):
                st.session_state["selected_asin"] = p["asin"]
            st.divider()
