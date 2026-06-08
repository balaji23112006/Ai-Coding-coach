# Authentication Testing Reference

This document provides curl command examples to test all authentication endpoints. 

Endpoints are exposed on `http://localhost:8000`.

---

## 1. Sign Up (`POST /api/auth/signup`)

Registers a new user and returns user info.

### Request

```bash
curl -X POST http://localhost:8000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "aniket_dev",
    "fullName": "Aniket Kumar",
    "email": "aniket@example.com",
    "password": "Password123"
  }'
```

### Response (201 Created)

```json
{
  "user": {
    "id": "cmq57e5fv0000gnyck6un0ua5",
    "fullName": "Aniket Kumar",
    "username": "aniket_dev",
    "email": "aniket@example.com",
    "emailVerified": false,
    "image": null,
    "createdAt": "2026-06-08T12:44:59.275Z",
    "updatedAt": "2026-06-08T12:44:59.275Z"
  },
  "session": {
    "id": "...",
    "userId": "cmq57e5fv0000gnyck6un0ua5",
    "expiresAt": "2026-06-15T12:44:59.275Z",
    "token": "..."
  }
}
```

---

## 2. Log In (`POST /api/auth/login`)

Logs in using either **email** or **username**. Better Auth automatically sets session cookies in the response headers.

### Request (using Email)

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -c cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "email": "aniket@example.com",
    "password": "Password123"
  }'
```

### Request (using Username)

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -c cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "username": "aniket_dev",
    "password": "Password123"
  }'
```

---

## 3. Session Check (`GET /api/auth/session`)

Retrieves the current session state. Requires cookies saved from login to be sent.

### Request

```bash
curl -X GET http://localhost:8000/api/auth/session \
  -b cookies.txt
```

---

## 4. Protected Route (`GET /api/auth/me`)

Retrieves the current user's profile metadata. Requires a valid session cookie.

### Request

```bash
curl -X GET http://localhost:8000/api/auth/me \
  -b cookies.txt
```

### Response (200 OK)

```json
{
  "id": "cmq57e5fv0000gnyck6un0ua5",
  "username": "aniket_dev",
  "fullName": "Aniket Kumar",
  "email": "aniket@example.com"
}
```

---

## 5. Log Out (`POST /api/auth/logout`)

Clears the session on the server and expires the cookies.

### Request

```bash
curl -X POST http://localhost:8000/api/auth/logout \
  -b cookies.txt \
  -c cookies.txt
```
