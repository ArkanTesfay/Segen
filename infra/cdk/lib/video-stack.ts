import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { Construct } from 'constructs';

export interface SegenVideoStackProps extends cdk.StackProps {
  project: string;
  stage: string;
}

export class SegenVideoStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: SegenVideoStackProps) {
    super(scope, id, props);
    const { project, stage } = props;

    const masters = new s3.Bucket(this, 'Masters', {
      // Physical name assigned at deploy (avoids unresolved account token in name).
      versioned: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: stage === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: stage !== 'prod',
    });

    const hls = new s3.Bucket(this, 'Hls', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: stage === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: stage !== 'prod',
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.HEAD],
          allowedOrigins: ['http://localhost:3000'],
          allowedHeaders: ['*'],
          maxAge: 3600,
        },
      ],
    });

    const dist = new cloudfront.Distribution(this, 'HlsDistribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(hls),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        compress: true,
      },
      defaultRootObject: 'index.m3u8',
    });

    new cdk.CfnOutput(this, 'MastersBucket', { value: masters.bucketName });
    new cdk.CfnOutput(this, 'HlsBucket', { value: hls.bucketName });
    new cdk.CfnOutput(this, 'CloudFrontDomain', { value: dist.distributionDomainName });
    new cdk.CfnOutput(this, 'CloudFrontId', { value: dist.distributionId });
  }
}
