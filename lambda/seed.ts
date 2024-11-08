import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const dynamoDBClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const dynamoDB = DynamoDBDocumentClient.from(dynamoDBClient);

interface Customer {
  CustomerID: number;
  Name: string;
  Allergies: string[];
  FavouriteIcecreams: number[];
}

interface Stock {
  IceCreamID: number;
  Name: string;
  Allergens: string[];
  Price: number;
  IsStock: boolean;
}

export const handler = async () => {
  const customerData: Customer[] = [
    { CustomerID: 1, Name: "Evan Hearne", Allergies: [], FavouriteIcecreams: [1, 2, 3] },
    { CustomerID: 2, Name: "Alice Smith", Allergies: ["peanuts"], FavouriteIcecreams: [2, 4] },
  ];

  const stockData: Stock[] = [
    { IceCreamID: 1, Name: "Vanilla", Allergens: [], Price: 5.5, IsStock: true },
    { IceCreamID: 2, Name: "Chocolate", Allergens: ["milk"], Price: 6.0, IsStock: true },
  ];

  try {
    // Seed Customer table
    for (const customer of customerData) {
      await dynamoDB.send(new PutCommand({
        TableName: process.env.CUSTOMER_TABLE_NAME!,
        Item: customer,
      }));
    }

    // Seed Stock table
    for (const stock of stockData) {
      await dynamoDB.send(new PutCommand({
        TableName: process.env.STOCK_TABLE_NAME!,
        Item: stock,
      }));
    }

    console.log("Seeding complete");
    return { statusCode: 200, body: 'Seeding complete' };
  } catch (error) {
    console.error("Error seeding data:", error);
    throw new Error("Seeding failed");
  }
};
