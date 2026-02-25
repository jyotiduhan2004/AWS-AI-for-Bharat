NICHES = [
    "Fashion", "Beauty/Cosmetics", "Fitness/Health", "Food", "Tech",
    "Travel", "Education", "Comedy/Entertainment", "Lifestyle", "Parenting",
]

FOLLOWER_BUCKETS = [
    (5000, 10000, "5K-10K"),
    (10000, 25000, "10K-25K"),
    (25000, 50000, "25K-50K"),
    (50000, 100000, "50K-100K"),
]

CONTENT_TYPES = ["reel", "story", "post"]

def get_follower_bucket(count):
    if count is None:
        return "5K-10K"
    for low, high, label in FOLLOWER_BUCKETS:
        if low <= count < high:
            return label
    return "50K-100K" if count >= 100000 else "5K-10K"

def is_valid_niche(niche):
    return niche in NICHES
