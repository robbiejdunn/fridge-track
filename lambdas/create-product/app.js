const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const ProductsTableName = process.env.PRODUCT_TABLE_NAME;

let dynamoDbClient;
const makeClient = () => {
    const options = {
        region: 'eu-west-2'
    };
    if(process.env.LOCALSTACK_HOSTNAME) {
        options.endpoint = `http://${process.env.LOCALSTACK_HOSTNAME}:${process.env.EDGE_PORT}`;
    }
    dynamoDbClient = new AWS.DynamoDB(options);
    return dynamoDbClient;
};
const dbClient = makeClient()

exports.handler = async (event, context) => {
    const response = {
        headers: {
            'Access-Control-Allow-Headers' : 'Content-Type',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'OPTIONS,POST'
        }
    };
    try {
        console.log('Received event:', JSON.stringify(event, null, 2));
        requestData = JSON.parse(event.body);

        var params = {
            TableName: ProductsTableName,
            Item: {
                id: {
                    S: uuidv4()
                },
                name: {
                    S: requestData.name
                },
                expiry: {
                    S: new Date(requestData.expiry).toISOString()
                }
            }
        }
        console.log(params);
        console.log(`Putting item in DynamoDB table ${params.TableName}`);
        await dbClient.putItem(params).promise();
        response.statusCode = 200;
        response.body = "Success";
    } catch (err) {
        console.log(err);
        response.statusCode = 500;
        response.body = err;
    }
    return response;
};
