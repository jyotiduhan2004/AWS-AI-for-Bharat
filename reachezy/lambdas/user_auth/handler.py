"""User Auth Lambda — email/password signup + login for brands and creators."""

import json
import uuid
import hashlib
import time
from shared.db import get_db_connection


CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
}


def _hash_password(password):
    """SHA-256 hash a password string."""
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def _generate_session_token(user_id, creator_id, role, username):
    """Generate a session token (plain JSON, same pattern as auth_callback)."""
    cognito_sub = f"email_{hashlib.sha256(str(user_id).encode()).hexdigest()[:16]}"
    payload = {
        "user_id": str(user_id),
        "creator_id": str(creator_id) if creator_id else None,
        "role": role,
        "cognito_sub": cognito_sub,
        "username": username or "",
        "iat": int(time.time()),
        "exp": int(time.time()) + 86400 * 7,  # 7 days
        "jti": str(uuid.uuid4()),
    }
    return json.dumps(payload)


def _handle_signup(body):
    """Handle user signup for both brands and creators."""
    role = body.get("role")
    email = (body.get("email") or "").strip().lower()
    password = body.get("password", "")

    if role not in ("creator", "brand"):
        return 400, {"error": "role must be 'creator' or 'brand'"}
    if not email or "@" not in email:
        return 400, {"error": "Valid email is required"}
    if len(password) < 6:
        return 400, {"error": "Password must be at least 6 characters"}

    password_hash = _hash_password(password)
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Check if email already exists
        cur.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cur.fetchone():
            conn.rollback()
            return 409, {"error": "Email already registered"}

        creator_id = None
        username = ""

        if role == "creator":
            full_name = body.get("full_name", "").strip()
            instagram_handle = body.get("instagram_handle", "").strip().lstrip("@")
            niche = body.get("niche", "")
            city = body.get("city", "")
            followers_count = int(body.get("followers_count", 0))
            bio = body.get("bio", "")

            if not instagram_handle:
                conn.rollback()
                return 400, {"error": "Instagram handle is required"}

            # Create cognito_sub for creator
            cognito_sub = f"email_{hashlib.sha256(email.encode()).hexdigest()[:16]}"

            # Insert into creators table
            cur.execute(
                """
                INSERT INTO creators (cognito_sub, username, display_name, bio,
                                      followers_count, niche, city)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (cognito_sub) DO UPDATE SET
                    username = EXCLUDED.username,
                    display_name = EXCLUDED.display_name,
                    bio = EXCLUDED.bio,
                    followers_count = EXCLUDED.followers_count,
                    niche = EXCLUDED.niche,
                    city = EXCLUDED.city,
                    updated_at = NOW()
                RETURNING id
                """,
                (cognito_sub, instagram_handle, full_name, bio,
                 followers_count, niche, city),
            )
            creator_id = cur.fetchone()[0]
            username = instagram_handle

        # Insert into users table
        company_name = body.get("company_name", "").strip() if role == "brand" else None
        industry = body.get("industry", "").strip() if role == "brand" else None
        city = body.get("city", "").strip()
        contact_name = body.get("contact_name", "").strip() if role == "brand" else None

        cur.execute(
            """
            INSERT INTO users (email, password_hash, role, creator_id,
                              company_name, industry, city, contact_name)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (email, password_hash, role, creator_id,
             company_name, industry, city, contact_name),
        )
        user_id = cur.fetchone()[0]
        conn.commit()

        session_token = _generate_session_token(user_id, creator_id, role, username)

        result = {
            "user_id": str(user_id),
            "role": role,
            "email": email,
            "session_token": session_token,
        }
        if creator_id:
            result["creator_id"] = str(creator_id)
            result["username"] = username

        return 200, result

    except Exception as e:
        conn.rollback()
        raise e


def _handle_login(body):
    """Handle user login with email and password."""
    email = (body.get("email") or "").strip().lower()
    password = body.get("password", "")

    if not email or not password:
        return 400, {"error": "Email and password are required"}

    password_hash = _hash_password(password)
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT u.id, u.role, u.creator_id, u.company_name, u.email,
               c.username, c.display_name
        FROM users u
        LEFT JOIN creators c ON u.creator_id = c.id
        WHERE u.email = %s AND u.password_hash = %s
        """,
        (email, password_hash),
    )
    row = cur.fetchone()
    if not row:
        return 401, {"error": "Invalid email or password"}

    user_id, role, creator_id, company_name, user_email, username, display_name = row
    session_token = _generate_session_token(user_id, creator_id, role, username)

    result = {
        "user_id": str(user_id),
        "role": role,
        "email": user_email,
        "session_token": session_token,
    }
    if creator_id:
        result["creator_id"] = str(creator_id)
        result["username"] = username
    if company_name:
        result["company_name"] = company_name

    return 200, result


def handler(event, context):
    """POST /auth/user — handles signup and login actions."""
    try:
        body = json.loads(event["body"]) if isinstance(event.get("body"), str) else event.get("body", {})
        action = body.get("action")

        if action == "signup":
            status, result = _handle_signup(body)
        elif action == "login":
            status, result = _handle_login(body)
        else:
            status, result = 400, {"error": "action must be 'signup' or 'login'"}

        return {
            "statusCode": status,
            "headers": CORS_HEADERS,
            "body": json.dumps(result),
        }

    except Exception as e:
        print(f"Error in user_auth: {e}")
        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": json.dumps({"error": "Internal server error"}),
        }
