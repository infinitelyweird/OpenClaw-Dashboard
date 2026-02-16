# API Documentation

This API documentation provides details for all the endpoints used in the OpenClaw DevOps Dashboard.

---

## Login API
### Endpoint: `POST /api/login`
- **Description:** Authenticate a user and retrieve a JWT token.
- **Parameters:**
  - `username` (string, required): The username of the user.
  - `password` (string, required): The user's password.
- **Request Example:**
```json
{
  "username": "admin",
  "password": "securepassword"
}
```
- **Response Example:**
```json
{
  "message": "Login successful!",
  "token": "<JWT_TOKEN>",
  "isAdmin": true,
  "forcePasswordChange": false
}
```
- **Error Codes:**
  - 400: Invalid username or password.
  - 403: Account awaiting approval.
  - 500: Internal server error.

---

## Registration API
### Endpoint: `POST /api/register`
- **Description:** Register a new user account (requires admin approval).
- **Parameters:**
  - `username` (string, required): Desired username.
  - `password` (string, required): Desired password.
  - `email` (string, required): User's email address.
- **Request Example:**
```json
{
  "username": "newuser",
  "password": "securepassword",
  "email": "newuser@example.com"
}
```
- **Response Example:**
```json
{
  "message": "Registration successful! Pending admin approval."
}
```
- **Error Codes:**
  - 400: Username or email already exists.
  - 500: Internal server error.

---

(Documentation for other endpoints will be systematically added here.)