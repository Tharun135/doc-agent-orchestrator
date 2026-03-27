# User List Service

Endpoint: GET /users.

Purpose:
First, the administrator must connect to the correct data node.
Then, they can fetch the list of users from the server.

Request Requirements:

- The authentication cookie must be provided.
- Access token is required.

Output:
The response includes the username list and some permissions.
We will handle error codes like 404 in the next version.
