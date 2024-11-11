import { APIGatewayProxyHandler } from 'aws-lambda';
import { CognitoIdentityProviderClient, SignUpCommand, InitiateAuthCommand, GlobalSignOutCommand, AuthFlowType, ConfirmSignUpCommand } from '@aws-sdk/client-cognito-identity-provider';
import * as crypto from 'crypto';
import { DynamoDBClient, ReturnValue, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";

const cognito = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });
const CLIENT_ID = process.env.CLIENT_ID!; // Ensure this is set in your Lambda environment
const CLIENT_SECRET = process.env.CLIENT_SECRET!;
const BLACKLIST_TABLE = process.env.BLACKLIST_TABLE;
const dynamoDBClient = new DynamoDBClient({ region: process.env.AWS_REGION }); // Make sure region is correctly set
const dynamoDB = DynamoDBDocumentClient.from(dynamoDBClient); // Use the Document client wrapper for ease of use

// Utility function to calculate secret hash
const calculateSecretHash = (username: string): string => {
  return crypto
    .createHmac('SHA256', CLIENT_SECRET)
    .update(username + CLIENT_ID)
    .digest('base64');
};

// Register Function
export const register: APIGatewayProxyHandler = async (event) => {
  const { username, password, email } = JSON.parse(event.body || '{}');

  const params = {
    ClientId: CLIENT_ID,
    SecretHash: calculateSecretHash(username), // Use the secret hash
    Username: username,
    Password: password,
    UserAttributes: [
      { Name: "email", Value: email },
    ],
  };

  try {
    const command = new SignUpCommand(params);
    await cognito.send(command);
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "User registered successfully" }),
    };
  } catch (error: any) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

// Confirm function
export const confirmUser: APIGatewayProxyHandler = async (event) => {
  const { username, confirmationCode } = JSON.parse(event.body || '{}');

  const params = {
    ClientId: CLIENT_ID,
    SecretHash: calculateSecretHash(username), // Use the secret hash
    Username: username,
    ConfirmationCode: confirmationCode,
  };

  try {
    const command = new ConfirmSignUpCommand(params);
    await cognito.send(command);
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "User confirmed successfully" }),
    };
  } catch (error: any) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

// Sign-In Function
export const signIn: APIGatewayProxyHandler = async (event) => {
  const { username, password } = JSON.parse(event.body || '{}');

  const params = {
    AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
    ClientId: CLIENT_ID,
    SecretHash: calculateSecretHash(username), // Use the secret hash
    AuthParameters: {
      USERNAME: username,
      PASSWORD: password,
      SECRET_HASH: calculateSecretHash(username), // Use the secret hash
    },
  };

  try {
    const command = new InitiateAuthCommand(params);
    const result = await cognito.send(command);
    // create params for blacklist item
    const blacklistParams = {
      TableName: BLACKLIST_TABLE,
      Item: {
        AccessToken: result.AuthenticationResult?.AccessToken,
        IdToken: result.AuthenticationResult?.IdToken,
        IsBlackList: false
      }
    }
    // send put command to blacklist db table
    await dynamoDB.send(new PutCommand(blacklistParams))
    return {
      statusCode: 200,
      body: JSON.stringify({
        accessToken: result.AuthenticationResult?.AccessToken,
        idToken: result.AuthenticationResult?.IdToken,
        refreshToken: result.AuthenticationResult?.RefreshToken,
      }),
    };
  } catch (error: any) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

// Sign-Out Function
export const signOut: APIGatewayProxyHandler = async (event) => {
  const { accessToken } = JSON.parse(event.body || '{}');

  const params = {
    AccessToken: accessToken,
  };

  // TODO add idToken or some sort of identifier here so that idtoken == idtoken

  const blacklistParams = {
    TableName: BLACKLIST_TABLE,
    Key: {
      AccessToken: accessToken
    }
  }

  try {
    const command = new GlobalSignOutCommand(params);
    await cognito.send(command);
    // invalidate token
    const data = await dynamoDB.send(new GetCommand(blacklistParams))
    if (data.Item && data.Item.AccessToken) {
      const updateParams = {
        TableName: BLACKLIST_TABLE,
        Key: {
          AccessToken: data.Item.AccessToken
        },
        UpdateExpression: "set IsBlackList = :val",
        ExpressionAttributeValues: {
          ":val": true
        },
        ReturnValues: ReturnValue.UPDATED_NEW
      };
      // update item in DB
      await dynamoDB.send(new UpdateCommand(updateParams));
    }
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "User signed out successfully" }),
    };
  } catch (error: any) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

// Protected Endpoint Function remains unchanged as it does not require Cognito interaction
export const protectedEndpoint: APIGatewayProxyHandler = async (event) => {
  if (!event.requestContext.authorizer) {
    return {
      statusCode: 403,
      body: JSON.stringify({ message: 'Unauthorized' }),
    };
  }

  const claims = event.requestContext.authorizer.claims;
  const username = claims['cognito:username'];

  return {
    statusCode: 200,
    body: JSON.stringify({ message: `Hello, ${username}. You have accessed a protected endpoint.` }),
  };
};
