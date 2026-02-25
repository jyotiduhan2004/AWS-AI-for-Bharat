import os
import json
import boto3
import requests
from shared.db import get_db_connection

GRAPH_API = "https://graph.facebook.com/v19.0"


def _get_fb_app_secret():
    """Fetch Facebook App Secret from Secrets Manager."""
    sm = boto3.client("secretsmanager")
    resp = sm.get_secret_value(SecretId=os.environ["FB_APP_SECRET_ARN"])
    raw = resp["SecretString"]
    # Handle both plain-text and JSON-formatted secrets
    try:
        secret = json.loads(raw)
        return secret.get("FB_APP_SECRET") or secret.get("value") or raw
    except (json.JSONDecodeError, TypeError):
        return raw


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
    # Step 1: Get Facebook Pages
    pages_resp = requests.get(
        f"{GRAPH_API}/me/accounts",
        params={"access_token": long_lived_token},
        timeout=10,
    )
    pages_resp.raise_for_status()
    pages = pages_resp.json().get("data", [])

    if not pages:
        raise ValueError("No Facebook Pages found for this user")

    page = pages[0]
    page_id = page["id"]
    page_token = page["access_token"]

    # Step 2: Get Instagram Business Account linked to the Page
    ig_resp = requests.get(
        f"{GRAPH_API}/{page_id}",
        params={
            "fields": "instagram_business_account",
            "access_token": page_token,
        },
        timeout=10,
    )
    ig_resp.raise_for_status()
    ig_data = ig_resp.json()
    ig_account = ig_data.get("instagram_business_account")

    if not ig_account:
        raise ValueError("No Instagram Business Account linked to this Facebook Page")

    ig_id = ig_account["id"]

    # Step 3: Fetch Instagram profile details
    profile_resp = requests.get(
        f"{GRAPH_API}/{ig_id}",
        params={
            "fields": "id,username,name,biography,followers_count,media_count,profile_picture_url",
            "access_token": long_lived_token,
        },
        timeout=10,
    )
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


def handler(event, context):
    """Cognito Post-Authentication trigger OR direct API call."""
    try:
        # Parse input — support both API Gateway and direct invocation
        if "body" in event:
            body = json.loads(event["body"]) if isinstance(event["body"], str) else event["body"]
        else:
            body = event

        fb_access_token = body.get("fb_access_token")
        cognito_sub = body.get("cognito_sub")

        if not fb_access_token or not cognito_sub:
            return {
                "statusCode": 400,
                "headers": {
                    "Access-Control-Allow-Origin": "*",
                    "Content-Type": "application/json",
                },
                "body": json.dumps({"error": "fb_access_token and cognito_sub are required"}),
            }

        # Exchange for long-lived token
        app_id = os.environ["FB_APP_ID"]
        app_secret = _get_fb_app_secret()
        long_lived_token = _exchange_long_lived_token(fb_access_token, app_id, app_secret)

        # Fetch Instagram profile
        profile, token = _get_instagram_profile(long_lived_token)

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

        result = {
            "creator_id": str(creator_id),
            "instagram_id": profile.get("id"),
            "username": profile.get("username"),
            "display_name": profile.get("name"),
            "bio": profile.get("biography"),
            "followers_count": profile.get("followers_count"),
            "media_count": profile.get("media_count"),
            "profile_picture_url": profile.get("profile_picture_url"),
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
