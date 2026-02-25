import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import json
import uuid
import boto3
from shared.db import get_db_connection

ALLOWED_CONTENT_TYPES = {"video/mp4", "video/quicktime"}


def handler(event, context):
    """Generate a presigned S3 PUT URL for video upload."""
    try:
        body = json.loads(event["body"]) if isinstance(event.get("body"), str) else event.get("body", {})

        creator_id = body.get("creator_id")
        filename = body.get("filename")
        content_type = body.get("content_type")

        # Validate required fields
        if not creator_id or not filename or not content_type:
            return {
                "statusCode": 400,
                "headers": {
                    "Access-Control-Allow-Origin": "*",
                    "Content-Type": "application/json",
                },
                "body": json.dumps({"error": "creator_id, filename, and content_type are required"}),
            }

        # Validate content type
        if content_type not in ALLOWED_CONTENT_TYPES:
            return {
                "statusCode": 400,
                "headers": {
                    "Access-Control-Allow-Origin": "*",
                    "Content-Type": "application/json",
                },
                "body": json.dumps({
                    "error": f"Invalid content_type. Must be one of: {', '.join(ALLOWED_CONTENT_TYPES)}"
                }),
            }

        # Generate video ID and S3 key
        video_id = str(uuid.uuid4())
        s3_key = f"{creator_id}/{video_id}/{filename}"

        # Generate presigned PUT URL
        s3 = boto3.client("s3")
        upload_bucket = os.environ["UPLOAD_BUCKET"]
        upload_url = s3.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": upload_bucket,
                "Key": s3_key,
                "ContentType": content_type,
            },
            ExpiresIn=300,  # 5 minutes
        )

        # Insert record into video_uploads table
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO video_uploads (video_id, creator_id, s3_bucket, s3_key, filename, content_type, status)
            VALUES (%s, %s, %s, %s, %s, %s, 'uploaded')
            """,
            (video_id, creator_id, upload_bucket, s3_key, filename, content_type),
        )
        conn.commit()

        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json",
            },
            "body": json.dumps({
                "upload_url": upload_url,
                "video_id": video_id,
                "s3_key": s3_key,
            }),
        }

    except Exception as e:
        print(f"Error in presign_upload: {e}")
        return {
            "statusCode": 500,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json",
            },
            "body": json.dumps({"error": "Internal server error"}),
        }
