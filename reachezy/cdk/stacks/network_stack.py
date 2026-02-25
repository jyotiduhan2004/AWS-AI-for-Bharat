"""NetworkStack — VPC and Security Groups for ReachEzy."""

from constructs import Construct
import aws_cdk as cdk
import aws_cdk.aws_ec2 as ec2


class NetworkStack(cdk.Stack):
    """Creates a VPC with public subnets only (no NAT — cost saving for hackathon)
    and the security groups used by RDS and Lambda."""

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # ----- VPC (public subnets only, 2 AZs, no NAT gateway) -----
        self._vpc = ec2.Vpc(
            self,
            "ReachezyVpc",
            vpc_name="reachezy-vpc",
            max_azs=2,
            nat_gateways=0,  # no NAT — keeps cost at $0 for hackathon
            subnet_configuration=[
                ec2.SubnetConfiguration(
                    name="Public",
                    subnet_type=ec2.SubnetType.PUBLIC,
                    cidr_mask=24,
                )
            ],
        )

        # ----- Security Group for Lambda functions -----
        self._lambda_sg = ec2.SecurityGroup(
            self,
            "LambdaSg",
            vpc=self._vpc,
            security_group_name="reachezy-lambda-sg",
            description="Security group for ReachEzy Lambda functions",
            allow_all_outbound=True,  # Lambdas need outbound for Secrets Manager, S3, Bedrock, etc.
        )

        # ----- Security Group for RDS -----
        self._rds_sg = ec2.SecurityGroup(
            self,
            "RdsSg",
            vpc=self._vpc,
            security_group_name="reachezy-rds-sg",
            description="Security group for ReachEzy RDS PostgreSQL",
            allow_all_outbound=False,
        )

        # Allow inbound PostgreSQL (5432) from the Lambda security group
        self._rds_sg.add_ingress_rule(
            peer=self._lambda_sg,
            connection=ec2.Port.tcp(5432),
            description="Allow PostgreSQL access from Lambda functions",
        )

        # HACKATHON ONLY — allow inbound 5432 from anywhere so you can connect
        # from your local machine for debugging / seed scripts.
        # TODO: Remove this rule before going to production!
        self._rds_sg.add_ingress_rule(
            peer=ec2.Peer.any_ipv4(),
            connection=ec2.Port.tcp(5432),
            description="HACKATHON ONLY — allow Postgres from anywhere. Lock down for prod!",
        )

    # ---------- Exported properties ----------

    @property
    def vpc(self) -> ec2.Vpc:
        return self._vpc

    @property
    def rds_security_group(self) -> ec2.SecurityGroup:
        return self._rds_sg

    @property
    def lambda_security_group(self) -> ec2.SecurityGroup:
        return self._lambda_sg
