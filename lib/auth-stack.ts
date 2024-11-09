import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

export class AuthStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a Cognito User Pool
    this.userPool = new cognito.UserPool(this, 'UserPool', {
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      passwordPolicy: {
        minLength: 6,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
    });

    // Create a User Pool Client
    this.userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool: this.userPool,
      generateSecret: false,
      authFlows: {
        userPassword: true, // Enables USER_PASSWORD_AUTH flow
      },
    });

    // Create a Lambda function for the register handler
    const registerHandler = new lambda.Function(this, 'RegisterHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'auth-handler.register', // Initial handler function; others will be invoked based on the API Gateway setup
      environment: {
        CLIENT_ID: this.userPoolClient.userPoolClientId,
      },
    });

    // Create a Lambda function for the confirm sign up handler
    const confirmUserHandler = new lambda.Function(this, 'ConfirmUserHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'auth-handler.confirmUser',
      environment: {
        CLIENT_ID: this.userPoolClient.userPoolClientId
      }
    })

    // Create a Lambda function for the sign in handler
    const signInHandler = new lambda.Function(this, 'SignInHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'auth-handler.signIn',
      environment: {
        CLIENT_ID: this.userPoolClient.userPoolClientId
      }
    })

    // Create a Lamdba function for the sign out handler
    const signOutHandler = new lambda.Function(this, 'SignOutHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'auth-handler.signOut',
      environment: {
        CLIENT_ID: this.userPoolClient.userPoolClientId
      }
    })

    // Create an API Gateway
    const api = new apigateway.RestApi(this, 'UserApi', {
      restApiName: 'User Service',
      description: 'API for user registration, sign-in, and sign-out',
    });

    // API Endpoints

    // Register endpoint
    const register = api.root.addResource('register');
    register.addMethod('POST', new apigateway.LambdaIntegration(registerHandler, {
      requestTemplates: {
        'application/json': `{
          "operation": "register",
          "body": $input.json('$')
        }`
      }
    }));

    // ConfirmSignUp endpoint
    const confirmUser = api.root.addResource('confirmUser');
    confirmUser.addMethod('POST', new apigateway.LambdaIntegration(confirmUserHandler, {
      requestTemplates: {
        'application/json' : `{
        "operation": "confirmUser",
        "body": $input.json('$')
        }`
      }
    }));

    // SignIn endpoint
    const signIn = api.root.addResource('signIn');
    signIn.addMethod('POST', new apigateway.LambdaIntegration(signInHandler, {
      requestTemplates: {
        'application/json': `{
          "operation": "signIn",
          "body": $input.json('$')
        }`
      }
    }));

    // SignOut endpoint
    const signOut = api.root.addResource('signOut');
    signOut.addMethod('POST', new apigateway.LambdaIntegration(signOutHandler, {
      requestTemplates: {
        'application/json': `{
          "operation": "signOut",
          "body": $input.json('$')
        }`
      }
    }));
  }
}
