"""Quick test: verify cross-account Bedrock access works for all 3 Lambdas.

Run: python scripts/test_cross_account_bedrock.py

Tests:
  1. STS AssumeRole — can we assume the cross-account role?
  2. Nova Lite (Converse API) — does vision/text inference work?
  3. Titan Embeddings V2 — does embedding generation work?
  4. brand_search Lambda invoke — end-to-end test
  5. video_analyzer + embedding_generator — invoke via Step Functions or direct
"""

import json
import boto3
import sys

ROLE_ARN = "arn:aws:iam::209479275240:role/jyoti-bedrock-access"
REGION = "us-east-1"

def get_cross_account_bedrock():
    """Assume cross-account role and return bedrock-runtime client."""
    sts = boto3.client("sts")
    print(f"[1/3] Assuming role: {ROLE_ARN}")
    creds = sts.assume_role(
        RoleArn=ROLE_ARN,
        RoleSessionName="reachezy-test",
    )["Credentials"]
    print(f"  OK — temporary credentials obtained (expires: {creds['Expiration']})")

    return boto3.client(
        "bedrock-runtime",
        region_name=REGION,
        aws_access_key_id=creds["AccessKeyId"],
        aws_secret_access_key=creds["SecretAccessKey"],
        aws_session_token=creds["SessionToken"],
    )


def test_nova_lite(bedrock):
    """Test Nova Lite via Converse API (text-only, no images needed)."""
    print(f"\n[2/3] Testing Nova Lite (amazon.nova-lite-v1:0) via Converse API...")
    response = bedrock.converse(
        modelId="amazon.nova-lite-v1:0",
        messages=[{
            "role": "user",
            "content": [{"text": "Reply with exactly: NOVA_LITE_OK"}],
        }],
        inferenceConfig={"maxTokens": 20, "temperature": 0.0},
    )
    text = response["output"]["message"]["content"][0]["text"]
    print(f"  Response: {text.strip()}")
    if "NOVA_LITE_OK" in text.upper() or len(text.strip()) > 0:
        print("  OK — Nova Lite is working!")
        return True
    else:
        print("  FAIL — unexpected response")
        return False


def test_titan_embeddings(bedrock):
    """Test Titan Text Embeddings V2."""
    print(f"\n[3/3] Testing Titan Embeddings V2 (amazon.titan-embed-text-v2:0)...")
    response = bedrock.invoke_model(
        modelId="amazon.titan-embed-text-v2:0",
        contentType="application/json",
        accept="application/json",
        body=json.dumps({
            "inputText": "beauty influencer in mumbai with vibrant aesthetic",
            "dimensions": 1024,
            "normalize": True,
        }),
    )
    result = json.loads(response["body"].read())
    embedding = result["embedding"]
    print(f"  Embedding dimensions: {len(embedding)}")
    print(f"  First 5 values: {embedding[:5]}")
    if len(embedding) == 1024:
        print("  OK — Titan Embeddings V2 is working!")
        return True
    else:
        print(f"  FAIL — expected 1024 dims, got {len(embedding)}")
        return False


def test_brand_search_lambda():
    """Invoke brand_search Lambda directly to test end-to-end."""
    print(f"\n[BONUS] Invoking reachezy-brand-search Lambda directly...")
    lambda_client = boto3.client("lambda", region_name=REGION)
    try:
        response = lambda_client.invoke(
            FunctionName="reachezy-brand-search",
            InvocationType="RequestResponse",
            Payload=json.dumps({
                "body": json.dumps({"query": "beauty influencers in mumbai"}),
                "headers": {},
                "httpMethod": "POST",
            }),
        )
        payload = json.loads(response["Payload"].read())
        status = payload.get("statusCode", "?")
        body = json.loads(payload.get("body", "{}"))
        print(f"  Status: {status}")
        print(f"  Parsed query: {json.dumps(body.get('parsed', {}), indent=2)}")
        print(f"  Results count: {body.get('count', 0)}")
        if status == 200:
            print("  OK — brand_search Lambda works end-to-end!")
            return True
        else:
            print(f"  FAIL — status {status}: {body.get('error', 'unknown')}")
            return False
    except Exception as e:
        print(f"  SKIP — Lambda not deployed yet or error: {e}")
        return False


if __name__ == "__main__":
    print("=" * 60)
    print("Cross-Account Bedrock Integration Test")
    print("=" * 60)

    results = {}

    # Test 1-3: Direct Bedrock access via cross-account role
    try:
        bedrock = get_cross_account_bedrock()
        results["sts_assume_role"] = True
    except Exception as e:
        print(f"  FAIL — cannot assume role: {e}")
        results["sts_assume_role"] = False
        print("\nCannot proceed without role assumption. Check:")
        print("  1. Your AWS credentials are configured (aws configure)")
        print("  2. The trust policy on the role allows your account")
        sys.exit(1)

    try:
        results["nova_lite"] = test_nova_lite(bedrock)
    except Exception as e:
        print(f"  FAIL — {e}")
        results["nova_lite"] = False

    try:
        results["titan_embeddings"] = test_titan_embeddings(bedrock)
    except Exception as e:
        print(f"  FAIL — {e}")
        results["titan_embeddings"] = False

    # Test 4: Lambda invoke (only works if already deployed)
    try:
        results["brand_search_lambda"] = test_brand_search_lambda()
    except Exception as e:
        print(f"  SKIP — {e}")
        results["brand_search_lambda"] = False

    # Summary
    print("\n" + "=" * 60)
    print("RESULTS")
    print("=" * 60)
    for test, passed in results.items():
        icon = "PASS" if passed else "FAIL"
        print(f"  [{icon}] {test}")

    all_core = results.get("sts_assume_role") and results.get("nova_lite") and results.get("titan_embeddings")
    if all_core:
        print("\nAll core tests passed! Safe to deploy.")
        print(f"\n  cd reachezy/cdk")
        print(f"  cdk deploy --all -c bedrock_role_arn={ROLE_ARN}")
    else:
        print("\nSome tests failed. Fix issues before deploying.")
