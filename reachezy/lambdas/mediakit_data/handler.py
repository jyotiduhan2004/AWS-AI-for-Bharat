import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import json
import boto3
from shared.db import get_db_connection
from shared.models import get_follower_bucket, CONTENT_TYPES


def handler(event, context):
    """GET /creator/mediakit/{username} - Public endpoint for media kit data."""
    try:
        # Extract username from path parameters
        path_params = event.get("pathParameters") or {}
        username = path_params.get("username")

        if not username:
            return {
                "statusCode": 400,
                "headers": {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"},
                "body": json.dumps({"error": "username path parameter is required"}),
            }

        conn = get_db_connection()
        cur = conn.cursor()

        # Fetch creator by username (JOIN with rate_cards)
        cur.execute(
            """
            SELECT c.creator_id, c.ig_username, c.full_name, c.bio,
                   c.followers_count, c.media_count, c.profile_pic_url,
                   c.niche, c.city, c.style_profile,
                   rc.reel_rate, rc.story_rate, rc.post_rate, rc.accepts_barter
            FROM creators c
            LEFT JOIN rate_cards rc ON c.creator_id = rc.creator_id
            WHERE c.ig_username = %s
            """,
            (username,),
        )
        row = cur.fetchone()

        if not row:
            return {
                "statusCode": 404,
                "headers": {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"},
                "body": json.dumps({"error": "Creator not found"}),
            }

        creator_id = row[0]
        followers_count = row[4]
        niche = row[7]
        style_profile = row[9]

        creator = {
            "creator_id": str(creator_id),
            "ig_username": row[1],
            "full_name": row[2],
            "bio": row[3],
            "followers_count": followers_count,
            "media_count": row[5],
            "profile_pic_url": row[6],
            "niche": niche,
            "city": row[8],
            "style_profile": style_profile if isinstance(style_profile, dict) else (
                json.loads(style_profile) if style_profile else None
            ),
            "rate_card": {
                "reel_rate": float(row[10]) if row[10] is not None else None,
                "story_rate": float(row[11]) if row[11] is not None else None,
                "post_rate": float(row[12]) if row[12] is not None else None,
                "accepts_barter": row[13],
            } if row[10] is not None else None,
        }

        # Fetch video analyses for this creator
        cur.execute(
            """
            SELECT va.video_id, va.energy_level, va.aesthetic, va.setting,
                   va.production_quality, va.content_type, va.topics,
                   va.summary, vu.s3_key, vu.duration_seconds
            FROM video_analyses va
            JOIN video_uploads vu ON va.video_id = vu.video_id
            WHERE va.creator_id = %s
            ORDER BY vu.created_at DESC
            """,
            (creator_id,),
        )
        video_rows = cur.fetchall()

        videos = []
        frame_keys_for_thumbnails = []
        for vrow in video_rows:
            vid_id = str(vrow[0])
            topics = vrow[6]
            if isinstance(topics, str):
                topics = json.loads(topics)

            videos.append({
                "video_id": vid_id,
                "energy_level": vrow[1],
                "aesthetic": vrow[2],
                "setting": vrow[3],
                "production_quality": vrow[4],
                "content_type": vrow[5],
                "topics": topics,
                "summary": vrow[7],
                "duration_seconds": float(vrow[9]) if vrow[9] is not None else None,
            })

            # First frame of each video as thumbnail
            frame_key = f"{creator_id}/{vid_id}/frame_0.jpg"
            frame_keys_for_thumbnails.append(frame_key)

        # Fetch benchmark data for this creator's niche + follower bucket
        follower_bucket = get_follower_bucket(followers_count)
        benchmarks = {}

        if niche:
            for ct in CONTENT_TYPES:
                cur.execute(
                    """
                    SELECT p25, p50, p75, min_rate, max_rate
                    FROM rate_benchmarks
                    WHERE niche = %s AND follower_bucket = %s AND content_type = %s
                    """,
                    (niche, follower_bucket, ct),
                )
                brow = cur.fetchone()
                if brow:
                    benchmarks[ct] = {
                        "p25": float(brow[0]) if brow[0] is not None else None,
                        "p50": float(brow[1]) if brow[1] is not None else None,
                        "p75": float(brow[2]) if brow[2] is not None else None,
                        "min_rate": float(brow[3]) if brow[3] is not None else None,
                        "max_rate": float(brow[4]) if brow[4] is not None else None,
                    }

        # Increment mediakit_views counter
        cur.execute(
            """
            UPDATE creators
            SET mediakit_views = COALESCE(mediakit_views, 0) + 1
            WHERE creator_id = %s
            """,
            (creator_id,),
        )
        conn.commit()

        # Generate presigned GET URLs for video thumbnails
        frames_bucket = os.environ.get("FRAMES_BUCKET")
        thumbnail_urls = []

        if frames_bucket:
            s3 = boto3.client("s3")
            for frame_key in frame_keys_for_thumbnails:
                try:
                    url = s3.generate_presigned_url(
                        "get_object",
                        Params={"Bucket": frames_bucket, "Key": frame_key},
                        ExpiresIn=3600,  # 1 hour
                    )
                    thumbnail_urls.append(url)
                except Exception:
                    thumbnail_urls.append(None)

        result = {
            "creator": creator,
            "videos": videos,
            "benchmarks": benchmarks,
            "thumbnail_urls": thumbnail_urls,
        }

        return {
            "statusCode": 200,
            "headers": {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"},
            "body": json.dumps(result),
        }

    except Exception as e:
        print(f"Error in mediakit_data: {e}")
        return {
            "statusCode": 500,
            "headers": {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"},
            "body": json.dumps({"error": "Internal server error"}),
        }
