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
import aws_cdk.aws_bedrock as bedrock
import aws_cdk.aws_cloudwatch as cloudwatch
import aws_cdk.aws_cloudwatch_actions as cw_actions
import aws_cdk.aws_sns as sns


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

        # =====================================================================
        # Bedrock Guardrail — Responsible AI content filtering
        # =====================================================================
        guardrail = bedrock.CfnGuardrail(
            self,
            "ContentSafetyGuardrail",
            name="reachezy-content-safety",
            description="Filters violent, hateful, sexual, and harmful content from video analysis",
            blocked_input_messaging="This content has been blocked by our content safety policy.",
            blocked_outputs_messaging="The generated output has been blocked by our content safety policy.",
            content_policy_config=bedrock.CfnGuardrail.ContentPolicyConfigProperty(
                filters_config=[
                    bedrock.CfnGuardrail.ContentFilterConfigProperty(
                        type="SEXUAL",
                        input_strength="HIGH",
                        output_strength="HIGH",
                    ),
                    bedrock.CfnGuardrail.ContentFilterConfigProperty(
                        type="VIOLENCE",
                        input_strength="HIGH",
                        output_strength="HIGH",
                    ),
                    bedrock.CfnGuardrail.ContentFilterConfigProperty(
                        type="HATE",
                        input_strength="HIGH",
                        output_strength="HIGH",
                    ),
                    bedrock.CfnGuardrail.ContentFilterConfigProperty(
                        type="INSULTS",
                        input_strength="HIGH",
                        output_strength="HIGH",
                    ),
                    bedrock.CfnGuardrail.ContentFilterConfigProperty(
                        type="MISCONDUCT",
                        input_strength="HIGH",
                        output_strength="HIGH",
                    ),
                    bedrock.CfnGuardrail.ContentFilterConfigProperty(
                        type="PROMPT_ATTACK",
                        input_strength="HIGH",
                        output_strength="NONE",
                    ),
                ],
            ),
        )

        # ----- Shared dependencies Lambda Layer -----
        shared_layer = _lambda.LayerVersion(
            self,
            "SharedDepsLayer",
            layer_version_name="reachezy-pipeline-shared-deps",
            code=_lambda.Code.from_asset(os.path.join(layers_dir, "shared-deps")),
            compatible_runtimes=[_lambda.Runtime.PYTHON_3_12],
            description="psycopg2-binary, requests, and shared modules for pipeline Lambdas",
        )

        # AI provider config: "bedrock" (default) or "groq" (testing fallback)
        ai_provider = self.node.try_get_context("ai_provider") or "bedrock"
        groq_api_key = self.node.try_get_context("groq_api_key") or ""

        # Common environment variables
        base_env = {
            "DB_HOST": db_instance.db_instance_endpoint_address,
            "DB_NAME": "reachezy",
            "DB_SECRET_ARN": db_secret.secret_arn,
            "FRAMES_BUCKET": frames_bucket.bucket_name,
            "GUARDRAIL_ID": guardrail.attr_guardrail_id,
            "GUARDRAIL_VERSION": "DRAFT",
            "AI_PROVIDER": ai_provider,
            "GROQ_API_KEY": groq_api_key,
        }

        # NOTE: Lambdas run outside VPC for hackathon.
        # RDS is publicly accessible, so Lambdas reach it via public endpoint.

        # =====================================================================
        # Pipeline Lambda Functions
        # =====================================================================

        # ----- 1. Frame Extractor -----
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
            tracing=_lambda.Tracing.ACTIVE,
            environment={
                **base_env,
                "VIDEOS_BUCKET": videos_bucket.bucket_name,
            },
        )
        db_secret.grant_read(frame_extractor_fn)
        videos_bucket.grant_read(frame_extractor_fn)
        frames_bucket.grant_read_write(frame_extractor_fn)

        # ----- 2. Video Analyzer (Amazon Nova Lite via Bedrock + Guardrails) -----
        video_analyzer_fn = _lambda.Function(
            self,
            "VideoAnalyzerFn",
            function_name="reachezy-video-analyzer",
            runtime=_lambda.Runtime.PYTHON_3_12,
            handler="handler.handler",
            code=_lambda.Code.from_asset(os.path.join(lambdas_dir, "video_analyzer")),
            layers=[shared_layer],
            memory_size=1024,
            timeout=cdk.Duration.seconds(180),
            tracing=_lambda.Tracing.ACTIVE,
            environment={
                **base_env,
                "BEDROCK_REGION": "us-east-1",
            },
        )
        db_secret.grant_read(video_analyzer_fn)
        frames_bucket.grant_read(video_analyzer_fn)
        # Grant Bedrock InvokeModel permission
        video_analyzer_fn.add_to_role_policy(
            iam.PolicyStatement(
                effect=iam.Effect.ALLOW,
                actions=["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
                resources=["*"],
            )
        )
        # Grant Bedrock Guardrail permission
        video_analyzer_fn.add_to_role_policy(
            iam.PolicyStatement(
                effect=iam.Effect.ALLOW,
                actions=["bedrock:ApplyGuardrail"],
                resources=[guardrail.attr_guardrail_arn],
            )
        )

        # ----- 3. Embedding Generator (Amazon Titan Text Embeddings V2 via Bedrock) -----
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
            tracing=_lambda.Tracing.ACTIVE,
            environment={
                **base_env,
                "BEDROCK_REGION": "us-east-1",
            },
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
            tracing=_lambda.Tracing.ACTIVE,
            environment={**base_env},
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

        # Step 2 — Analyze video frames with Amazon Nova Lite (Bedrock + Guardrails)
        analyze_task = sfn_tasks.LambdaInvoke(
            self,
            "AnalyzeVideo",
            lambda_function=video_analyzer_fn,
            result_path="$.analyzeResult",
            payload_response_only=True,
        )
        analyze_task.add_retry(**retry_config)

        # Step 3 — Generate embeddings with Amazon Titan Embeddings V2 (Bedrock)
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

        # =====================================================================
        # CloudWatch Dashboard — Pipeline Observability
        # =====================================================================
        dashboard = cloudwatch.Dashboard(
            self,
            "PipelineDashboard",
            dashboard_name="reachezy-pipeline-dashboard",
        )

        # Widget 1: Step Functions execution success/failure count
        dashboard.add_widgets(
            cloudwatch.GraphWidget(
                title="Step Functions Executions",
                width=24,
                left=[
                    self._state_machine.metric_succeeded(
                        statistic="Sum", period=cdk.Duration.minutes(5)
                    ),
                    self._state_machine.metric_failed(
                        statistic="Sum", period=cdk.Duration.minutes(5)
                    ),
                    self._state_machine.metric_started(
                        statistic="Sum", period=cdk.Duration.minutes(5)
                    ),
                ],
            )
        )

        # Widget 2: Lambda duration and errors by function
        lambda_fns = [
            ("FrameExtractor", frame_extractor_fn),
            ("VideoAnalyzer", video_analyzer_fn),
            ("EmbeddingGenerator", embedding_generator_fn),
            ("ProfileAggregator", profile_aggregator_fn),
        ]
        dashboard.add_widgets(
            cloudwatch.GraphWidget(
                title="Lambda Duration (ms)",
                width=12,
                left=[
                    fn.metric_duration(statistic="Average", period=cdk.Duration.minutes(5))
                    for label, fn in lambda_fns
                ],
            ),
            cloudwatch.GraphWidget(
                title="Lambda Errors",
                width=12,
                left=[
                    fn.metric_errors(statistic="Sum", period=cdk.Duration.minutes(5))
                    for label, fn in lambda_fns
                ],
            ),
        )

        # Widget 3: Lambda invocations overview
        dashboard.add_widgets(
            cloudwatch.GraphWidget(
                title="Lambda Invocations",
                width=24,
                left=[
                    fn.metric_invocations(statistic="Sum", period=cdk.Duration.minutes(5))
                    for label, fn in lambda_fns
                ],
            )
        )

        # =====================================================================
        # CloudWatch Alarm — Alert on Step Functions execution failure
        # =====================================================================
        alarm_topic = sns.Topic(
            self,
            "PipelineAlarmTopic",
            topic_name="reachezy-pipeline-alarms",
            display_name="ReachEzy Pipeline Failure Alerts",
        )

        sfn_failure_alarm = cloudwatch.Alarm(
            self,
            "SfnFailureAlarm",
            alarm_name="reachezy-sfn-execution-failure",
            alarm_description="Alarm when Step Functions video analysis pipeline execution fails",
            metric=self._state_machine.metric_failed(
                statistic="Sum", period=cdk.Duration.minutes(5)
            ),
            threshold=1,
            evaluation_periods=1,
            comparison_operator=cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            treat_missing_data=cloudwatch.TreatMissingData.NOT_BREACHING,
        )
        sfn_failure_alarm.add_alarm_action(cw_actions.SnsAction(alarm_topic))

        # ---------- CloudFormation Outputs ----------
        cdk.CfnOutput(
            self, "StateMachineArn", value=self._state_machine.state_machine_arn
        )
        cdk.CfnOutput(
            self, "GuardrailId", value=guardrail.attr_guardrail_id
        )
        cdk.CfnOutput(
            self, "DashboardName", value=dashboard.dashboard_name
        )

    # ---------- Exported properties ----------

    @property
    def state_machine(self) -> sfn.StateMachine:
        return self._state_machine
