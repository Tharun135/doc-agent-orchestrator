
# /users API reference

This reference describes the `/users` endpoint.

**Base URL**: Industrial Edge device service URL

## Authentication

Pass an access token as a cookie with each request.

To obtain the access token, check the portal.

## Endpoints

### Listing users

```http
GET /users
```

Retrieves the list of users from the system.

**Headers**:

| Header | Value | Required |
| --- | --- | --- |
| `Cookie` | `<access_token>` | Yes |

**Response** (200 OK):

| Field | Description |
| --- | --- |
| `status` | Request status |
| `users` | List of users |
| `users[].username` | Username |

**Note**: The response may contain additional user fields.
`username` is the only field specified in the source.

