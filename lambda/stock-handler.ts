import { DynamoDBClient, ReturnValue } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

// Create a DynamoDB client
const dynamoDBClient = new DynamoDBClient({ region: process.env.AWS_REGION }); // Ensure the region is correctly set
const dynamoDB = DynamoDBDocumentClient.from(dynamoDBClient); // Use the Document client wrapper

interface APIGatewayEvent {
    pathParameters?: {
        IceCreamID?: string;
    };
    body?: string;
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
            IceCreamID: parseInt(IceCreamID),
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
            body: JSON.stringify({ error: "Could not retrieve item", message: error.message }),
        };
    }
};

export const addStock = async (event: APIGatewayEvent): Promise<Response> => {
    if (!event.body) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Request body is required" }),
        };
    }

    const { IceCreamID, Name, Allergens, Price, IsStock } = JSON.parse(event.body);

    const params = {
        TableName: process.env.STOCK_TABLE!,
        Item: {
            IceCreamID: parseInt(IceCreamID), // Ensure IceCreamID is stored as a number
            Name,
            Allergens,
            Price: parseFloat(Price), // Ensure Price is a float
            IsStock: Boolean(IsStock),
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

    const { Name, Allergens, Price, IsStock } = JSON.parse(event.body);

    const params = {
        TableName: process.env.STOCK_TABLE!,
        Key: {
            IceCreamID: parseInt(IceCreamID),
        },
        UpdateExpression: "set #n = :name, Allergens = :allergens, Price = :price, IsStock = :isStock",
        ExpressionAttributeNames: {
            "#n": "Name", // 'Name' is a reserved word, so we use an alias
        },
        ExpressionAttributeValues: {
            ":name": Name,
            ":allergens": Allergens,
            ":price": parseFloat(Price),
            ":isStock": Boolean(IsStock),
        },
        ReturnValues: ReturnValue.UPDATED_NEW,
    };

    try {
        const data = await dynamoDB.send(new UpdateCommand(params));
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Item updated successfully", data: data.Attributes }),
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

    const params = {
        TableName: process.env.STOCK_TABLE!,
        Key: {
            IceCreamID: parseInt(IceCreamID),
        },
    };

    try {
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
