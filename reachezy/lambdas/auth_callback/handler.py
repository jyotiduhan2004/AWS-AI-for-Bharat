import os
import json
import uuid
import hashlib
import hmac
import time
import boto3
import requests
from shared.db import get_db_connection

GRAPH_API = "https://graph.facebook.com/v21.0"


def _get_fb_app_secret():
    """Fetch Facebook App Secret from Secrets Manager."""
    sm = boto3.client("secretsmanager")
    resp = sm.get_secret_value(SecretId=os.environ["FB_APP_SECRET_ARN"])
    raw = resp["SecretString"]
    try:
        secret = json.loads(raw)
        return secret.get("FB_APP_SECRET") or secret.get("value") or raw
    except (json.JSONDecodeError, TypeError):
        return raw


def _exchange_code_for_token(code, redirect_uri, app_id, app_secret):
    """Exchange Facebook authorization code for an access token."""
    resp = requests.get(
        f"{GRAPH_API}/oauth/access_token",
        params={
            "client_id": app_id,
            "client_secret": app_secret,
            "redirect_uri": redirect_uri,
            "code": code,
        },
        timeout=10,
    )
    if not resp.ok:
        print(f"FB code exchange error: {resp.status_code} {resp.text}")
        resp.raise_for_status()
    data = resp.json()
    return data["access_token"]


def _exchange_long_lived_token(short_token, app_id, app_secret):
    """Exchange a short-lived Facebook token for a long-lived one."""
    resp = requests.get(
        f"{GRAPH_API}/oauth/access_token",
        params={
            "grant_type": "fb_exchange_token",
            "client_id": app_id,
            "client_secret": app_secret,
            "fb_exchange_token": short_token,
        },
        timeout=10,
    )
    resp.raise_for_status()
    data = resp.json()
    return data["access_token"]


def _get_instagram_profile(long_lived_token):
    """Fetch the Instagram Business/Creator account linked to the Facebook user."""
    """Try multiple approaches to find the Instagram Business account."""
    ig_id = None
    profile_fields = "id,username,name,biography,followers_count,media_count,profile_picture_url"

    # Approach 1: Via Pages (needs pages_show_list)
    pages_resp = requests.get(
        f"{GRAPH_API}/me/accounts",
        params={"access_token": long_lived_token},
        timeout=10,
    )
    if pages_resp.ok:
        pages = pages_resp.json().get("data", [])
        if pages:
            page = pages[0]
            ig_resp = requests.get(
                f"{GRAPH_API}/{page['id']}",
                params={"fields": "instagram_business_account", "access_token": page.get("access_token", long_lived_token)},
                timeout=10,
            )
            if ig_resp.ok:
                ig_account = ig_resp.json().get("instagram_business_account")
                if ig_account:
                    ig_id = ig_account["id"]
                    print(f"Approach 1: Found IG via Pages: {ig_id}")

    # Approach 2: Via /me/businesses -> owned_instagram_accounts
    if not ig_id:
        print("Approach 2: Trying via businesses...")
        biz_resp = requests.get(
            f"{GRAPH_API}/me/businesses",
            params={"access_token": long_lived_token},
            timeout=10,
        )
        print(f"Businesses response: {biz_resp.status_code} {biz_resp.text[:500]}")
        if biz_resp.ok:
            businesses = biz_resp.json().get("data", [])
            for biz in businesses:
                ig_biz_resp = requests.get(
                    f"{GRAPH_API}/{biz['id']}/owned_instagram_accounts",
                    params={"fields": profile_fields, "access_token": long_lived_token},
                    timeout=10,
                )
                print(f"Biz {biz['id']} IG accounts: {ig_biz_resp.status_code} {ig_biz_resp.text[:500]}")
                if ig_biz_resp.ok:
                    ig_accounts = ig_biz_resp.json().get("data", [])
                    if ig_accounts:
                        print(f"Approach 2: Found IG via business: {ig_accounts[0].get('username')}")
                        return ig_accounts[0], long_lived_token

    # Approach 3: Try /me?fields=accounts with instagram_business_account
    if not ig_id:
        print("Approach 3: Trying /me?fields=accounts...")
        me_resp = requests.get(
            f"{GRAPH_API}/me",
            params={"fields": "accounts{instagram_business_account{" + profile_fields + "}}", "access_token": long_lived_token},
            timeout=10,
        )
        print(f"Me accounts response: {me_resp.status_code} {me_resp.text[:500]}")
        if me_resp.ok:
            accounts = me_resp.json().get("accounts", {}).get("data", [])
            for acc in accounts:
                ig_account = acc.get("instagram_business_account")
                if ig_account:
                    ig_id = ig_account.get("id")
                    print(f"Approach 3: Found IG: {ig_id}")
                    return ig_account, long_lived_token

    # Approach 4: Try debug_token to find granted Instagram accounts
    if not ig_id:
        print("Approach 4: Trying debug_token for granted assets...")
        app_token = f"{os.environ['FB_APP_ID']}|{_get_fb_app_secret()}"
        debug_resp = requests.get(
            f"{GRAPH_API}/debug_token",
            params={"input_token": long_lived_token, "access_token": app_token},
            timeout=10,
        )
        print(f"Debug token response: {debug_resp.status_code} {debug_resp.text[:1000]}")
        if debug_resp.ok:
            debug_data = debug_resp.json().get("data", {})
            granular = debug_data.get("granular_scopes", [])
            for scope in granular:
                if scope.get("scope") == "instagram_basic":
                    target_ids = scope.get("target_ids", [])
                    if target_ids:
                        ig_id = target_ids[0]
                        print(f"Approach 4: Found IG ID from debug_token: {ig_id}")
                        break

    if not ig_id:
        raise ValueError(
            "Could not find Instagram Business Account. "
            "Please ensure your Instagram is a Business/Creator account linked to a Facebook Page."
        )

    # Fetch full Instagram profile
    profile_resp = requests.get(
        f"{GRAPH_API}/{ig_id}",
        params={"fields": profile_fields, "access_token": long_lived_token},
        timeout=10,
    )
    print(f"Profile fetch: {profile_resp.status_code} {profile_resp.text[:500]}")
    profile_resp.raise_for_status()
    profile = profile_resp.json()

    return profile, long_lived_token


