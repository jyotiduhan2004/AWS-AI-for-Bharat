#!/usr/bin/env python3
"""ReachEzy CDK App — entry point that instantiates all stacks."""

import aws_cdk as cdk

from stacks.network_stack import NetworkStack
from stacks.database_stack import DatabaseStack
from stacks.storage_stack import StorageStack
from stacks.auth_stack import AuthStack
from stacks.api_stack import ApiStack
from stacks.pipeline_stack import PipelineStack

app = cdk.App()

env = cdk.Environment(region="us-east-1")

# ---------- 1. Networking (VPC + Security Groups) ----------
network = NetworkStack(app, "Reachezy-Network", env=env)

# ---------- 2. Database (RDS PostgreSQL) ----------
database = DatabaseStack(
    app,
    "Reachezy-Database",
    vpc=network.vpc,
    rds_security_group=network.rds_security_group,
    env=env,
)

# ---------- 3. Storage (S3 Buckets) ----------
storage = StorageStack(app, "Reachezy-Storage", env=env)

# ---------- 4. Auth (Cognito User Pool) ----------
auth = AuthStack(app, "Reachezy-Auth", env=env)

# ---------- 5. API (API Gateway + Lambda functions) ----------
api = ApiStack(
    app,
    "Reachezy-Api",
    vpc=network.vpc,
    lambda_security_group=network.lambda_security_group,
    db_instance=database.db_instance,
    db_secret=database.db_secret,
    videos_bucket=storage.videos_bucket,
    frames_bucket=storage.frames_bucket,
    mediakits_bucket=storage.mediakits_bucket,
    user_pool=auth.user_pool,
    env=env,
)

# ---------- 6. Pipeline (Step Functions + EventBridge) ----------
pipeline = PipelineStack(
    app,
    "Reachezy-Pipeline",
    vpc=network.vpc,
    lambda_security_group=network.lambda_security_group,
    db_instance=database.db_instance,
    db_secret=database.db_secret,
    videos_bucket=storage.videos_bucket,
    frames_bucket=storage.frames_bucket,
    env=env,
)

app.synth()
