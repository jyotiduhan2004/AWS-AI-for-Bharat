"""PipelineStack — Step Functions state machine for the video-analysis pipeline."""

import os
from constructs import Construct
import aws_cdk as cdk
import aws_cdk.aws_ec2 as ec2
import aws_cdk.aws_s3 as s3
import aws_cdk.aws_rds as rds
import aws_cdk.aws_lambda as _lambda
import aws_cdk.aws_stepfunctions as sfn
import aws_cdk.aws_stepfunctions_tasks as sfn_tasks
import aws_cdk.aws_events as events
import aws_cdk.aws_events_targets as events_targets
import aws_cdk.aws_iam as iam
import aws_cdk.aws_secretsmanager as secretsmanager


class PipelineStack(cdk.Stack):
    """Video analysis pipeline orchestrated by Step Functions.

    Chain: frame_extractor -> video_analyzer -> embedding_generator -> profile_aggregator

    Triggered automatically when a new object is created in the videos S3 bucket
    (via EventBridge).
    """

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        vpc: ec2.Vpc,
        lambda_security_group: ec2.SecurityGroup,
        db_instance: rds.DatabaseInstance,
        db_secret: secretsmanager.ISecret,
        videos_bucket: s3.Bucket,
        frames_bucket: s3.Bucket,
        **kwargs,
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        lambdas_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "lambdas")
        layers_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "layers")

        # ----- Shared dependencies Lambda Layer -----
        shared_layer = _lambda.LayerVersion(
            self,
            "SharedDepsLayer",
            layer_version_name="reachezy-pipeline-shared-deps",
            code=_lambda.Code.from_asset(os.path.join(layers_dir, "shared-deps")),
            compatible_runtimes=[_lambda.Runtime.PYTHON_3_12],
            description="psycopg2-binary, requests, and shared modules for pipeline Lambdas",
        )

        # Common environment variables
        base_env = {
            "DB_HOST": db_instance.db_instance_endpoint_address,
            "DB_NAME": "reachezy",
            "DB_SECRET_ARN": db_secret.secret_arn,
            "FRAMES_BUCKET": frames_bucket.bucket_name,
        }

        # Shared VPC placement config
        vpc_props = {
            "vpc": vpc,
            "vpc_subnets": ec2.SubnetSelection(subnet_type=ec2.SubnetType.PUBLIC),
            "security_groups": [lambda_security_group],
            "allow_public_subnet": True,
        }

        # =====================================================================
        # Pipeline Lambda Functions
        # =====================================================================

        # ----- 1. Frame Extractor -----
        # NOTE: Attach an FFmpeg Lambda layer ARN after deployment.
        # You can use a public layer such as:
        #   arn:aws:lambda:us-east-1:175033217214:layer:ffmpeg:1
        # Add it via the console or by uncommenting the layers= parameter below.
        frame_extractor_fn = _lambda.Function(
            self,
            "FrameExtractorFn",
            function_name="reachezy-frame-extractor",
            runtime=_lambda.Runtime.PYTHON_3_12,
            handler="handler.handler",
            code=_lambda.Code.from_asset(os.path.join(lambdas_dir, "frame_extractor")),
            layers=[shared_layer],
            memory_size=512,
            timeout=cdk.Duration.seconds(120),
            environment={
                **base_env,
                "VIDEOS_BUCKET": videos_bucket.bucket_name,
            },
            # layers=[
            #     _lambda.LayerVersion.from_layer_version_arn(
            #         self, "FfmpegLayer",
            #         "arn:aws:lambda:us-east-1:ACCOUNT:layer:ffmpeg:VERSION"
            #     )
            # ],
            **vpc_props,
        )
        db_secret.grant_read(frame_extractor_fn)
        videos_bucket.grant_read(frame_extractor_fn)
        frames_bucket.grant_read_write(frame_extractor_fn)

        # ----- 2. Video Analyzer (Claude via Bedrock) -----
        video_analyzer_fn = _lambda.Function(
            self,
            "VideoAnalyzerFn",
            function_name="reachezy-video-analyzer",
            runtime=_lambda.Runtime.PYTHON_3_12,
            handler="handler.handler",
            code=_lambda.Code.from_asset(os.path.join(lambdas_dir, "video_analyzer")),
            layers=[shared_layer],
            memory_size=1024,
            timeout=cdk.Duration.seconds(180),  # Claude calls can be slow
            environment={
                **base_env,
                "BEDROCK_REGION": "us-east-1",
            },
            **vpc_props,
        )
        db_secret.grant_read(video_analyzer_fn)
        frames_bucket.grant_read(video_analyzer_fn)
        # Grant Bedrock InvokeModel permission
        video_analyzer_fn.add_to_role_policy(
            iam.PolicyStatement(
                effect=iam.Effect.ALLOW,
                actions=["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
                resources=["*"],  # Bedrock model ARNs vary; scope down if needed
            )
        )

        # ----- 3. Embedding Generator (Bedrock Titan Embeddings) -----
        embedding_generator_fn = _lambda.Function(
            self,
            "EmbeddingGeneratorFn",
            function_name="reachezy-embedding-generator",
            runtime=_lambda.Runtime.PYTHON_3_12,
            handler="handler.handler",
            code=_lambda.Code.from_asset(os.path.join(lambdas_dir, "embedding_generator")),
            layers=[shared_layer],
            memory_size=256,
            timeout=cdk.Duration.seconds(60),
            environment={
                **base_env,
                "BEDROCK_REGION": "us-east-1",
            },
            **vpc_props,
        )
        db_secret.grant_read(embedding_generator_fn)
        # Grant Bedrock InvokeModel permission
        embedding_generator_fn.add_to_role_policy(
            iam.PolicyStatement(
                effect=iam.Effect.ALLOW,
                actions=["bedrock:InvokeModel"],
                resources=["*"],
            )
        )

        # ----- 4. Profile Aggregator -----
        profile_aggregator_fn = _lambda.Function(
            self,
            "ProfileAggregatorFn",
            function_name="reachezy-profile-aggregator",
            runtime=_lambda.Runtime.PYTHON_3_12,
            handler="handler.handler",
            code=_lambda.Code.from_asset(os.path.join(lambdas_dir, "profile_aggregator")),
            layers=[shared_layer],
            memory_size=256,
            timeout=cdk.Duration.seconds(60),
            environment={**base_env},
            **vpc_props,
        )
        db_secret.grant_read(profile_aggregator_fn)

        # =====================================================================
        # Step Functions State Machine
        # =====================================================================

        # Retry configuration shared across all steps
        retry_config = {
            "errors": ["States.ALL"],
            "interval": cdk.Duration.seconds(5),
            "max_attempts": 3,
            "backoff_rate": 2.0,
        }

        # Step 1 — Extract frames from uploaded video
        extract_task = sfn_tasks.LambdaInvoke(
            self,
            "ExtractFrames",
            lambda_function=frame_extractor_fn,
            result_path="$.extractResult",
            payload_response_only=True,
        )
        extract_task.add_retry(**retry_config)

        # Step 2 — Analyze video frames with Claude (Bedrock)
        analyze_task = sfn_tasks.LambdaInvoke(
            self,
            "AnalyzeVideo",
            lambda_function=video_analyzer_fn,
            result_path="$.analyzeResult",
            payload_response_only=True,
        )
        analyze_task.add_retry(**retry_config)

        # Step 3 — Generate embeddings for content tags / search
        embed_task = sfn_tasks.LambdaInvoke(
            self,
            "GenerateEmbeddings",
            lambda_function=embedding_generator_fn,
            result_path="$.embedResult",
            payload_response_only=True,
        )
        embed_task.add_retry(**retry_config)

        # Step 4 — Aggregate results into creator profile
        aggregate_task = sfn_tasks.LambdaInvoke(
            self,
            "AggregateProfile",
            lambda_function=profile_aggregator_fn,
            result_path="$.aggregateResult",
            payload_response_only=True,
        )
        aggregate_task.add_retry(**retry_config)

        # Chain: extract -> analyze -> embed -> aggregate
        chain = extract_task.next(analyze_task).next(embed_task).next(aggregate_task)

        self._state_machine = sfn.StateMachine(
            self,
            "VideoAnalysisPipeline",
            state_machine_name="reachezy-video-analysis",
            definition_body=sfn.DefinitionBody.from_chainable(chain),
            timeout=cdk.Duration.minutes(15),
            tracing_enabled=True,
        )

        # =====================================================================
        # EventBridge Rule: S3 Object Created -> Step Functions
        # =====================================================================
        # The videos bucket has event_bridge_enabled=True so S3 events go to
        # the default EventBridge bus automatically.

        rule = events.Rule(
            self,
            "VideoUploadRule",
            rule_name="reachezy-video-upload-trigger",
            description="Trigger video analysis pipeline when a new video is uploaded",
            event_pattern=events.EventPattern(
                source=["aws.s3"],
                detail_type=["Object Created"],
                detail={
                    "bucket": {"name": [videos_bucket.bucket_name]},
                },
            ),
        )

        # Input transformer: extract creator_id and video key from S3 event
        rule.add_target(
            events_targets.SfnStateMachine(
                self._state_machine,
                input=events.RuleTargetInput.from_object(
                    {
                        "bucket": events.EventField.from_path("$.detail.bucket.name"),
                        "key": events.EventField.from_path("$.detail.object.key"),
                        "size": events.EventField.from_path("$.detail.object.size"),
                        "region": events.EventField.from_path("$.region"),
                        "time": events.EventField.from_path("$.time"),
                    }
                ),
            )
        )

        # ---------- CloudFormation Outputs ----------
        cdk.CfnOutput(
            self, "StateMachineArn", value=self._state_machine.state_machine_arn
        )

    # ---------- Exported properties ----------

    @property
    def state_machine(self) -> sfn.StateMachine:
        return self._state_machine
