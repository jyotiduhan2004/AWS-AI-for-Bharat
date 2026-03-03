"""SearchStack — Amazon OpenSearch Serverless for vector search (experimental).

Feature-flagged: only deployed when `opensearch_enabled=true` is passed via CDK context.
SQL search (pgvector) remains the primary search path; OpenSearch is additive.
"""

import os
from constructs import Construct
import aws_cdk as cdk
import aws_cdk.aws_rds as rds
import aws_cdk.aws_lambda as _lambda
import aws_cdk.aws_secretsmanager as secretsmanager
import aws_cdk.aws_iam as iam
import aws_cdk.aws_opensearchserverless as oss


class SearchStack(cdk.Stack):
    """OpenSearch Serverless collection for vector search (experimental)."""

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        db_instance: rds.DatabaseInstance,
        db_secret: secretsmanager.ISecret,
        **kwargs,
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        lambdas_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "lambdas")
        layers_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "layers")

        # =====================================================================
        # OpenSearch Serverless Collection (VECTORSEARCH type)
        # =====================================================================

        # Encryption policy (required for serverless collections)
        encryption_policy = oss.CfnSecurityPolicy(
            self,
            "EncryptionPolicy",
            name="reachezy-enc-policy",
            type="encryption",
            policy='{"Rules":[{"ResourceType":"collection","Resource":["collection/reachezy-creators"]}],"AWSOwnedKey":true}',
        )

        # Network policy (allow public access for hackathon demo)
        network_policy = oss.CfnSecurityPolicy(
            self,
            "NetworkPolicy",
            name="reachezy-net-policy",
            type="network",
            policy='[{"Rules":[{"ResourceType":"collection","Resource":["collection/reachezy-creators"]},{"ResourceType":"dashboard","Resource":["collection/reachezy-creators"]}],"AllowFromPublic":true}]',
        )

        # Collection
        self._collection = oss.CfnCollection(
            self,
            "CreatorsCollection",
            name="reachezy-creators",
            type="VECTORSEARCH",
            description="Creator profile vectors for semantic similarity search",
        )
        self._collection.add_dependency(encryption_policy)
        self._collection.add_dependency(network_policy)

        # =====================================================================
        # OpenSearch Sync Lambda — indexes creator profiles after aggregation
        # =====================================================================

        shared_layer = _lambda.LayerVersion(
            self,
            "SharedDepsLayer",
            layer_version_name="reachezy-search-shared-deps",
            code=_lambda.Code.from_asset(os.path.join(layers_dir, "shared-deps")),
            compatible_runtimes=[_lambda.Runtime.PYTHON_3_12],
            description="Shared deps for OpenSearch sync Lambda",
        )

        sync_fn = _lambda.Function(
            self,
            "OpenSearchSyncFn",
            function_name="reachezy-opensearch-sync",
            runtime=_lambda.Runtime.PYTHON_3_12,
            handler="handler.handler",
            code=_lambda.Code.from_asset(os.path.join(lambdas_dir, "opensearch_sync")),
            layers=[shared_layer],
            memory_size=256,
            timeout=cdk.Duration.seconds(60),
            environment={
                "DB_HOST": db_instance.db_instance_endpoint_address,
                "DB_NAME": "reachezy",
                "DB_SECRET_ARN": db_secret.secret_arn,
                "OPENSEARCH_ENDPOINT": self._collection.attr_collection_endpoint,
                "OPENSEARCH_INDEX": "creator-profiles",
            },
        )
        db_secret.grant_read(sync_fn)

        # Grant AOSS data access
        sync_fn.add_to_role_policy(
            iam.PolicyStatement(
                effect=iam.Effect.ALLOW,
                actions=["aoss:APIAccessAll"],
                resources=[self._collection.attr_arn],
            )
        )

        # Data access policy
        oss.CfnAccessPolicy(
            self,
            "DataAccessPolicy",
            name="reachezy-data-access",
            type="data",
            policy=f'[{{"Rules":[{{"ResourceType":"index","Resource":["index/reachezy-creators/*"],"Permission":["aoss:*"]}},{{"ResourceType":"collection","Resource":["collection/reachezy-creators"],"Permission":["aoss:*"]}}],"Principal":["{sync_fn.role.role_arn}"]}}]',
        )

        # ---------- Outputs ----------
        cdk.CfnOutput(
            self,
            "CollectionEndpoint",
            value=self._collection.attr_collection_endpoint,
        )

    @property
    def collection(self) -> oss.CfnCollection:
        return self._collection

    @property
    def collection_endpoint(self) -> str:
        return self._collection.attr_collection_endpoint
