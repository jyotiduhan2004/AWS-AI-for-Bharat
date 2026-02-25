"""DatabaseStack — RDS PostgreSQL instance for ReachEzy."""

from constructs import Construct
import aws_cdk as cdk
import aws_cdk.aws_ec2 as ec2
import aws_cdk.aws_rds as rds


class DatabaseStack(cdk.Stack):
    """Creates a publicly-accessible RDS PostgreSQL 16 instance (hackathon config).

    Credentials are auto-generated and stored in Secrets Manager.
    """

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        vpc: ec2.Vpc,
        rds_security_group: ec2.SecurityGroup,
        **kwargs,
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # Auto-generated master credentials stored in Secrets Manager
        self._credentials = rds.DatabaseSecret(
            self,
            "ReachezyDbSecret",
            username="reachezy_admin",
            secret_name="reachezy/rds-credentials",
        )

        self._db_instance = rds.DatabaseInstance(
            self,
            "ReachezyDb",
            instance_identifier="reachezy-db",
            engine=rds.DatabaseInstanceEngine.postgres(
                version=rds.PostgresEngineVersion.VER_16,
            ),
            instance_type=ec2.InstanceType.of(
                ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.MICRO
            ),
            vpc=vpc,
            vpc_subnets=ec2.SubnetSelection(subnet_type=ec2.SubnetType.PUBLIC),
            security_groups=[rds_security_group],
            database_name="reachezy",
            credentials=rds.Credentials.from_secret(self._credentials),
            # HACKATHON ONLY — publicly accessible so local tools / seed scripts can reach it.
            # TODO: Set to False for production.
            publicly_accessible=True,
            multi_az=False,
            allocated_storage=20,
            max_allocated_storage=30,
            backup_retention=cdk.Duration.days(0),  # no backups for hackathon
            delete_automated_backups=True,
            removal_policy=cdk.RemovalPolicy.DESTROY,  # easy cleanup after hackathon
        )

        # ---------- CloudFormation Outputs ----------
        cdk.CfnOutput(self, "DbEndpoint", value=self._db_instance.db_instance_endpoint_address)
        cdk.CfnOutput(self, "DbSecretArn", value=self._credentials.secret_arn)

    # ---------- Exported properties ----------

    @property
    def db_instance(self) -> rds.DatabaseInstance:
        return self._db_instance

    @property
    def db_secret(self) -> rds.DatabaseSecret:
        return self._credentials

    @property
    def db_secret_arn(self) -> str:
        return self._credentials.secret_arn

    @property
    def db_endpoint(self) -> str:
        return self._db_instance.db_instance_endpoint_address
