import os
import re
import subprocess
import boto3
from shared.db import get_db_connection

FFMPEG_PATH = "/opt/bin/ffmpeg"


def parse_duration(ffmpeg_stderr):
    """Extract Duration: HH:MM:SS.ms from FFmpeg stderr output.

    Returns duration in seconds as a float, or None if not found.
    """
    match = re.search(r"Duration:\s*(\d{2}):(\d{2}):(\d{2})\.(\d+)", ffmpeg_stderr)
    if not match:
        return None
    hours = int(match.group(1))
    minutes = int(match.group(2))
    seconds = int(match.group(3))
    fraction = match.group(4)
    # Convert fractional part: e.g., "50" -> 0.50, "123" -> 0.123
    frac_seconds = int(fraction) / (10 ** len(fraction))
    return hours * 3600 + minutes * 60 + seconds + frac_seconds


def handler(event, context):
    """Extract frames from a video at 0%, 25%, 50%, 75% of duration.

    Receives from Step Functions:
        { source_bucket, s3_key, video_id, creator_id }

    Returns:
        { video_id, creator_id, frame_keys: [...], duration_seconds }
    """
    source_bucket = event["source_bucket"]
    s3_key = event["s3_key"]
    video_id = event["video_id"]
    creator_id = event["creator_id"]

    frames_bucket = os.environ["FRAMES_BUCKET"]
    s3 = boto3.client("s3")

    # Download video to /tmp
    local_video = f"/tmp/{video_id}.mp4"
    s3.download_file(source_bucket, s3_key, local_video)

    # Probe video duration using FFmpeg
    probe_result = subprocess.run(
        [FFMPEG_PATH, "-i", local_video],
        capture_output=True,
        text=True,
    )
    # FFmpeg prints info to stderr when called with just -i
    duration_seconds = parse_duration(probe_result.stderr)
    if duration_seconds is None or duration_seconds <= 0:
        raise ValueError(f"Could not determine video duration from FFmpeg output: {probe_result.stderr[:500]}")

    # Extract 4 frames at 0%, 25%, 50%, 75%
    frame_positions = [0.0, 0.25, 0.50, 0.75]
    frame_keys = []

    for i, pct in enumerate(frame_positions):
        timestamp = duration_seconds * pct
        local_frame = f"/tmp/{video_id}_frame_{i}.jpg"
        frame_key = f"{creator_id}/{video_id}/frame_{i}.jpg"

        subprocess.run(
            [
                FFMPEG_PATH,
                "-ss", str(timestamp),
                "-i", local_video,
                "-frames:v", "1",
                "-q:v", "2",
                "-y",
                local_frame,
            ],
            capture_output=True,
            text=True,
            check=True,
        )

        # Upload frame to FRAMES_BUCKET
        s3.upload_file(
            local_frame,
            frames_bucket,
            frame_key,
            ExtraArgs={"ContentType": "image/jpeg"},
        )
        frame_keys.append(frame_key)

        # Clean up local frame file
        if os.path.exists(local_frame):
            os.remove(local_frame)

    # Clean up local video file
    if os.path.exists(local_video):
        os.remove(local_video)

    # Update video_uploads row: status='processing', duration_seconds
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        """
        UPDATE video_uploads
        SET status = 'processing', duration_seconds = %s, updated_at = NOW()
        WHERE video_id = %s
        """,
        (round(duration_seconds, 2), video_id),
    )
    conn.commit()

    return {
        "video_id": video_id,
        "creator_id": creator_id,
        "frame_keys": frame_keys,
        "duration_seconds": round(duration_seconds, 2),
    }
