import { Cors, LambdaIntegration, RestApi } from '@aws-cdk/aws-apigateway';
import { AttributeType, Table } from '@aws-cdk/aws-dynamodb';
import { Code, Function, Runtime, Tracing } from '@aws-cdk/aws-lambda';
import { Bucket, IBucket } from '@aws-cdk/aws-s3';
import { App, Duration, RemovalPolicy, Stack, StackProps } from '@aws-cdk/core';


export class FridgeTrackStack extends Stack {
    constructor(scope: App, id: string, props?: StackProps) {
        super(scope, id, props);

        const productTable = new Table(this, 'ProductTable', {
            partitionKey: {name: 'id', type: AttributeType.STRING},
            removalPolicy: RemovalPolicy.DESTROY
        });

        // this is for mounting code when running with localstack
        const localBucket = Bucket.fromBucketName(this, 's3local', '__local__');

        const createProductFunction = new Function(this, 'CreateProductFunction', {
            runtime: Runtime.NODEJS_14_X,
            handler: 'app.handler',
            code: this.getLambdaCode(
                '/home/robbie/dev/fridge-track/lambdas/create-product',
                'lambdas/create-product',
                localBucket
            ),
            timeout: Duration.seconds(10),
            environment: {
                'PRODUCT_TABLE_NAME': productTable.tableName
            }
        });

        const listProductsFunction = new Function(this, 'ListProductsFunction', {
            runtime: Runtime.NODEJS_14_X,
            handler: 'app.handler',
            code: this.getLambdaCode(
                '/home/robbie/dev/fridge-track/lambdas/list-products',
                'lambdas/list-products',
                localBucket
            ),
            timeout: Duration.seconds(10),
            environment: {
                'PRODUCT_TABLE_NAME': productTable.tableName
            }
        });

        productTable.grantWriteData(createProductFunction);
        productTable.grantReadData(listProductsFunction);
        const createProductIntegration = new LambdaIntegration(createProductFunction);
        const listProductsIntegration = new LambdaIntegration(listProductsFunction);

        const api = new RestApi(this, 'FridgeTrackAPI', {
            restApiName: 'Fridge Track Service',
            endpointExportName: 'FridgeTrackAPIEndpoint',
            defaultCorsPreflightOptions: {
                allowOrigins: Cors.ALL_ORIGINS,
                allowMethods: Cors.ALL_METHODS
            },
        });

        const productsApiResource = api.root.addResource('products');
        productsApiResource.addMethod('POST', createProductIntegration);
        const productsListApiResource = productsApiResource.addResource('list');
        productsListApiResource.addMethod('GET', listProductsIntegration)

    }

    private getLambdaCode(local_fp: string, asset_p: string, localBucket: IBucket): Code {
        if(process.env['_'] && process.env['_'].split('/').pop() === 'cdklocal') {
            return Code.fromBucket(localBucket, local_fp);
        } else {
            return Code.fromAsset(asset_p);
        }
    }
}
