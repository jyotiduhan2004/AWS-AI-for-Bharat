#!/usr/bin/env python3
"""
Standalone test script for the Gemini 2.0 Flash video analysis pipeline.

Usage:
    python scripts/test_gemini.py                          # Test with smallest demo video
    python scripts/test_gemini.py path/to/video.mp4        # Test with a specific video
    python scripts/test_gemini.py --all                    # Test all 3 demo videos

Requires:
    pip install requests
    sudo apt install ffmpeg   (or: brew install ffmpeg on macOS)

Set GEMINI_API_KEY environment variable before running.
"""

import argparse
import base64
import json
import os
import re
import subprocess
import sys
import tempfile

try:
    import requests
except ImportError:
    print("Error: 'requests' package not found. Install with: pip install requests")
    sys.exit(1)

GEMINI_MODEL = "gemini-2.0-flash"
GEMINI_ENDPOINT = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"

ANALYSIS_PROMPT = """You are an expert content analyst for social media creators. Analyze these 4 frames extracted from a single video (taken at 0%, 25%, 50%, and 75% through the video).

Provide your analysis as a JSON object with exactly these fields:

{
  "energy_level": "low" | "medium" | "high",
  "aesthetic": "minimal" | "vibrant" | "dark/moody" | "pastel" | "natural" | "luxury" | "streetwear" | "corporate",
  "setting": "indoor" | "outdoor" | "studio" | "mixed",
  "production_quality": "low" | "medium" | "high" | "professional",
  "content_type": "reel" | "story" | "post",
  "topics": ["topic1", "topic2", ...],
  "dominant_colors": ["color1", "color2", "color3"],
  "text_on_screen": true | false,
  "face_visible": true | false,
  "summary": "A 1-2 sentence summary of the video content and style."
}

Rules:
- energy_level: Based on movement, cuts, transitions, and overall pace.
- aesthetic: The dominant visual style across all frames.
- setting: Where the content was filmed.
- production_quality: Based on lighting, framing, and overall polish.
- content_type: Best guess based on aspect ratio and style — "reel" for vertical short-form, "story" for ephemeral-looking, "post" for polished feed content.
- topics: 2-5 relevant topic tags (e.g., "skincare", "travel", "cooking", "fashion haul").
- dominant_colors: Top 3 colors visible across the frames.
- text_on_screen: Whether any text overlays or captions are visible.
- face_visible: Whether a human face is clearly visible in any frame.
- summary: Brief, descriptive summary of the content and creator's style.

Return ONLY the JSON object. No additional text, no markdown formatting, no code fences."""

EXPECTED_FIELDS = [
    "energy_level", "aesthetic", "setting", "production_quality",
    "content_type", "topics", "dominant_colors", "text_on_screen",
    "face_visible", "summary",
]

# Demo videos relative to repo root
DEMO_VIDEOS_DIR = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    "frontend", "public", "demo-videos",
)

DEMO_FILES = [
    "tcs-nqt-career.mp4",       # 6.0 MB — smallest, default
    "claude-bot-setup.mp4",      # 6.3 MB
    "india-ai-summit.mp4",       # 10.9 MB
]


def find_ffmpeg():
    """Find ffmpeg binary."""
    for path in ["ffmpeg", "/usr/bin/ffmpeg", "/usr/local/bin/ffmpeg"]:
        try:
            subprocess.run([path, "-version"], capture_output=True, check=True)
            return path
        except (FileNotFoundError, subprocess.CalledProcessError):
            continue
    print("Error: ffmpeg not found. Install with: sudo apt install ffmpeg")
    sys.exit(1)


def get_duration(ffmpeg_path, video_path):
    """Get video duration in seconds using ffmpeg."""
    result = subprocess.run(
        [ffmpeg_path, "-i", video_path],
        capture_output=True, text=True,
    )
    match = re.search(r"Duration:\s*(\d{2}):(\d{2}):(\d{2})\.(\d+)", result.stderr)
    if not match:
        raise ValueError(f"Could not determine video duration: {result.stderr[:300]}")
    h, m, s = int(match.group(1)), int(match.group(2)), int(match.group(3))
    frac = int(match.group(4)) / (10 ** len(match.group(4)))
    return h * 3600 + m * 60 + s + frac


def extract_frames(ffmpeg_path, video_path, duration):
    """Extract 4 frames at 0%, 25%, 50%, 75% of the video duration."""
    frames = []
    positions = [0.0, 0.25, 0.50, 0.75]

    for i, pct in enumerate(positions):
        timestamp = duration * pct
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
            frame_path = tmp.name

        subprocess.run(
            [
                ffmpeg_path,
                "-ss", str(timestamp),
                "-i", video_path,
                "-frames:v", "1",
                "-q:v", "2",
                "-y",
                frame_path,
            ],
            capture_output=True, text=True, check=True,
        )

        with open(frame_path, "rb") as f:
            frame_data = f.read()

        os.unlink(frame_path)
        frames.append(base64.b64encode(frame_data).decode("utf-8"))
        print(f"  Frame {i+1} extracted at {pct*100:.0f}% ({timestamp:.1f}s) — {len(frame_data)} bytes")

    return frames


