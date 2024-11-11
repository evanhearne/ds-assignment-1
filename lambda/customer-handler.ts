import { DynamoDBClient, ReturnValue } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand, ScanCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { decode } from "jsonwebtoken";

// Create a DynamoDB client
const dynamoDBClient = new DynamoDBClient({ region: process.env.AWS_REGION }); // Make sure region is correctly set
const dynamoDB = DynamoDBDocumentClient.from(dynamoDBClient); // Use the Document client wrapper for ease of use
const CUSTOMER_TABLE = process.env.CUSTOMER_TABLE!; // Ensure this is set in your Lambda environment
const BLACKLIST_TABLE = process.env.BLACKLIST_TABLE

// Utility function to verify if the idToken is blacklisted
const isTokenBlacklisted = async (idToken: string): Promise<boolean> => {
    const params = {
        TableName: BLACKLIST_TABLE,
        IndexName: 'idTokenIndex', // Name of the GSI
        KeyConditionExpression: "IdToken = :token",
        ExpressionAttributeValues: {
            ":token": idToken,
        },
    };
    try {
        const data = await dynamoDB.send(new QueryCommand(params));
        if (data.Items && data.Items.length > 0) {
            for (const item of data.Items) {
                if (item && item.IsBlackList) {
                    return true;
                }
            }
        }
        return false;
    } catch (error: any) {
        console.error("Error checking idToken blacklist:", error.message);
        return false; // In case of error, assume idToken is not blacklisted
    }
};


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
            Name: decodeURIComponent(Name),
        },
    };

    try {
        const data = await dynamoDB.send(new GetCommand(params));

        var dataItem = data.Item
        
        if (dataItem && dataItem.UserId) {
            // Remove the userID field
            delete dataItem.UserId;
          }
        return {
            statusCode: 200,
            body: JSON.stringify(dataItem),
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
        // remove all UserId in request before return...

        if (data.Items) {
            // Remove UserId from all items if present
            data.Items.forEach(item => {
                if (item.UserId) {
                    delete item.UserId;
                }
            });
        }
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

    // is token blacklisted
    if (await isTokenBlacklisted(accessToken)) { // if true
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Could not add customer", message: "Token is invalid - user signed out or token expired." }),
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

    // is token blacklisted
    if (await isTokenBlacklisted(replaceAccessToken)) { // if true
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Could not update customer", message: "Token is invalid - user signed out or token expired." }),
        };
    }

     // Decode the token (you might need to verify it using a public key if required)
     const decodedToken = decode(accessToken) as { [key: string]: any };

     // Extract user information from the decoded token
     const userId = decodedToken.sub; // Unique user identifier

     if (userId != UserId) {
        return {
            statusCode: 403,
            body: JSON.stringify({ error: "UserID " + userId + " does not have the permission to update this entry." }),
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
            Name: decodeURIComponent(Name),
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

    // is token blacklisted
    if (await isTokenBlacklisted(replaceAccessToken)) { // if true
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Could not add customer", message: "Token is invalid - user signed out or token expired." }),
        };
    }

     // Decode the token (you might need to verify it using a public key if required)
     const decodedToken = decode(accessToken) as { [key: string]: any };

     // Extract user information from the decoded token
     const userId = decodedToken.sub; // Unique user identifier

     if (userId != UserId) {
        return {
            statusCode: 403,
            body: JSON.stringify({ error: "UserID " + userId + " does not have the permission to delete this entry. " }),
        };
     }

    try {
        await dynamoDB.send(new DeleteCommand(queryParams));
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
