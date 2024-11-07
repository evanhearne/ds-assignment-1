import { DynamoDB } from 'aws-sdk';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const dynamoDB = new DynamoDB.DocumentClient();
const CUSTOMER_TABLE = process.env.CUSTOMER_TABLE!; // Ensure this is set in your Lambda environment

// Handler to retrieve a customer by CustomerID and Name
export const getCustomer = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const CustomerID = event.pathParameters?.CustomerID;
    const Name = event.pathParameters?.Name;

    if (!CustomerID || !Name) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'CustomerID and Name are required' }),
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
        const data = await dynamoDB.get(params).promise();
        return {
            statusCode: 200,
            body: JSON.stringify(data.Item),
        };
    } catch (error: any) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Could not retrieve customer', message: error.message }),
        };
    }
};

// Handler to add a new customer
export const addCustomer = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    if (!event.body) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Request body is required' }),
        };
    }

    const { CustomerID, Name, Allergies, FavouriteIcecreams } = JSON.parse(event.body);

    if (!CustomerID || !Name) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'CustomerID and Name are required' }),
        };
    }

    const params = {
        TableName: CUSTOMER_TABLE,
        Item: {
            CustomerID: parseInt(CustomerID, 10), // Ensure CustomerID is stored as a number
            Name: Name,
            Allergies: Allergies || [], // Default to an empty list if not provided
            FavouriteIcecreams: FavouriteIcecreams || [], // Default to an empty list if not provided
        },
    };

    try {
        await dynamoDB.put(params).promise();
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Customer added successfully' }),
        };
    } catch (error: any) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Could not add customer', message: error.message }),
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
            body: JSON.stringify({ error: 'CustomerID and Name are required' }),
        };
    }

    if (!event.body) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Request body is required' }),
        };
    }

    const { Allergies, FavouriteIcecreams } = JSON.parse(event.body);

    const params = {
        TableName: CUSTOMER_TABLE,
        Key: {
            CustomerID: parseInt(CustomerID, 10),
            Name: Name,
        },
        UpdateExpression: 'SET Allergies = :allergies, FavouriteIcecreams = :favourites',
        ExpressionAttributeValues: {
            ':allergies': Allergies || [],
            ':favourites': FavouriteIcecreams || [],
        },
        ReturnValues: 'UPDATED_NEW',
    };

    try {
        const data = await dynamoDB.update(params).promise();
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Customer updated successfully', data: data.Attributes }),
        };
    } catch (error: any) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Could not update customer', message: error.message }),
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
            body: JSON.stringify({ error: 'CustomerID and Name are required' }),
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
        await dynamoDB.delete(params).promise();
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Customer deleted successfully' }),
        };
    } catch (error: any) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Could not delete customer', message: error.message }),
        };
    }
};