def call_gemini(api_key, frames):
    """Send frames to Gemini 2.0 Flash and return the analysis JSON."""
    parts = []
    for i, b64_data in enumerate(frames):
        parts.append({"text": f"Frame {i + 1} (at {int(i * 25)}% of video):"})
        parts.append({
            "inline_data": {
                "mime_type": "image/jpeg",
                "data": b64_data,
            }
        })
    parts.append({"text": ANALYSIS_PROMPT})

    print("  Calling Gemini 2.0 Flash API...")
    response = requests.post(
        GEMINI_ENDPOINT,
        params={"key": api_key},
        headers={"Content-Type": "application/json"},
        json={
            "contents": [{"parts": parts}],
            "generationConfig": {
                "maxOutputTokens": 1024,
                "temperature": 0.1,
            },
        },
        timeout=60,
    )

    if not response.ok:
        print(f"  Gemini API error {response.status_code}: {response.text[:500]}")
        response.raise_for_status()

    body = response.json()
    raw_text = body["candidates"][0]["content"]["parts"][0]["text"]

    # Clean markdown fences
    cleaned = raw_text.strip()
    cleaned = re.sub(r"^```(?:json)?\s*\n?", "", cleaned)
    cleaned = re.sub(r"\n?```\s*$", "", cleaned)
    cleaned = cleaned.strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        json_match = re.search(r"\{[\s\S]*\}", raw_text)
        if json_match:
            return json.loads(json_match.group())
        raise ValueError(f"Could not parse Gemini response as JSON: {raw_text[:300]}")


def validate_analysis(analysis):
    """Check all 10 expected fields are present. Returns list of missing fields."""
    missing = [f for f in EXPECTED_FIELDS if f not in analysis]
    return missing


def test_video(video_path, api_key, ffmpeg_path):
    """Run the full pipeline on a single video and print results."""
    name = os.path.basename(video_path)
    size_mb = os.path.getsize(video_path) / (1024 * 1024)
    print(f"\n{'='*60}")
    print(f"Testing: {name} ({size_mb:.1f} MB)")
    print(f"{'='*60}")

    duration = get_duration(ffmpeg_path, video_path)
    print(f"  Duration: {duration:.1f}s")

    frames = extract_frames(ffmpeg_path, video_path, duration)
    analysis = call_gemini(api_key, frames)

    print(f"\n  Analysis result:")
    print(json.dumps(analysis, indent=2))

    missing = validate_analysis(analysis)
    if missing:
        print(f"\n  WARNING: Missing fields: {missing}")
        return False
    else:
        print(f"\n  All 10 fields present")
        return True


def main():
    parser = argparse.ArgumentParser(description="Test Gemini 2.0 Flash video analysis pipeline")
    parser.add_argument("video", nargs="?", help="Path to a video file (defaults to smallest demo video)")
    parser.add_argument("--all", action="store_true", help="Test all 3 demo videos")
    args = parser.parse_args()

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY environment variable not set.")
        print("Get one at: https://aistudio.google.com/apikey")
        sys.exit(1)

    ffmpeg_path = find_ffmpeg()
    print(f"Using ffmpeg: {ffmpeg_path}")

    if args.all:
        videos = [os.path.join(DEMO_VIDEOS_DIR, f) for f in DEMO_FILES]
        for v in videos:
            if not os.path.exists(v):
                print(f"Error: Demo video not found: {v}")
                sys.exit(1)
    elif args.video:
        videos = [args.video]
        if not os.path.exists(args.video):
            print(f"Error: Video not found: {args.video}")
            sys.exit(1)
    else:
        default = os.path.join(DEMO_VIDEOS_DIR, DEMO_FILES[0])
        if not os.path.exists(default):
            print(f"Error: Default demo video not found: {default}")
            print(f"Make sure demo videos are copied to: {DEMO_VIDEOS_DIR}")
            sys.exit(1)
        videos = [default]

    results = []
    for video_path in videos:
        success = test_video(video_path, api_key, ffmpeg_path)
        results.append((os.path.basename(video_path), success))

    print(f"\n{'='*60}")
    print("Summary:")
    print(f"{'='*60}")
    for name, success in results:
        status = "PASS" if success else "FAIL"
        print(f"  [{status}] {name}")

    all_passed = all(s for _, s in results)
    print(f"\n{'All tests passed!' if all_passed else 'Some tests failed.'}")
    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
