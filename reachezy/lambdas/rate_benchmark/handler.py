import json
from shared.db import get_db_connection
from shared.models import get_follower_bucket, NICHES, CONTENT_TYPES


def _get_creator_info(cur, creator_id):
    """Fetch creator niche and followers_count."""
    cur.execute(
        """
        SELECT niche, followers_count
        FROM creators
        WHERE id = %s
        """,
        (creator_id,),
    )
    row = cur.fetchone()
    if not row:
        return None, None
    return row[0], row[1]


def _upsert_rate_card(cur, creator_id, reel_rate, story_rate, post_rate, accepts_barter):
    """Upsert rate card for the creator."""
    cur.execute(
        """
        INSERT INTO rate_cards (creator_id, reel_rate, story_rate, post_rate, accepts_barter)
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT (creator_id) DO UPDATE SET
            reel_rate = EXCLUDED.reel_rate,
            story_rate = EXCLUDED.story_rate,
            post_rate = EXCLUDED.post_rate,
            accepts_barter = EXCLUDED.accepts_barter,
            updated_at = NOW()
        """,
        (creator_id, reel_rate, story_rate, post_rate, accepts_barter),
    )


def _get_rate_card(cur, creator_id):
    """Fetch existing rate card."""
    cur.execute(
        """
        SELECT reel_rate, story_rate, post_rate, accepts_barter
        FROM rate_cards
        WHERE creator_id = %s
        """,
        (creator_id,),
    )
    row = cur.fetchone()
    if not row:
        return None
    return {
        "reel_rate": float(row[0]) if row[0] is not None else None,
        "story_rate": float(row[1]) if row[1] is not None else None,
        "post_rate": float(row[2]) if row[2] is not None else None,
        "accepts_barter": row[3],
    }


