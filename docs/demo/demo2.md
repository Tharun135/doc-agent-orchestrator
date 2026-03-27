# Listing users

**Endpoint:** `GET https://{IED IP}/externaldatabus-api-server/api/v1/users`

This reference describes the `GET /users` endpoint.
The administrator connects to the correct data node and fetches
the list of users from the server.

## Service details

| Application | Method | Service |
| --- | --- | --- |
| - | GET | `https://{IED IP}/externaldatabus-api-server/api/v1` |

## Request parameters

| Parameter name | Data type | Mandatory/Optional | Description |
| --- | --- | --- | --- |
| `Access token` | `String` | Mandatory | Authentication cookie. |

## Response parameters

| Parameter name | Data type | Description |
| --- | --- | --- |
| `username list` | - | The list of usernames. |
| `permissions` | - | Some permissions. |

!!!note
    The permissions included in the response are not specified.
    Error codes such as 404 will be handled in a future version.

