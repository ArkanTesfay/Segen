import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

export interface SegenAuthStackProps extends cdk.StackProps {
  project: string;
  stage: string;
}

export class SegenAuthStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: SegenAuthStackProps) {
    super(scope, id, props);
    const { project, stage } = props;

    const pool = new cognito.UserPool(this, 'Users', {
      userPoolName: `${project}-users-${stage}`,
      signInAliases: { email: true },
      selfSignUpEnabled: true,
      autoVerify: { email: true },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireDigits: true,
        requireSymbols: false,
        requireUppercase: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: stage === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    const callbackUrls = this.node.tryGetContext('callbackUrls') ?? [
      'http://localhost:3000/api/auth/callback/cognito',
      'http://localhost:3000',
    ];
    const logoutUrls = this.node.tryGetContext('logoutUrls') ?? ['http://localhost:3000'];

    const webClient = pool.addClient('WebClient', {
      userPoolClientName: `${project}-web-${stage}`,
      generateSecret: false,
      authFlows: { userSrp: true, userPassword: true, custom: false, adminUserPassword: false },
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: [
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.PROFILE,
          cognito.OAuthScope.COGNITO_ADMIN,
        ],
        callbackUrls,
        logoutUrls,
      },
      refreshTokenValidity: cdk.Duration.days(30),
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
    });

    const domainPrefix = this.node.tryGetContext('domainPrefix') ?? `${project}-auth-${stage}`;
    const domain = pool.addDomain('HostedUiDomain', {
      cognitoDomain: { domainPrefix },
    });

    new cdk.CfnOutput(this, 'UserPoolId', { value: pool.userPoolId });
    new cdk.CfnOutput(this, 'WebClientId', { value: webClient.userPoolClientId });
    new cdk.CfnOutput(this, 'Issuer', {
      value: `https://cognito-idp.${this.region}.amazonaws.com/${pool.userPoolId}`,
    });
    new cdk.CfnOutput(this, 'HostedUiDomain', {
      value: `https://${domain.domainName}.auth.${this.region}.amazoncognito.com`,
    });
  }
}
