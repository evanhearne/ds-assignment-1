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
- Composite Primary Key: (`CustomerID`, `Name`)
- Attributes:
    - `Allergies` (list_str)
    - `FavouriteIcecreams` (list_int)

The store may require more databases to store data, however, for this assignment, I will stick with these two for simplicity. 

### App API endpoints.

#### Stock API
+ POST /stock - adds stock (ice cream) to the `Stock` DB . 
+ GET /stock - returns all stock from the `Stock` DB . 
+ GET /stock/{IceCreamID} - returns the stock item (ice cream) that contains the `IceCreamID` from the `Stock` DB .
+ PUT /stock/{IceCreamID} - updates the stock item (ice cream) that contains the `IceCreamID` if it exists in the `Stock` DB . 
+ DELETE /stock/{IceCreamID} - deletes the stock item (ice cream) that contains the `IceCreamID` if it exists in the `Stock` DB . 

There is no endpoint in the Stock API for deleting all entries in the `Stock` DB currently - may be something to consider adding for completeness of the REST API . 

#### Customer API
+ POST /customer - adds a customer to the `Customer` DB . 
+ GET /customer - returns all customers from the `Customer` DB . 
+ GET /customer/{CustomerID}/{Name} - returns the customer that contains the `CustomerID` and `Name` from the `Customer` DB . 
+ PUT /customer/{CustomerID}/{Name} - updates the customer that contains the `CustomerID` and `Name` if it exists in the `Customer` DB . 
+ DELETE /customer/{CustomerID}/{Name} - deletes the customer that contains the `CustomerID` and `Name` if it exists in the `Customer` DB. 

Similarly, the Customer API does not contain an endpoint that deletes all entries within the `Customer` DB - may be something to consider for completeness of REST API . 

### Update constraint (if relevant).

+ Constraints are in place for both the `Customer` and `Stock` API to perform `userId` checks to ensure only the user who added the entry can modify/delete the entry using either PUT or DELETE requests. 

+ When users make GET requests for both the `Customer` and `Stock` API, the response body is filtered such that it won't contain the `userId` field for security.

### Translation persistence (if relevant).

+ Translation feature was not implemented due to time constraints. 

###  Extra (If relevant).

+ Multi-stack solution used for this assignment - `Auth` and `App` Stacks. 

+ The solution was implemented from scratch i.e. no code from previous lab work was used. 

+ UPDATE HTTP method was used with slight difference in DynamoDB packages used from AWS SDK such as `ReturnValue` or `UpdateCommand` . 

+ Overall, the solution created aligns well with the lab work completed so far. 

#### Deployment Instructions
```bash
npm install
cd lambda
npm install
cd ..
tsc # compile code to js for lambda
cdk deploy --all
```

