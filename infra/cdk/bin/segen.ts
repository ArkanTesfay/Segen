import * as cdk from 'aws-cdk-lib';
import { SegenAuthStack } from '../lib/auth-stack';
import { SegenVideoStack } from '../lib/video-stack';

const app = new cdk.App();

const env: cdk.Environment = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION ?? process.env.AWS_REGION ?? 'us-east-1',
};

const project = app.node.tryGetContext('project') ?? 'segen';
const stage = app.node.tryGetContext('stage') ?? 'dev';

new SegenAuthStack(app, 'SegenAuth', {
  env,
  project,
  stage,
  description: 'SEGEN Cognito user pool + web client (replaces terraform)',
});

new SegenVideoStack(app, 'SegenVideo', {
  env,
  project,
  stage,
  description: 'SEGEN S3 masters + HLS + CloudFront (MediaConvert wired in Phase 4)',
});