def _get_community_rates(cur, niche, follower_bucket, content_type):
    """Get non-outlier community rates for a given niche + bucket + content type.

    Returns list of rates sorted ascending.
    """
    rate_column = f"{content_type}_rate"
    # Compute median for outlier detection
    cur.execute(
        f"""
        SELECT rc.{rate_column}
        FROM rate_cards rc
        JOIN creators c ON rc.creator_id = c.id
        WHERE c.niche = %s
          AND rc.{rate_column} IS NOT NULL
          AND rc.{rate_column} > 0
        ORDER BY rc.{rate_column}
        """,
        (niche,),
    )
    all_rates = [float(r[0]) for r in cur.fetchall()]

    if not all_rates:
        return []

    # Filter by follower bucket
    cur.execute(
        f"""
        SELECT rc.{rate_column}, c.followers_count
        FROM rate_cards rc
        JOIN creators c ON rc.creator_id = c.id
        WHERE c.niche = %s
          AND rc.{rate_column} IS NOT NULL
          AND rc.{rate_column} > 0
        ORDER BY rc.{rate_column}
        """,
        (niche,),
    )
    bucket_rates = []
    for row in cur.fetchall():
        rate_val = float(row[0])
        fc = row[1]
        if get_follower_bucket(fc) == follower_bucket:
            bucket_rates.append(rate_val)

    if not bucket_rates:
        return []

    # Calculate median for outlier filtering
    bucket_rates.sort()
    n = len(bucket_rates)
    if n % 2 == 0:
        median = (bucket_rates[n // 2 - 1] + bucket_rates[n // 2]) / 2
    else:
        median = bucket_rates[n // 2]

    # Filter out outliers (> 3x median)
    non_outlier = [r for r in bucket_rates if r <= median * 3]
    return non_outlier


def _get_overall_rates(cur, follower_bucket, content_type):
    """Get non-outlier rates across ALL niches for a follower bucket."""
    rate_column = f"{content_type}_rate"

    cur.execute(
        f"""
        SELECT rc.{rate_column}, c.followers_count
        FROM rate_cards rc
        JOIN creators c ON rc.creator_id = c.id
        WHERE rc.{rate_column} IS NOT NULL
          AND rc.{rate_column} > 0
        ORDER BY rc.{rate_column}
        """,
    )
    bucket_rates = []
    for row in cur.fetchall():
        rate_val = float(row[0])
        fc = row[1]
        if get_follower_bucket(fc) == follower_bucket:
            bucket_rates.append(rate_val)

    if not bucket_rates:
        return []

    bucket_rates.sort()
    n = len(bucket_rates)
    if n % 2 == 0:
        median = (bucket_rates[n // 2 - 1] + bucket_rates[n // 2]) / 2
    else:
        median = bucket_rates[n // 2]

    non_outlier = [r for r in bucket_rates if r <= median * 3]
    return non_outlier


def _get_seed_benchmark(cur, niche, follower_bucket, content_type):
    """Fetch seed benchmark data from rate_benchmarks table."""
    cur.execute(
        """
        SELECT rate_low, rate_high
        FROM rate_benchmarks
        WHERE niche = %s AND follower_bucket = %s AND content_type = %s
        """,
        (niche, follower_bucket, content_type),
    )
    row = cur.fetchone()
    if not row:
        return None
    rate_low = float(row[0]) if row[0] is not None else 0
    rate_high = float(row[1]) if row[1] is not None else 0
    # Derive p25/p50/p75 from rate_low and rate_high for interpolation
    midpoint = (rate_low + rate_high) / 2
    return {
        "rate_low": rate_low,
        "rate_high": rate_high,
        "p25": rate_low + (rate_high - rate_low) * 0.25,
        "p50": midpoint,
        "p75": rate_low + (rate_high - rate_low) * 0.75,
    }


def _compute_percentile(rate, sorted_rates):
    """Compute the percentile of a rate within a sorted list of rates."""
    if not sorted_rates:
        return 50
    below = sum(1 for r in sorted_rates if r < rate)
    equal = sum(1 for r in sorted_rates if r == rate)
    percentile = ((below + 0.5 * equal) / len(sorted_rates)) * 100
    return round(percentile, 1)


def _estimate_percentile_from_seed(rate, seed):
    """Estimate percentile by linear interpolation against seed data."""
    if seed is None:
        return 50

    # Define interpolation points
    points = [
        (seed["rate_low"], 0),
        (seed["p25"], 25),
        (seed["p50"], 50),
        (seed["p75"], 75),
        (seed["rate_high"], 100),
    ]

    # Filter out zero/invalid points
    points = [(v, p) for v, p in points if v > 0]
    if not points:
        return 50

    # If rate is below minimum
    if rate <= points[0][0]:
        return points[0][1]
    # If rate is above maximum
    if rate >= points[-1][0]:
        return points[-1][1]

    # Linear interpolation between adjacent points
    for i in range(len(points) - 1):
        v1, p1 = points[i]
        v2, p2 = points[i + 1]
        if v1 <= rate <= v2:
            if v2 == v1:
                return (p1 + p2) / 2
            ratio = (rate - v1) / (v2 - v1)
            return round(p1 + ratio * (p2 - p1), 1)

    return 50


def _compute_benchmark(cur, niche, follower_bucket, content_type, rate):
    """Compute hybrid benchmark for a single content type."""
    if rate is None or rate <= 0:
        return {
            "percentile": None,
            "source": "insufficient_data",
            "sample_size": 0,
            "range_low": None,
            "range_high": None,
        }

    community_rates = _get_community_rates(cur, niche, follower_bucket, content_type)
    count = len(community_rates)

    if count >= 5:
        # Use community data
        percentile = _compute_percentile(rate, community_rates)
        return {
            "percentile": percentile,
            "source": "community",
            "sample_size": count,
            "range_low": community_rates[0] if community_rates else None,
            "range_high": community_rates[-1] if community_rates else None,
        }
    else:
        # Use seed data with linear interpolation
        seed = _get_seed_benchmark(cur, niche, follower_bucket, content_type)
        percentile = _estimate_percentile_from_seed(rate, seed)
        return {
            "percentile": percentile,
            "source": "seed",
            "sample_size": count,
            "range_low": seed["rate_low"] if seed else None,
            "range_high": seed["rate_high"] if seed else None,
        }


def _compute_overall_benchmark(cur, follower_bucket, content_type, rate):
    """Compute overall benchmark across all niches for a content type."""
    if rate is None or rate <= 0:
        return {
            "percentile": None,
            "source": "insufficient_data",
            "sample_size": 0,
            "range_low": None,
            "range_high": None,
        }

    overall_rates = _get_overall_rates(cur, follower_bucket, content_type)
    count = len(overall_rates)

    if count >= 5:
        percentile = _compute_percentile(rate, overall_rates)
        return {
            "percentile": percentile,
            "source": "community",
            "sample_size": count,
            "range_low": overall_rates[0] if overall_rates else None,
            "range_high": overall_rates[-1] if overall_rates else None,
        }
    else:
        return {
            "percentile": 50,
            "source": "insufficient_data",
            "sample_size": count,
            "range_low": overall_rates[0] if overall_rates else None,
            "range_high": overall_rates[-1] if overall_rates else None,
        }


def _build_response(cur, creator_id, niche, follower_bucket, rate_card):
    """Build the full benchmarks response."""
    benchmarks = {}

    for ct in CONTENT_TYPES:
        rate = rate_card.get(f"{ct}_rate")
        benchmarks[ct] = _compute_benchmark(cur, niche, follower_bucket, ct, rate)

    # Overall benchmark: average the rates that exist for an overall view
    available_rates = [rate_card.get(f"{ct}_rate") for ct in CONTENT_TYPES if rate_card.get(f"{ct}_rate")]
    if available_rates:
        avg_rate = sum(available_rates) / len(available_rates)
        # Use reel as proxy for overall since it's the most common format
        benchmarks["overall"] = _compute_overall_benchmark(cur, follower_bucket, "reel", avg_rate)
    else:
        benchmarks["overall"] = {
            "percentile": None,
            "source": "insufficient_data",
            "sample_size": 0,
            "range_low": None,
            "range_high": None,
        }

    return {
        "niche": niche,
        "follower_bucket": follower_bucket,
        "rate_card": rate_card,
        "benchmarks": benchmarks,
    }


def _handle_post(event):
    """POST /creator/rates: Save rate card + return benchmarks."""
    body = json.loads(event["body"]) if isinstance(event.get("body"), str) else event.get("body", {})

    creator_id = body.get("creator_id")
    reel_rate = body.get("reel_rate")
    story_rate = body.get("story_rate")
    post_rate = body.get("post_rate")
    accepts_barter = body.get("accepts_barter", False)

    if not creator_id:
        return {
            "statusCode": 400,
            "headers": {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"},
            "body": json.dumps({"error": "creator_id is required"}),
        }

    conn = get_db_connection()
    cur = conn.cursor()

    # Lookup creator info
    niche, followers_count = _get_creator_info(cur, creator_id)
    if niche is None:
        return {
            "statusCode": 404,
            "headers": {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"},
            "body": json.dumps({"error": "Creator not found"}),
        }

    follower_bucket = get_follower_bucket(followers_count)

    # Upsert rate card
    _upsert_rate_card(cur, creator_id, reel_rate, story_rate, post_rate, accepts_barter)
    conn.commit()

    rate_card = {
        "reel_rate": float(reel_rate) if reel_rate is not None else None,
        "story_rate": float(story_rate) if story_rate is not None else None,
        "post_rate": float(post_rate) if post_rate is not None else None,
        "accepts_barter": accepts_barter,
    }

    result = _build_response(cur, creator_id, niche, follower_bucket, rate_card)

    return {
        "statusCode": 200,
        "headers": {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"},
        "body": json.dumps(result),
    }


def _handle_get(event):
    """GET /creator/rates: Fetch existing rate card + benchmarks."""
    params = event.get("queryStringParameters") or {}
    creator_id = params.get("creator_id")

    if not creator_id:
        return {
            "statusCode": 400,
            "headers": {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"},
            "body": json.dumps({"error": "creator_id query parameter is required"}),
        }

    conn = get_db_connection()
    cur = conn.cursor()

    # Lookup creator info
    niche, followers_count = _get_creator_info(cur, creator_id)
    if niche is None:
        return {
            "statusCode": 404,
            "headers": {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"},
            "body": json.dumps({"error": "Creator not found"}),
        }

    follower_bucket = get_follower_bucket(followers_count)

    # Fetch existing rate card
    rate_card = _get_rate_card(cur, creator_id)
    if not rate_card:
        return {
            "statusCode": 404,
            "headers": {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"},
            "body": json.dumps({"error": "No rate card found for this creator"}),
        }

    result = _build_response(cur, creator_id, niche, follower_bucket, rate_card)

    return {
        "statusCode": 200,
        "headers": {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"},
        "body": json.dumps(result),
    }


def handler(event, context):
    """Route POST and GET requests for rate benchmarks."""
    try:
        http_method = event.get("httpMethod") or event.get("requestContext", {}).get("http", {}).get("method", "GET")

        if http_method == "POST":
            return _handle_post(event)
        elif http_method == "GET":
            return _handle_get(event)
        else:
            return {
                "statusCode": 405,
                "headers": {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"},
                "body": json.dumps({"error": f"Method {http_method} not allowed"}),
            }

    except Exception as e:
        print(f"Error in rate_benchmark: {e}")
        return {
            "statusCode": 500,
            "headers": {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"},
            "body": json.dumps({"error": "Internal server error"}),
        }
