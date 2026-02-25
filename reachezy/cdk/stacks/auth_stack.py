"""AuthStack — Cognito User Pool for ReachEzy authentication."""

from constructs import Construct
import aws_cdk as cdk
import aws_cdk.aws_cognito as cognito


class AuthStack(cdk.Stack):
    """Creates a Cognito User Pool with self-signup and OAuth authorization-code flow.

    NOTE: Instagram / Facebook identity provider federation is NOT configured here.
    CDK federation with Facebook is fragile and often requires manual console steps.
    After deployment, configure the Facebook identity provider manually:
      1. Go to Cognito console -> User Pool -> Sign-in experience -> Federated sign-in
      2. Add Facebook as an identity provider with your FB App ID & Secret
      3. Map Facebook attributes (email, name) to Cognito attributes
      4. Enable the provider on the User Pool App Client
    """

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # ----- User Pool -----
        self._user_pool = cognito.UserPool(
            self,
            "ReachezyUserPool",
            user_pool_name="ReachezyUserPool",
            self_sign_up_enabled=True,
            sign_in_aliases=cognito.SignInAliases(email=True),
            auto_verify=cognito.AutoVerifiedAttrs(email=True),
            standard_attributes=cognito.StandardAttributes(
                email=cognito.StandardAttribute(required=True, mutable=True),
            ),
            password_policy=cognito.PasswordPolicy(
                min_length=8,
                require_lowercase=True,
                require_uppercase=False,
                require_digits=True,
                require_symbols=False,
            ),
            account_recovery=cognito.AccountRecovery.EMAIL_ONLY,
            removal_policy=cdk.RemovalPolicy.DESTROY,
        )

        # ----- User Pool Domain (hosted UI prefix) -----
        self._user_pool_domain = self._user_pool.add_domain(
            "ReachezyAuthDomain",
            cognito_domain=cognito.CognitoDomainOptions(
                domain_prefix="reachezy-auth",
            ),
        )

        # ----- User Pool App Client -----
        self._user_pool_client = self._user_pool.add_client(
            "ReachezyAppClient",
            user_pool_client_name="reachezy-web-client",
            generate_secret=False,  # SPA / public client — no secret
            auth_flows=cognito.AuthFlow(
                user_password=True,
                user_srp=True,
            ),
            o_auth=cognito.OAuthSettings(
                flows=cognito.OAuthFlows(
                    authorization_code_grant=True,
                ),
                scopes=[
                    cognito.OAuthScope.OPENID,
                    cognito.OAuthScope.PROFILE,
                    cognito.OAuthScope.EMAIL,
                ],
                callback_urls=["http://localhost:3000/auth/callback"],
                logout_urls=["http://localhost:3000"],
            ),
            supported_identity_providers=[
                cognito.UserPoolClientIdentityProvider.COGNITO,
                # Facebook provider will be added manually — see class docstring.
            ],
        )

        # ---------- CloudFormation Outputs ----------
        cdk.CfnOutput(self, "UserPoolId", value=self._user_pool.user_pool_id)
        cdk.CfnOutput(self, "UserPoolClientId", value=self._user_pool_client.user_pool_client_id)
        cdk.CfnOutput(
            self,
            "UserPoolDomainUrl",
            value=self._user_pool_domain.base_url(),
        )

    # ---------- Exported properties ----------

    @property
    def user_pool(self) -> cognito.UserPool:
        return self._user_pool

    @property
    def user_pool_client(self) -> cognito.UserPoolClient:
        return self._user_pool_client

    @property
    def user_pool_domain(self) -> cognito.UserPoolDomain:
        return self._user_pool_domain
