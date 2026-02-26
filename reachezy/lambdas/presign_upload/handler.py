import os
import json
import uuid
import boto3
from shared.db import get_db_connection

ALLOWED_CONTENT_TYPES = {"video/mp4", "video/quicktime"}


def _handle_presign(body):
    """Generate a presigned S3 PUT URL for video upload."""
    creator_id = body.get("creator_id")
    filename = body.get("filename")
    content_type = body.get("content_type")

    if not creator_id or not filename or not content_type:
        return {
            "statusCode": 400,
            "headers": {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"},
            "body": json.dumps({"error": "creator_id, filename, and content_type are required"}),
        }

    if content_type not in ALLOWED_CONTENT_TYPES:
        return {
            "statusCode": 400,
            "headers": {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"},
            "body": json.dumps({"error": f"Invalid content_type. Must be one of: {', '.join(ALLOWED_CONTENT_TYPES)}"}),
        }

    video_id = str(uuid.uuid4())
    s3_key = f"{creator_id}/{video_id}/{filename}"

    s3 = boto3.client("s3")
    upload_bucket = os.environ["UPLOAD_BUCKET"]
    upload_url = s3.generate_presigned_url(
        "put_object",
        Params={"Bucket": upload_bucket, "Key": s3_key, "ContentType": content_type},
        ExpiresIn=300,
    )

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO video_uploads (id, creator_id, s3_key, status) VALUES (%s, %s, %s, 'uploaded')",
        (video_id, creator_id, s3_key),
    )
    conn.commit()

    return {
        "statusCode": 200,
        "headers": {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"},
        "body": json.dumps({"url": upload_url, "upload_url": upload_url, "video_id": video_id, "s3_key": s3_key}),
    }


def _handle_start_analysis(body):
    """Start the Step Function for each uploaded video."""
    creator_id = body.get("creator_id")
    if not creator_id:
        return {
            "statusCode": 400,
            "headers": {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"},
            "body": json.dumps({"error": "creator_id is required"}),
        }

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, s3_key FROM video_uploads WHERE creator_id = %s AND status = 'uploaded'",
        (creator_id,),
    )
    videos = cur.fetchall()

    if not videos:
        return {
            "statusCode": 404,
            "headers": {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"},
            "body": json.dumps({"error": "No uploaded videos found for this creator"}),
        }

    sfn = boto3.client("stepfunctions")
    state_machine_arn = os.environ["STATE_MACHINE_ARN"]
    source_bucket = os.environ["UPLOAD_BUCKET"]
    started = []

    for video_id, s3_key in videos:
        sfn_input = json.dumps({
            "source_bucket": source_bucket,
            "s3_key": s3_key,
            "video_id": str(video_id),
            "creator_id": str(creator_id),
        })
        try:
            sfn.start_execution(
                stateMachineArn=state_machine_arn,
                name=f"video-{video_id}-{uuid.uuid4().hex[:8]}",
                input=sfn_input,
            )
            started.append(str(video_id))
            cur.execute("UPDATE video_uploads SET status = 'processing' WHERE id = %s", (video_id,))
        except Exception as e:
            print(f"Failed to start SFN for video {video_id}: {e}")

    conn.commit()

    return {
        "statusCode": 200,
        "headers": {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"},
        "body": json.dumps({"started": started, "count": len(started)}),
    }


def handler(event, context):
    """Handle presign requests and analysis trigger."""
    try:
        body = json.loads(event["body"]) if isinstance(event.get("body"), str) else event.get("body", {})
        action = body.get("action")

        if action == "start_analysis":
            return _handle_start_analysis(body)
        else:
            return _handle_presign(body)

    except Exception as e:
        print(f"Error in presign_upload: {e}")
        return {
            "statusCode": 500,
            "headers": {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"},
            "body": json.dumps({"error": "Internal server error"}),
        }
