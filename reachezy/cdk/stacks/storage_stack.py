"""StorageStack — S3 buckets for ReachEzy (videos, frames, media-kits)."""

from constructs import Construct
import aws_cdk as cdk
import aws_cdk.aws_s3 as s3


class StorageStack(cdk.Stack):
    """Creates three S3 buckets with account-ID suffix for global uniqueness.

    - reachezy-videos   — creator video uploads (CORS + EventBridge enabled)
    - reachezy-frames   — extracted video frames
    - reachezy-mediakits — generated PDF media-kits
    """

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        account_suffix = cdk.Aws.ACCOUNT_ID

        # ----- Videos bucket -----
        self._videos_bucket = s3.Bucket(
            self,
            "VideosBucket",
            bucket_name=f"reachezy-videos-{account_suffix}",
            removal_policy=cdk.RemovalPolicy.DESTROY,
            auto_delete_objects=True,
            event_bridge_enabled=True,  # needed for Step Functions trigger
            cors=[
                s3.CorsRule(
                    allowed_methods=[
                        s3.HttpMethods.PUT,
                        s3.HttpMethods.GET,
                    ],
                    allowed_origins=["*"],  # HACKATHON — restrict in prod
                    allowed_headers=["*"],
                    max_age=3600,
                )
            ],
        )

        # ----- Frames bucket -----
        self._frames_bucket = s3.Bucket(
            self,
            "FramesBucket",
            bucket_name=f"reachezy-frames-{account_suffix}",
            removal_policy=cdk.RemovalPolicy.DESTROY,
            auto_delete_objects=True,
        )

        # ----- Media-kits bucket -----
        self._mediakits_bucket = s3.Bucket(
            self,
            "MediakitsBucket",
            bucket_name=f"reachezy-mediakits-{account_suffix}",
            removal_policy=cdk.RemovalPolicy.DESTROY,
            auto_delete_objects=True,
        )

        # ---------- CloudFormation Outputs ----------
        cdk.CfnOutput(self, "VideosBucketName", value=self._videos_bucket.bucket_name)
        cdk.CfnOutput(self, "FramesBucketName", value=self._frames_bucket.bucket_name)
        cdk.CfnOutput(self, "MediakitsBucketName", value=self._mediakits_bucket.bucket_name)

    # ---------- Exported properties ----------

    @property
    def videos_bucket(self) -> s3.Bucket:
        return self._videos_bucket

    @property
    def frames_bucket(self) -> s3.Bucket:
        return self._frames_bucket

    @property
    def mediakits_bucket(self) -> s3.Bucket:
        return self._mediakits_bucket
