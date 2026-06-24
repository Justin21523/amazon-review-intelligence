"""Shared httpx helper for Streamlit pages to call the FastAPI backend."""

from __future__ import annotations

import os

import httpx
import streamlit as st

_BASE = os.environ.get("API_BASE_URL", "http://localhost:8000")
_TIMEOUT = 10.0


def api_get(path: str, params: dict | None = None) -> dict | list | None:
    """Make a GET request to the API and return parsed JSON, or None on error."""
    try:
        r = httpx.get(f"{_BASE}{path}", params=params, timeout=_TIMEOUT)
        r.raise_for_status()
        return r.json()
    except httpx.ConnectError:
        st.error(f"Cannot connect to API at {_BASE}. Run `make api` first.")
        return None
    except httpx.HTTPStatusError as e:
        st.warning(f"API error {e.response.status_code}: {e.response.text[:200]}")
        return None
    except Exception as e:
        st.error(f"Unexpected error: {e}")
        return None


def stars(rating: float | None) -> str:
    if rating is None:
        return "N/A"
    full = int(rating)
    return "★" * full + "☆" * (5 - full) + f" {rating:.1f}"
