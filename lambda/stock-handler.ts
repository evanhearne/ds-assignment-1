import { DynamoDBClient, ReturnValue } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand, ScanCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { decode } from "jsonwebtoken";

// Create a DynamoDB client
const dynamoDBClient = new DynamoDBClient({ region: process.env.AWS_REGION }); // Ensure the region is correctly set
const dynamoDB = DynamoDBDocumentClient.from(dynamoDBClient); // Use the Document client wrapper
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


interface APIGatewayEvent {
    pathParameters?: {
        IceCreamID?: string;
    };
    body?: string;
    headers?: {
        Authorization?: string;
    };
}

interface Response {
    statusCode: number;
    body: string;
}

export const getStock = async (event: APIGatewayEvent): Promise<Response> => {
    const IceCreamID = event.pathParameters?.IceCreamID;

    if (!IceCreamID) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "IceCreamID is required" }),
        };
    }

    const params = {
        TableName: process.env.STOCK_TABLE!,
        Key: {
            IceCreamID: parseInt(IceCreamID, 10),
        },
    };

    try {
        const data = await dynamoDB.send(new GetCommand(params));
        if (data.Item && data.Item.UserId) {
            // Remove UserId from the response if present
            delete data.Item.UserId;
        }
        return {
            statusCode: 200,
            body: JSON.stringify(data.Item),
        };
    } catch (error: any) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Could not retrieve item", message: error.message }),
        };
    }
};

export const getAllStock = async (): Promise<Response> => {
    const params = {
        TableName: process.env.STOCK_TABLE!,
    };

    try {
        const data = await dynamoDB.send(new ScanCommand(params));
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
            body: JSON.stringify({ error: "Could not retrieve items", message: error.message }),
        };
    }
};

export const addStock = async (event: APIGatewayEvent): Promise<Response> => {
    var accessToken = event.headers?.Authorization || ''; // Get token from headers

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

    const { IceCreamID, Name, Allergens, Price, IsStock } = JSON.parse(event.body);

    if (!IceCreamID || !Name) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "IceCreamID and Name are required" }),
        };
    }

    // Decode the token (you might need to verify it using a public key if required)
    const decodedToken = decode(accessToken) as { [key: string]: any };
    const userId = decodedToken.sub; // Unique user identifier

    const params = {
        TableName: process.env.STOCK_TABLE!,
        Item: {
            IceCreamID: parseInt(IceCreamID, 10), // Ensure IceCreamID is stored as a number
            Name,
            Allergens,
            Price: parseFloat(Price), // Ensure Price is a float
            IsStock: Boolean(IsStock),
            UserId: userId,
        },
    };

    try {
        await dynamoDB.send(new PutCommand(params));
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Item added successfully" }),
        };
    } catch (error: any) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Could not add item", message: error.message }),
        };
    }
};

export const updateStock = async (event: APIGatewayEvent): Promise<Response> => {
    const IceCreamID = event.pathParameters?.IceCreamID;

    if (!IceCreamID) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "IceCreamID is required" }),
        };
    }

    if (!event.body) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Request body is required" }),
        };
    }

    // Retrieve the existing item to check the UserId
    const queryParams = {
        TableName: process.env.STOCK_TABLE!,
        Key: {
            IceCreamID: parseInt(IceCreamID, 10),
        },
    };

    try {
        const data = await dynamoDB.send(new GetCommand(queryParams));
        let existingUserId = "";

        if (data.Item) {
            existingUserId = data.Item.UserId;
        }

        var accessToken = event.headers?.Authorization || ''; // Get token from headers
        accessToken = accessToken.replace(/^Bearer\s+/i, '');

        // is token blacklisted
        if (await isTokenBlacklisted(accessToken)) { // if true
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Could not add customer", message: "Token is invalid - user signed out or token expired." }),
            };
        }
        const decodedToken = decode(accessToken) as { [key: string]: any };
        const userId = decodedToken.sub; // Unique user identifier

        if (userId !== existingUserId) {
            return {
                statusCode: 403,
                body: JSON.stringify({ error: `UserID ${userId} does not have permission to update this entry.` }),
            };
        }

        const { Name, Allergens, Price, IsStock } = JSON.parse(event.body);

        const params = {
            TableName: process.env.STOCK_TABLE!,
            Key: {
                IceCreamID: parseInt(IceCreamID, 10),
            },
            UpdateExpression: "set #n = :name, Allergens = :allergens, Price = :price, IsStock = :isStock",
            ExpressionAttributeNames: {
                "#n": "Name",
            },
            ExpressionAttributeValues: {
                ":name": Name,
                ":allergens": Allergens,
                ":price": parseFloat(Price),
                ":isStock": Boolean(IsStock),
            },
            ReturnValues: ReturnValue.UPDATED_NEW,
        };

        const updateData = await dynamoDB.send(new UpdateCommand(params));
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Item updated successfully", data: updateData.Attributes }),
        };
    } catch (error: any) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Could not update item", message: error.message }),
        };
    }
};

export const deleteStock = async (event: APIGatewayEvent): Promise<Response> => {
    const IceCreamID = event.pathParameters?.IceCreamID;

    if (!IceCreamID) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "IceCreamID is required" }),
        };
    }

    // Retrieve the existing item to check the UserId
    const queryParams = {
        TableName: process.env.STOCK_TABLE!,
        Key: {
            IceCreamID: parseInt(IceCreamID, 10),
        },
    };

    try {
        const data = await dynamoDB.send(new GetCommand(queryParams));
        let existingUserId = "";

        if (data.Item) {
            existingUserId = data.Item.UserId;
        }

        var accessToken = event.headers?.Authorization || ''; // Get token from headers
        accessToken = accessToken.replace(/^Bearer\s+/i, '');

        // is token blacklisted
        if (await isTokenBlacklisted(accessToken)) { // if true
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Could not add customer", message: "Token is invalid - user signed out or token expired." }),
            };
        }
        const decodedToken = decode(accessToken) as { [key: string]: any };
        const userId = decodedToken.sub; // Unique user identifier

        if (userId !== existingUserId) {
            return {
                statusCode: 403,
                body: JSON.stringify({ error: `UserID ${userId} does not have permission to delete this entry.` }),
            };
        }

        const params = {
            TableName: process.env.STOCK_TABLE!,
            Key: {
                IceCreamID: parseInt(IceCreamID, 10),
            },
        };

        await dynamoDB.send(new DeleteCommand(params));
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Item deleted successfully" }),
        };
    } catch (error: any) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Could not delete item", message: error.message }),
        };
    }
};
