## Serverless REST Assignment - Distributed Systems.

__Name:__ Evan Hearne

__Demo:__ #TODO record demo and paste video link here // use a capture tool that allows direct embed into markdown . 

### Context.

The chosen context for my web API is an Ice Cream Parlour. The Ice Cream Parlour wants to expand their store front to the online realm for online orders.

For this they require the main database being `Stock`, which contains the various ice creams that they stock. The schema for `Stock` database is as follows:

#### `Stock` DB Schema:
- Primary Key: `IceCreamID` (int)
- Attributes:
    - `Name` (str)
    - `Allergens` (list_str)
    - `Price` (double)
    - `IsStock` (bool)

The store also requires a way to store customer information. They can do this with the `Customer` database for which the schema is:

#### `Customer` DB Schema:
- Primary Key: `CustomerID` (int)
- Attributes:
    - `Name` (str)
    - `Allergies` (list_str)
    - `FavouriteIcecreams` (list_int)

The store may require more databases to store data, however, for this assignment, I will stick with these two for simplicity. 

### App API endpoints.

[ Provide a bullet-point list of the app's endpoints (excluding the Auth API) you have successfully implemented. ]
e.g.
 
+ POST /thing - add a new 'thing'.
+ GET /thing/{partition-key}/ - Get all the 'things' with a specified partition key.
+ GEtT/thing/{partition-key}?attributeX=value - Get all the 'things' with a specified partition key value and attributeX satisfying the condition .....

### Update constraint (if relevant).

[Briefly explain your design for the solution to the PUT/Update constraint 
- only the user who added an item to the main table could update it.]

### Translation persistence (if relevant).

[Briefly explain your design for the solution to avoid repeat requests to Amazon Translate - persist translations so that Amazon Translate can be bypassed for repeat translation requests.]

###  Extra (If relevant).

[ State whether you have created a multi-stack solution for this assignment or used lambda layers to speed up update deployments. Also, mention any aspect of the CDK framework __that was not covered in the lectures that you used in this assignment. ]

