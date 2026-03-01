"""Shared auth helpers for extracting user info from Bearer JSON tokens."""

import json


def get_user_from_token(event):
    """Extract user dict from Bearer JSON token in Authorization header.

    Returns dict with keys: user_id, creator_id, role, cognito_sub, username, etc.
    Returns None if no valid token found.
    """
    try:
        headers = event.get("headers") or {}
        auth_header = (
            headers.get("Authorization")
            or headers.get("authorization")
            or ""
        )
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
            payload = json.loads(token)
            if payload.get("user_id") or payload.get("creator_id"):
                return payload
    except (json.JSONDecodeError, TypeError, KeyError):
        pass
    return None


def require_brand(event):
    """Verify the token belongs to a brand user. Returns user dict or raises ValueError."""
    user = get_user_from_token(event)
    if not user:
        raise ValueError("Unauthorized: no valid session token")
    if user.get("role") != "brand":
        raise ValueError("Forbidden: brand role required")
    return user
