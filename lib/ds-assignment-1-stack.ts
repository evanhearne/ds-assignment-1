import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
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

    // Customer Table
    const customerTable = new dynamodb.Table(this, 'CustomerTable', {
      partitionKey: { name: 'CustomerID', type: dynamodb.AttributeType.NUMBER }, 
      sortKey: { name: 'Name', type: dynamodb.AttributeType.STRING }, // Composite key
      tableName: 'Customer',
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

  }
}
