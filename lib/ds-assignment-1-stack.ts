import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as lambda from 'aws-cdk-lib/aws-lambda';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class DsAssignment1Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Stock Table
    const stockTable = new dynamodb.Table(this, 'StockTable', {
      partitionKey: { name: 'IceCreamID', type: dynamodb.AttributeType.NUMBER },
      tableName: 'Stock',
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    // Create Lambda function
    const getStockFunction = new lambda.Function(this, 'GetStockFunction', {
      runtime: lambda.Runtime.NODEJS_18_X, // Adjust runtime as needed
      code: lambda.Code.fromAsset('lambda'), // Path to your Lambda function code
      handler: 'get-stock.handler',
      environment: {
        STOCK_TABLE: stockTable.tableName,
      },
    });

    // Grant Lambda permission to read from the DynamoDB table
    stockTable.grantReadData(getStockFunction);

    // Customer Table
    const customerTable = new dynamodb.Table(this, 'CustomerTable', {
      partitionKey: { name: 'CustomerID', type: dynamodb.AttributeType.NUMBER }, 
      sortKey: { name: 'Name', type: dynamodb.AttributeType.STRING }, // Composite key
      tableName: 'Customer',
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    // Lambda for Customer operations
    const getCustomerFunction = new lambda.Function(this, 'GetCustomerFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'get-customer.handler',
      environment: {
        CUSTOMER_TABLE: customerTable.tableName,
      },
    });

    // Grant permissions
    customerTable.grantReadData(getCustomerFunction);
  }
}
