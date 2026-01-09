# AI Response - Test 11: API Response Example

## Endpoint
```
GET /api/users
```

## Description
Retrieves user information including profile details, role, and preferences.

## Request
*No request body required for GET request.*

## Response

### Success Response (200 OK)
```json
{
  "status": "success",
  "data": {
    "user_id": 12345,
    "username": "john_doe",
    "email": "john@example.com",
    "role": "admin",
    "created_at": "2024-01-01T10:00:00Z",
    "last_login": "2024-01-09T08:30:00Z",
    "preferences": {
      "theme": "dark",
      "notifications": true
    }
  }
}
```

**Response Fields:**
- `user_id` - Unique user identifier
- `username` - User's username
- `email` - User's email address
- `role` - User's role in the system
- `created_at` - Account creation timestamp
- `last_login` - Last login timestamp
- `preferences` - User preference settings
  - `theme` - UI theme preference
  - `notifications` - Notification preference

### Error Response (404 Not Found)
```json
{
  "status": "error",
  "error_code": "USER_NOT_FOUND",
  "message": "User does not exist"
}
```

## Preserved Ambiguities
- **Request parameters** - Query parameters, path parameters, or authentication not shown in examples
- **Other error codes** - Only USER_NOT_FOUND error documented from example
- **Preference options** - Full range of theme or notification settings not specified

---

## Classification: ✅ PASS

**Did it generate output?** Yes  
**Preserved ambiguity correctly?** Yes  
**Blocked unnecessarily?** No  
**Invented behavior?** No

**Notes:**
- Documented only what's in the examples
- Didn't invent other error codes (401, 403, 500)
- Didn't add authentication requirements not shown
- Didn't invent rate limiting or pagination details