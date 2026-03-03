"""Shared Bedrock client helper — assumes cross-account role if BEDROCK_ROLE_ARN is set."""

import os
import boto3

_cached_client = None
_cached_region = None


def get_bedrock_client(region="us-east-1"):
    """Return a bedrock-runtime client, assuming cross-account role if configured.

    If BEDROCK_ROLE_ARN env var is set, uses STS to assume that role and
    creates the client with temporary credentials. Otherwise falls back to
    the Lambda's default credentials.

    The client is cached for the lifetime of the Lambda container (credentials
    last 1 hour, Lambda containers rarely live that long).
    """
    global _cached_client, _cached_region

    if _cached_client and _cached_region == region:
        return _cached_client

    role_arn = os.environ.get("BEDROCK_ROLE_ARN")
    if role_arn:
        print(f"Assuming cross-account role: {role_arn}")
        sts = boto3.client("sts")
        creds = sts.assume_role(
            RoleArn=role_arn,
            RoleSessionName="reachezy-bedrock",
        )["Credentials"]
        _cached_client = boto3.client(
            "bedrock-runtime",
            region_name=region,
            aws_access_key_id=creds["AccessKeyId"],
            aws_secret_access_key=creds["SecretAccessKey"],
            aws_session_token=creds["SessionToken"],
        )
    else:
        _cached_client = boto3.client("bedrock-runtime", region_name=region)

    _cached_region = region
    return _cached_client
