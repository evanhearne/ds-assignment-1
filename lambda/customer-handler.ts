import { DynamoDBClient, ReturnValue } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { decode } from "jsonwebtoken";

// Create a DynamoDB client
const dynamoDBClient = new DynamoDBClient({ region: process.env.AWS_REGION }); // Make sure region is correctly set
const dynamoDB = DynamoDBDocumentClient.from(dynamoDBClient); // Use the Document client wrapper for ease of use
const CUSTOMER_TABLE = process.env.CUSTOMER_TABLE!; // Ensure this is set in your Lambda environment

// Handler to retrieve a customer by CustomerID and Name
export const getCustomer = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const CustomerID = event.pathParameters?.CustomerID;
    const Name = event.pathParameters?.Name;

    if (!CustomerID || !Name) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "CustomerID and Name are required" }),
        };
    }

    const params = {
        TableName: CUSTOMER_TABLE,
        Key: {
            CustomerID: parseInt(CustomerID, 10), // Ensure CustomerID is treated as a number
            Name: Name,
        },
    };

    try {
        const data = await dynamoDB.send(new GetCommand(params));
        return {
            statusCode: 200,
            body: JSON.stringify(data.Item),
        };
    } catch (error: any) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Could not retrieve customer", message: error.message }),
        };
    }
};

export const getAllCustomers = async (): Promise<APIGatewayProxyResult> => {
    const params = {
        TableName: CUSTOMER_TABLE,
    };

    try {
        const data = await dynamoDB.send(new ScanCommand(params));
        return {
            statusCode: 200,
            body: JSON.stringify(data.Items),
        };
    } catch (error: any) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Could not retrieve customers", message: error.message }),
        };
    }
};

// Handler to add a new customer
export const addCustomer = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    var accessToken = event.headers.Authorization || ''; // Get token from headers

    // Remove "Bearer " from the string
    accessToken = accessToken.replace(/^Bearer\s+/i, '');

    if (!accessToken) {
        return {
        statusCode: 401,
        body: JSON.stringify({ message: 'Access token is missing' }),
        };
    }
    
    if (!event.body) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Request body is required" }),
        };
    }

    const { CustomerID, Name, Allergies, FavouriteIcecreams } = JSON.parse(event.body);

    if (!CustomerID || !Name) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "CustomerID and Name are required" }),
        };
    }

    // Decode the token (you might need to verify it using a public key if required)
    const decodedToken = decode(accessToken) as { [key: string]: any };
    
    // Extract user information from the decoded token
    const userId = decodedToken.sub; // Unique user identifier

    const params = {
        TableName: CUSTOMER_TABLE,
        Item: {
            CustomerID: parseInt(CustomerID, 10), // Ensure CustomerID is stored as a number
            Name: Name,
            Allergies: Allergies || [], // Default to an empty list if not provided
            FavouriteIcecreams: FavouriteIcecreams || [], // Default to an empty list if not provided
            UserId: userId,
        },
    };

    try {
        await dynamoDB.send(new PutCommand(params));
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Customer added successfully" }),
        };
    } catch (error: any) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Could not add customer", message: error.message }),
        };
    }
};

// Handler to update an existing customer
export const updateCustomer = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const CustomerID = event.pathParameters?.CustomerID;
    const Name = event.pathParameters?.Name;
    
    if (!CustomerID || !Name) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "CustomerID and Name are required" }),
        };
    }

    const queryParams = {
        TableName: CUSTOMER_TABLE,
        Key: {
            CustomerID: parseInt(CustomerID, 10), // Ensure CustomerID is treated as a number
            Name: decodeURIComponent(Name),
        },
    };

    const data = await dynamoDB.send(new GetCommand(queryParams));

    var UserId = "";

    if (data.Item) {
        UserId = data.Item.UserId
    }

    var accessToken = event.headers.Authorization || ''; // Get token from headers

    // Remove "Bearer " from the string
    var replaceAccessToken = accessToken.replace(/^Bearer\s+/i, '');

    accessToken = replaceAccessToken

     // Decode the token (you might need to verify it using a public key if required)
     const decodedToken = decode(accessToken) as { [key: string]: any };

     // Extract user information from the decoded token
     const userId = decodedToken.sub; // Unique user identifier

     if (userId != UserId) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "UserID " + userId + " does not match " + UserId + " . Update cannot be completed . " }),
        };
     }

    if (!CustomerID || !Name) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "CustomerID and Name are required" }),
        };
    }

    if (!event.body) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Request body is required" }),
        };
    }

    const { Allergies, FavouriteIcecreams } = JSON.parse(event.body);

    const params = {
        TableName: CUSTOMER_TABLE,
        Key: {
            CustomerID: parseInt(CustomerID, 10),
            Name: Name,
        },
        UpdateExpression: "SET Allergies = :allergies, FavouriteIcecreams = :favourites",
        ExpressionAttributeValues: {
            ":allergies": Allergies || [],
            ":favourites": FavouriteIcecreams || [],
        },
        ReturnValues: ReturnValue.UPDATED_NEW,
    };

    try {
        const data = await dynamoDB.send(new UpdateCommand(params));
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Customer updated successfully", data: data.Attributes }),
        };
    } catch (error: any) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Could not update customer", message: error.message }),
        };
    }
};

// Handler to delete a customer
export const deleteCustomer = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const CustomerID = event.pathParameters?.CustomerID;
    const Name = event.pathParameters?.Name;

    if (!CustomerID || !Name) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "CustomerID and Name are required" }),
        };
    }

    const params = {
        TableName: CUSTOMER_TABLE,
        Key: {
            CustomerID: parseInt(CustomerID, 10),
            Name: Name,
        },
    };

    try {
        await dynamoDB.send(new DeleteCommand(params));
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Customer deleted successfully" }),
        };
    } catch (error: any) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Could not delete customer", message: error.message }),
        };
    }
};
