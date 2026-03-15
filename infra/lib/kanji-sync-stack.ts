import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';
import * as path from 'path';

export class KanjiSyncStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // --- DynamoDB ---

    const savesTable = new dynamodb.Table(this, 'KanjiSaves', {
      tableName: 'KanjiSaves',
      partitionKey: { name: 'deviceId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const transfersTable = new dynamodb.Table(this, 'KanjiTransfers', {
      tableName: 'KanjiTransfers',
      partitionKey: { name: 'code', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // --- Lambda ---

    const handler = new lambda.Function(this, 'KanjiSyncHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '..', 'lambda')),
      memorySize: 128,
      timeout: cdk.Duration.seconds(10),
      environment: {
        SAVES_TABLE: savesTable.tableName,
        TRANSFERS_TABLE: transfersTable.tableName,
      },
    });

    savesTable.grantReadWriteData(handler);
    transfersTable.grantReadWriteData(handler);

    // --- API Gateway ---

    const api = new apigateway.RestApi(this, 'KanjiSyncApi', {
      restApiName: 'KanjiSyncApi',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type'],
      },
      deployOptions: {
        throttlingBurstLimit: 10,
        throttlingRateLimit: 10,
      },
    });

    const lambdaIntegration = new apigateway.LambdaIntegration(handler);

    const apiResource = api.root.addResource('api');

    // POST /api/save
    const saveResource = apiResource.addResource('save');
    saveResource.addMethod('POST', lambdaIntegration);

    // GET /api/save/{deviceId}
    const saveDeviceResource = saveResource.addResource('{deviceId}');
    saveDeviceResource.addMethod('GET', lambdaIntegration);

    // POST /api/transfer/generate
    const transferResource = apiResource.addResource('transfer');
    const generateResource = transferResource.addResource('generate');
    generateResource.addMethod('POST', lambdaIntegration);

    // POST /api/transfer/redeem
    const redeemResource = transferResource.addResource('redeem');
    redeemResource.addMethod('POST', lambdaIntegration);

    // --- Output ---

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway endpoint URL',
    });
  }
}
