import { APIGatewayProxyHandler } from 'aws-lambda';
import { CognitoIdentityProviderClient, SignUpCommand, InitiateAuthCommand, GlobalSignOutCommand, AuthFlowType, ConfirmSignUpCommand } from '@aws-sdk/client-cognito-identity-provider';

const cognito = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });
const CLIENT_ID = process.env.CLIENT_ID!; // Ensure this is set in your Lambda environment

// Register Function
export const register: APIGatewayProxyHandler = async (event) => {
  const { username, password, email } = JSON.parse(event.body || '{}');

  const params = {
    ClientId: CLIENT_ID,
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
    Username: username,
    ConfirmationCode: confirmationCode,
  };

  try {
    const command = new ConfirmSignUpCommand(params);
    await cognito.send(command);
    console.log('User confirmed successfully');
  } catch (error: any) {
    console.error('Error confirming user:', error);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: error.message }),
    };
  }
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "User confirmed successfully" }),
  };
};

// Sign-In Function
export const signIn: APIGatewayProxyHandler = async (event) => {
  const { username, password } = JSON.parse(event.body || '{}');

  const params = {
    AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
    ClientId: CLIENT_ID,
    AuthParameters: {
      USERNAME: username,
      PASSWORD: password,
    },
  };

  try {
    const command = new InitiateAuthCommand(params);
    const result = await cognito.send(command);
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

  try {
    const command = new GlobalSignOutCommand(params);
    await cognito.send(command);
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

// Protected Endpoint Function
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