def _store_instagram_token(creator_id, token):
    """Store the Instagram long-lived token in Secrets Manager."""
    sm = boto3.client("secretsmanager")
    secret_name = f"reachezy/instagram/{creator_id}"
    secret_value = json.dumps({"access_token": token})

    try:
        sm.create_secret(Name=secret_name, SecretString=secret_value)
    except sm.exceptions.ResourceExistsException:
        sm.put_secret_value(SecretId=secret_name, SecretString=secret_value)


def _generate_session_token(creator_id, username, cognito_sub):
    """Generate a simple session token for the creator."""
    payload = {
        "creator_id": str(creator_id),
        "cognito_sub": cognito_sub,
        "username": username or "",
        "iat": int(time.time()),
        "exp": int(time.time()) + 86400 * 7,  # 7 days
        "jti": str(uuid.uuid4()),
    }
    return json.dumps(payload)


def _handle_demo_login(username):
    """Look up a demo creator by username and return a session token."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id, cognito_sub, username, display_name, bio,
               followers_count, media_count, profile_picture_url, instagram_id
        FROM creators WHERE username = %s LIMIT 1
        """,
        (username,),
    )
    row = cur.fetchone()
    if not row:
        return {
            "statusCode": 404,
            "headers": {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"},
            "body": json.dumps({"error": f"Demo creator '{username}' not found"}),
        }

    creator_id, cognito_sub, uname, display_name, bio, followers, media_count, pic_url, ig_id = row
    session_token = _generate_session_token(creator_id, uname, cognito_sub)

    result = {
        "creator_id": str(creator_id),
        "instagram_id": ig_id,
        "username": uname,
        "display_name": display_name,
        "bio": bio,
        "followers_count": followers,
        "media_count": media_count,
        "profile_picture_url": pic_url,
        "session_token": session_token,
    }
    return {
        "statusCode": 200,
        "headers": {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"},
        "body": json.dumps(result),
    }


def handler(event, context):
    """Handle Facebook OAuth callback — exchange code for token, fetch Instagram profile."""
    try:
        print(f"Event keys: {list(event.keys()) if isinstance(event, dict) else type(event)}")
        if "body" in event:
            body = json.loads(event["body"]) if isinstance(event["body"], str) else event["body"]
        else:
            body = event

        print(f"Parsed body keys: {list(body.keys()) if isinstance(body, dict) else type(body)}")

        # Demo mode: bypass Facebook OAuth entirely
        if body.get("action") == "demo":
            username = body.get("username", "priyabeauty")
            print(f"Demo login for: {username}")
            return _handle_demo_login(username)

        # Support both flows: code-based (new) and token-based (legacy)
        code = body.get("code")
        redirect_uri = body.get("redirect_uri")
        fb_access_token = body.get("fb_access_token")
        print(f"code={bool(code)}, redirect_uri={redirect_uri}, fb_access_token={bool(fb_access_token)}")

        app_id = os.environ["FB_APP_ID"]
        app_secret = _get_fb_app_secret()

        if code and redirect_uri:
            # New flow: exchange authorization code for access token
            print(f"Exchanging code for token with redirect_uri={redirect_uri}")
            fb_access_token = _exchange_code_for_token(code, redirect_uri, app_id, app_secret)
            print("Code exchange successful")
        elif not fb_access_token:
            return {
                "statusCode": 400,
                "headers": {
                    "Access-Control-Allow-Origin": "*",
                    "Content-Type": "application/json",
                },
                "body": json.dumps({"error": "Either 'code'+'redirect_uri' or 'fb_access_token' is required"}),
            }

        # Exchange for long-lived token
        print("Exchanging for long-lived token...")
        long_lived_token = _exchange_long_lived_token(fb_access_token, app_id, app_secret)
        print("Long-lived token obtained")

        # Fetch Instagram profile
        print("Fetching Instagram profile...")
        profile, token = _get_instagram_profile(long_lived_token)
        print(f"Instagram profile fetched: {profile.get('username')}")

        # Use instagram ID as a stable identifier
        cognito_sub = f"fb_{profile.get('id', str(uuid.uuid4()))}"

        # Upsert into creators table
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO creators (
                cognito_sub, instagram_id, username, display_name,
                bio, followers_count, media_count, profile_picture_url
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (cognito_sub) DO UPDATE SET
                instagram_id = EXCLUDED.instagram_id,
                username = EXCLUDED.username,
                display_name = EXCLUDED.display_name,
                bio = EXCLUDED.bio,
                followers_count = EXCLUDED.followers_count,
                media_count = EXCLUDED.media_count,
                profile_picture_url = EXCLUDED.profile_picture_url,
                updated_at = NOW()
            RETURNING id
            """,
            (
                cognito_sub,
                profile.get("id"),
                profile.get("username"),
                profile.get("name"),
                profile.get("biography"),
                profile.get("followers_count"),
                profile.get("media_count"),
                profile.get("profile_picture_url"),
            ),
        )
        creator_id = cur.fetchone()[0]
        conn.commit()

        # Store Instagram token in Secrets Manager
        _store_instagram_token(creator_id, token)

        # Generate session token
        session_token = _generate_session_token(creator_id, profile.get("username"), cognito_sub)

        result = {
            "creator_id": str(creator_id),
            "instagram_id": profile.get("id"),
            "username": profile.get("username"),
            "display_name": profile.get("name"),
            "bio": profile.get("biography"),
            "followers_count": profile.get("followers_count"),
            "media_count": profile.get("media_count"),
            "profile_picture_url": profile.get("profile_picture_url"),
            "session_token": session_token,
        }

        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json",
            },
            "body": json.dumps(result),
        }

    except ValueError as ve:
        print(f"ValueError in auth_callback: {ve}")
        return {
            "statusCode": 400,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json",
            },
            "body": json.dumps({"error": str(ve)}),
        }
    except Exception as e:
        print(f"Error in auth_callback: {e}")
        return {
            "statusCode": 500,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json",
            },
            "body": json.dumps({"error": "Internal server error"}),
        }
