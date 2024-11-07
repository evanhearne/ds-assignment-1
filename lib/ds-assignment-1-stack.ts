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

    // Create Lambda function
    const getStockFunction = new lambda.Function(this, 'GetStockFunction', {
      runtime: lambda.Runtime.NODEJS_18_X, // Adjust runtime as needed
      code: lambda.Code.fromAsset('lambda'), // Path to your Lambda function code
      handler: 'stock-handler.getStock',
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
      removalPolicy: RemovalPolicy.DESTROY, // Ensures deletion when `cdk destroy` is run
    });

    // Lambda for Customer operations
    const getCustomerFunction = new lambda.Function(this, 'GetCustomerFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'customer-handler.getCustomer',
      environment: {
        CUSTOMER_TABLE: customerTable.tableName,
      },
    });

    // Grant permissions
    customerTable.grantReadData(getCustomerFunction);
  }
}
