"""Recommendation demo page."""

from __future__ import annotations

import streamlit as st

from src.app._api import api_get, stars


def render() -> None:
    st.title("💡 Recommendations")

    st.markdown(
        "Enter a user ID to get personalised recommendations. "
        "New users get popularity-based suggestions; returning users get content-based ones."
    )

    # Demo: pick a sample user from the DB or enter manually
    demo_users = [
        "AFKZENTNBQ7A7V7UXW5JJI6UGRYQ",
        "AES57JTXM7IOKT74AXQSNL5NNMFQ",
        "AEP4CUO23WOOOEYSJBXWYLLHD5IQ",
        "new_user_123",
    ]
    user_id = st.selectbox("Select demo user", demo_users)
    custom = st.text_input("Or enter custom user ID", "")
    if custom.strip():
        user_id = custom.strip()

    k = st.slider("Number of recommendations", 4, 20, 10)

    if st.button("Get Recommendations"):
        with st.spinner("Fetching recommendations …"):
            data = api_get(f"/recommendations/user/{user_id}", params={"k": k})

        if not data:
            return

        strategy = data.get("strategy", "unknown")
        recs = data.get("recommendations", [])

        st.success(
            f"**{len(recs)} recommendations** for user `{user_id}` "
            f"using **{strategy}** strategy"
        )

        if not recs:
            st.info("No recommendations available. The user may not have any history.")
            return

        cols = st.columns(2)
        for i, p in enumerate(recs):
            with cols[i % 2]:
                st.markdown(f"**{i + 1}. {p.get('title') or p['asin']}**")
                st.caption(f"`{p['asin']}`")
                st.markdown(stars(p.get("avg_rating")))
                st.caption(f"{p.get('rating_number', 0)} reviews")
                st.divider()
