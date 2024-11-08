import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { RemovalPolicy } from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class DsAssignment1Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Stock Table
    const stockTable = new dynamodb.Table(this, 'StockTable', {
      partitionKey: { name: 'IceCreamID', type: dynamodb.AttributeType.NUMBER },
      tableName: 'Stock',
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY, // Ensures deletion when `cdk destroy` is run
    });

    // Create Lambda function (GET)
    const getStockFunction = new lambda.Function(this, 'GetStockFunction', {
      runtime: lambda.Runtime.NODEJS_18_X, // Adjust runtime as needed
      code: lambda.Code.fromAsset('lambda'), // Path to your Lambda function code
      handler: 'stock-handler.getStock',
      environment: {
        STOCK_TABLE: stockTable.tableName,
      },
    });

    // Create Lambda function (POST)
    const addStockFunction = new lambda.Function(this, 'AddStockFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'stock-handler.addStock',
      environment: {
        STOCK_TABLE: stockTable.tableName
      }
    })

    // Create Lambda function (PUT)
    const updateStockFunction = new lambda.Function(this, 'UpdateStockFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'stock-handler.updateStock',
      environment: {
        STOCK_TABLE: stockTable.tableName
      }
    })

    // Create Lambda function (DELETE)
    const deleteStockFunction = new lambda.Function(this, 'DeleteStockFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'stock-handler.deleteStock',
      environment: {
        STOCK_TABLE: stockTable.tableName
      }
    })

    // Grant Lambda permission to read from the DynamoDB table
    stockTable.grantReadData(getStockFunction);
    stockTable.grantReadWriteData(addStockFunction)
    stockTable.grantReadWriteData(updateStockFunction)
    stockTable.grantReadWriteData(deleteStockFunction)

    // Customer Table
    const customerTable = new dynamodb.Table(this, 'CustomerTable', {
      partitionKey: { name: 'CustomerID', type: dynamodb.AttributeType.NUMBER }, 
      sortKey: { name: 'Name', type: dynamodb.AttributeType.STRING }, // Composite key
      tableName: 'Customer',
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY, // Ensures deletion when `cdk destroy` is run
    });

    // Lambda for Customer operations
    // GET
    const getCustomerFunction = new lambda.Function(this, 'GetCustomerFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'customer-handler.getCustomer',
      environment: {
        CUSTOMER_TABLE: customerTable.tableName,
      },
    });

    // POST
    const addCustomerFunction = new lambda.Function(this, 'AddCustomerFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'customer-handler.addCustomer',
      environment: {
        CUSTOMER_TABLE: customerTable.tableName
      }
    })

    // PUT
    const updateCustomerFunction = new lambda.Function(this, 'UpdateCustomerFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'customer-handler.updateCustomer',
      environment: {
        CUSTOMER_TABLE: customerTable.tableName
      }
    })

    // DELETE
    const deleteCustomerFunction = new lambda.Function(this, 'DeleteCustomerFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'customer-handler.deleteCustomer',
      environment: {
        CUSTOMER_TABLE: customerTable.tableName
      }
    })

    // Grant permissions
    customerTable.grantReadData(getCustomerFunction);
    customerTable.grantReadWriteData(addCustomerFunction)
    customerTable.grantReadWriteData(updateCustomerFunction)
    customerTable.grantReadWriteData(deleteCustomerFunction)

    // Create an API Gateway REST API
    const api = new apigateway.RestApi(this, 'StockAndCustomerApi', {
      restApiName: 'Stock and Customer API',
      description: 'API Gateway to manage stock and customer data using Lambda functions.',
    });

    // Stock API Resources and Methods

    // /stock resource
    const stockResource = api.root.addResource('stock');

    // icecreamID resource
    const icecreamID = stockResource.addResource('{IceCreamID}');

    // GET /stock/{IceCreamID}
    const getStockIntegration = new apigateway.LambdaIntegration(getStockFunction);
    icecreamID.addMethod('GET', getStockIntegration);

    // POST /stock
    const addStockIntegration = new apigateway.LambdaIntegration(addStockFunction);
    stockResource.addMethod('POST', addStockIntegration);

    // PUT /stock/{IceCreamID}
    const updateStockIntegration = new apigateway.LambdaIntegration(updateStockFunction);
    icecreamID.addMethod('PUT', updateStockIntegration);

    // DELETE /stock/{IceCreamID}
    const deleteStockIntegration = new apigateway.LambdaIntegration(deleteStockFunction);
    icecreamID.addMethod('DELETE', deleteStockIntegration);

    // Customer API Resources and Methods

    // /customer resource
    const customerResource = api.root.addResource('customer');

    // customerID + Name resource
    const customerIdName = customerResource.addResource('{CustomerID}').addResource('{Name}')

    // GET /customer/{CustomerID}/{Name}
    const getCustomerIntegration = new apigateway.LambdaIntegration(getCustomerFunction);
    customerIdName.addMethod('GET', getCustomerIntegration);

    // POST /customer
    const addCustomerIntegration = new apigateway.LambdaIntegration(addCustomerFunction);
    customerResource.addMethod('POST', addCustomerIntegration);

    // PUT /customer/{CustomerID}/{Name}
    const updateCustomerIntegration = new apigateway.LambdaIntegration(updateCustomerFunction);
    customerIdName.addMethod('PUT', updateCustomerIntegration);

    // DELETE /customer/{CustomerID}/{Name}
    const deleteCustomerIntegration = new apigateway.LambdaIntegration(deleteCustomerFunction);
    customerIdName.addMethod('DELETE', deleteCustomerIntegration);


  }
}
