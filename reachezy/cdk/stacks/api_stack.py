"""ApiStack — API Gateway + Lambda functions for all ReachEzy REST endpoints."""

import os
from constructs import Construct
import aws_cdk as cdk
import aws_cdk.aws_ec2 as ec2
import aws_cdk.aws_s3 as s3
import aws_cdk.aws_rds as rds
import aws_cdk.aws_cognito as cognito
import aws_cdk.aws_lambda as _lambda
import aws_cdk.aws_apigateway as apigw
import aws_cdk.aws_secretsmanager as secretsmanager
import aws_cdk.aws_iam as iam


class ApiStack(cdk.Stack):
    """REST API Gateway with Cognito authorizer and per-endpoint Lambda functions."""

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        vpc: ec2.Vpc,  # kept for interface compatibility
        lambda_security_group: ec2.SecurityGroup,  # kept for interface compatibility
        db_instance: rds.DatabaseInstance,
        db_secret: secretsmanager.ISecret,
        videos_bucket: s3.Bucket,
        frames_bucket: s3.Bucket,
        mediakits_bucket: s3.Bucket,
        user_pool: cognito.UserPool,
        **kwargs,
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # ----- Facebook App Secret (stored in Secrets Manager) -----
        # Pass via: cdk deploy -c fb_app_secret=YOUR_SECRET
        fb_app_secret = self.node.try_get_context("fb_app_secret")
        if fb_app_secret:
            fb_secret = secretsmanager.Secret(
                self,
                "FbAppSecret",
                secret_name="reachezy/fb-app-secret",
                description="Meta/Facebook App Secret for ReachEzy Instagram OAuth",
                secret_string_value=cdk.SecretValue.unsafe_plain_text(fb_app_secret),
            )
        else:
            fb_secret = secretsmanager.Secret.from_secret_name_v2(
                self,
                "FbAppSecret",
                secret_name="reachezy/fb-app-secret",
            )

        # ----- Shared dependencies Lambda Layer (psycopg2, requests, shared modules) -----
        layers_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "layers")
        shared_layer = _lambda.LayerVersion(
            self,
            "SharedDepsLayer",
            layer_version_name="reachezy-shared-deps",
            code=_lambda.Code.from_asset(os.path.join(layers_dir, "shared-deps")),
            compatible_runtimes=[_lambda.Runtime.PYTHON_3_12],
            description="psycopg2-binary, requests, and shared modules for ReachEzy Lambdas",
        )

        # AI provider config: "bedrock" (default) or "groq" (testing fallback)
        ai_provider = self.node.try_get_context("ai_provider") or "bedrock"
        groq_api_key = self.node.try_get_context("groq_api_key") or ""

        # Common environment variables shared by most Lambdas
        db_env = {
            "DB_HOST": db_instance.db_instance_endpoint_address,
            "DB_NAME": "reachezy",
            "DB_SECRET_ARN": db_secret.secret_arn,
        }

        # Resolve the path to the lambdas directory (one level up from cdk/)
        lambdas_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "lambdas")

        # NOTE: Lambdas run outside VPC for hackathon.
        # RDS is publicly accessible, so Lambdas reach it via public endpoint.
        # This avoids the need for NAT gateway or VPC endpoints.

        # =====================================================================
        # Lambda Functions
        # =====================================================================

        # ----- 1. auth_callback — POST /auth/callback -----
        auth_callback_fn = _lambda.Function(
            self,
            "AuthCallbackFn",
            function_name="reachezy-auth-callback",
            runtime=_lambda.Runtime.PYTHON_3_12,
            handler="handler.handler",
            code=_lambda.Code.from_asset(os.path.join(lambdas_dir, "auth_callback")),
            layers=[shared_layer],
            memory_size=256,
            timeout=cdk.Duration.seconds(30),
            environment={
                **db_env,
                "FB_APP_ID": self.node.try_get_context("fb_app_id") or "REPLACE_WITH_YOUR_FB_APP_ID",
                "FB_APP_SECRET_ARN": fb_secret.secret_arn,
            },
        )
        db_secret.grant_read(auth_callback_fn)
        fb_secret.grant_read(auth_callback_fn)

        # ----- 2. presign_upload — POST /upload/presign -----
        presign_upload_fn = _lambda.Function(
            self,
            "PresignUploadFn",
            function_name="reachezy-presign-upload",
            runtime=_lambda.Runtime.PYTHON_3_12,
            handler="handler.handler",
            code=_lambda.Code.from_asset(os.path.join(lambdas_dir, "presign_upload")),
            layers=[shared_layer],
            memory_size=256,
            timeout=cdk.Duration.seconds(10),
            environment={
                "VIDEOS_BUCKET": videos_bucket.bucket_name,
            },
        )
        videos_bucket.grant_put(presign_upload_fn)

        # ----- 3. creator_profile — GET/PUT /creator/profile -----
        creator_profile_fn = _lambda.Function(
            self,
            "CreatorProfileFn",
            function_name="reachezy-creator-profile",
            runtime=_lambda.Runtime.PYTHON_3_12,
            handler="handler.handler",
            code=_lambda.Code.from_asset(os.path.join(lambdas_dir, "creator_profile")),
            layers=[shared_layer],
            memory_size=256,
            timeout=cdk.Duration.seconds(10),
            environment={**db_env},
        )
        db_secret.grant_read(creator_profile_fn)

        # ----- 4. rate_benchmark — POST/GET /creator/rates -----
        rate_benchmark_fn = _lambda.Function(
            self,
            "RateBenchmarkFn",
            function_name="reachezy-rate-benchmark",
            runtime=_lambda.Runtime.PYTHON_3_12,
            handler="handler.handler",
            code=_lambda.Code.from_asset(os.path.join(lambdas_dir, "rate_benchmark")),
            layers=[shared_layer],
            memory_size=256,
            timeout=cdk.Duration.seconds(30),
            environment={**db_env},
        )
        db_secret.grant_read(rate_benchmark_fn)

        # ----- 5. mediakit_data — GET /creator/mediakit/{username} -----
        mediakit_data_fn = _lambda.Function(
            self,
            "MediakitDataFn",
            function_name="reachezy-mediakit-data",
            runtime=_lambda.Runtime.PYTHON_3_12,
            handler="handler.handler",
            code=_lambda.Code.from_asset(os.path.join(lambdas_dir, "mediakit_data")),
            layers=[shared_layer],
            memory_size=256,
            timeout=cdk.Duration.seconds(10),
            environment={
                **db_env,
                "FRAMES_BUCKET": frames_bucket.bucket_name,
            },
        )
        db_secret.grant_read(mediakit_data_fn)
        frames_bucket.grant_read(mediakit_data_fn)

        # ----- 6. mediakit_pdf — POST /creator/mediakit/pdf -----
        # NOTE: This Lambda needs a WeasyPrint layer for PDF generation.
        # Attach the layer ARN manually after deployment or via a context variable:
        #   cdk deploy -c weasyprint_layer_arn=arn:aws:lambda:us-east-1:...
        mediakit_pdf_fn = _lambda.Function(
            self,
            "MediakitPdfFn",
            function_name="reachezy-mediakit-pdf",
            runtime=_lambda.Runtime.PYTHON_3_12,
            handler="handler.handler",
            code=_lambda.Code.from_asset(os.path.join(lambdas_dir, "mediakit_pdf")),
            layers=[shared_layer],
            memory_size=512,
            timeout=cdk.Duration.seconds(60),
            environment={
                **db_env,
                "MEDIAKITS_BUCKET": mediakits_bucket.bucket_name,
            },
        )
        db_secret.grant_read(mediakit_pdf_fn)
        mediakits_bucket.grant_read_write(mediakit_pdf_fn)

        # ----- 7. user_auth — POST /auth/user -----
        user_auth_fn = _lambda.Function(
            self,
            "UserAuthFn",
            function_name="reachezy-user-auth",
            runtime=_lambda.Runtime.PYTHON_3_12,
            handler="handler.handler",
            code=_lambda.Code.from_asset(os.path.join(lambdas_dir, "user_auth")),
            layers=[shared_layer],
            memory_size=256,
            timeout=cdk.Duration.seconds(10),
            environment={**db_env},
        )
        db_secret.grant_read(user_auth_fn)

        # ----- 8. brand_search — POST /brand/search (Amazon Bedrock-powered) -----
        brand_search_fn = _lambda.Function(
            self,
            "BrandSearchFn",
            function_name="reachezy-brand-search",
            runtime=_lambda.Runtime.PYTHON_3_12,
            handler="handler.handler",
            code=_lambda.Code.from_asset(os.path.join(lambdas_dir, "brand_search")),
            layers=[shared_layer],
            memory_size=512,
            timeout=cdk.Duration.seconds(30),
            environment={
                **db_env,
                "BEDROCK_REGION": "us-east-1",
                "AI_PROVIDER": ai_provider,
                "GROQ_API_KEY": groq_api_key,
            },
        )
        db_secret.grant_read(brand_search_fn)
        # Grant Bedrock InvokeModel permission for Nova Lite query parsing
        brand_search_fn.add_to_role_policy(
            iam.PolicyStatement(
                effect=iam.Effect.ALLOW,
                actions=["bedrock:InvokeModel", "bedrock:ApplyGuardrail"],
                resources=["*"],
            )
        )

        # ----- 9. brand_wishlist — GET/POST/DELETE /brand/wishlist -----
        brand_wishlist_fn = _lambda.Function(
            self,
            "BrandWishlistFn",
            function_name="reachezy-brand-wishlist",
            runtime=_lambda.Runtime.PYTHON_3_12,
            handler="handler.handler",
            code=_lambda.Code.from_asset(os.path.join(lambdas_dir, "brand_wishlist")),
            layers=[shared_layer],
            memory_size=256,
            timeout=cdk.Duration.seconds(10),
            environment={**db_env},
        )
        db_secret.grant_read(brand_wishlist_fn)

        # =====================================================================
        # API Gateway
        # =====================================================================

        self._api = apigw.RestApi(
            self,
            "ReachezyApi",
            rest_api_name="ReachEzy API",
            description="REST API for the ReachEzy creator platform",
            deploy_options=apigw.StageOptions(stage_name="v1"),
            default_cors_preflight_options=apigw.CorsOptions(
                allow_origins=apigw.Cors.ALL_ORIGINS,
                allow_methods=apigw.Cors.ALL_METHODS,
                allow_headers=[
                    "Content-Type",
                    "Authorization",
                    "X-Amz-Date",
                    "X-Api-Key",
                    "X-Amz-Security-Token",
                ],
            ),
        )

        # Cognito authorizer for protected routes
        cognito_authorizer = apigw.CognitoUserPoolsAuthorizer(
            self,
            "ReachezyAuthorizer",
            cognito_user_pools=[user_pool],
            authorizer_name="ReachezyCognitoAuth",
        )

        # ---------- Route definitions ----------

        # POST /auth/callback (no auth — this is the OAuth callback)
        auth_resource = self._api.root.add_resource("auth")
        auth_callback_resource = auth_resource.add_resource("callback")
        auth_callback_resource.add_method(
            "POST",
            apigw.LambdaIntegration(auth_callback_fn),
            authorization_type=apigw.AuthorizationType.NONE,
        )

        # POST /upload/presign (Cognito auth)
        upload_resource = self._api.root.add_resource("upload")
        presign_resource = upload_resource.add_resource("presign")
        presign_resource.add_method(
            "POST",
            apigw.LambdaIntegration(presign_upload_fn),
            authorizer=cognito_authorizer,
            authorization_type=apigw.AuthorizationType.COGNITO,
        )

        # GET + PUT /creator/profile (Cognito auth)
        creator_resource = self._api.root.add_resource("creator")
        profile_resource = creator_resource.add_resource("profile")
        profile_resource.add_method(
            "GET",
            apigw.LambdaIntegration(creator_profile_fn),
            authorizer=cognito_authorizer,
            authorization_type=apigw.AuthorizationType.COGNITO,
        )
        profile_resource.add_method(
            "PUT",
            apigw.LambdaIntegration(creator_profile_fn),
            authorizer=cognito_authorizer,
            authorization_type=apigw.AuthorizationType.COGNITO,
        )

        # POST + GET /creator/rates (Cognito auth)
        rates_resource = creator_resource.add_resource("rates")
        rates_resource.add_method(
            "POST",
            apigw.LambdaIntegration(rate_benchmark_fn),
            authorizer=cognito_authorizer,
            authorization_type=apigw.AuthorizationType.COGNITO,
        )
        rates_resource.add_method(
            "GET",
            apigw.LambdaIntegration(rate_benchmark_fn),
            authorizer=cognito_authorizer,
            authorization_type=apigw.AuthorizationType.COGNITO,
        )

        # GET /creator/mediakit/{username} (no auth — public)
        mediakit_resource = creator_resource.add_resource("mediakit")
        mediakit_username = mediakit_resource.add_resource("{username}")
        mediakit_username.add_method(
            "GET",
            apigw.LambdaIntegration(mediakit_data_fn),
            authorization_type=apigw.AuthorizationType.NONE,
        )

        # POST /creator/mediakit/pdf (Cognito auth)
        mediakit_pdf_resource = mediakit_resource.add_resource("pdf")
        mediakit_pdf_resource.add_method(
            "POST",
            apigw.LambdaIntegration(mediakit_pdf_fn),
            authorizer=cognito_authorizer,
            authorization_type=apigw.AuthorizationType.COGNITO,
        )

        # POST /auth/user (no auth — handles signup/login internally)
        auth_user_resource = auth_resource.add_resource("user")
        auth_user_resource.add_method(
            "POST",
            apigw.LambdaIntegration(user_auth_fn),
            authorization_type=apigw.AuthorizationType.NONE,
        )

        # POST /brand/search (no API GW auth — custom token validation inside handler)
        brand_resource = self._api.root.add_resource("brand")
        brand_search_resource = brand_resource.add_resource("search")
        brand_search_resource.add_method(
            "POST",
            apigw.LambdaIntegration(brand_search_fn),
            authorization_type=apigw.AuthorizationType.NONE,
        )

        # GET/POST/DELETE /brand/wishlist (no API GW auth — custom token validation)
        brand_wishlist_resource = brand_resource.add_resource("wishlist")
        brand_wishlist_resource.add_method(
            "GET",
            apigw.LambdaIntegration(brand_wishlist_fn),
            authorization_type=apigw.AuthorizationType.NONE,
        )
        brand_wishlist_resource.add_method(
            "POST",
            apigw.LambdaIntegration(brand_wishlist_fn),
            authorization_type=apigw.AuthorizationType.NONE,
        )
        brand_wishlist_resource.add_method(
            "DELETE",
            apigw.LambdaIntegration(brand_wishlist_fn),
            authorization_type=apigw.AuthorizationType.NONE,
        )

        # ---------- CloudFormation Outputs ----------
        cdk.CfnOutput(self, "ApiUrl", value=self._api.url)

    # ---------- Exported properties ----------

    @property
    def api(self) -> apigw.RestApi:
        return self._api
