import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { RemovalPolicy } from 'aws-cdk-lib';
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
  }
}
