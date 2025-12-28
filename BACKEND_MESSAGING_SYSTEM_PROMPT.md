# BACKEND PROMPT: Implementing Alumni Messaging System & Directory

## Context
We are implementing a community feature in the ABU Endowment PWA that allows alumni (donors) to find each other and communicate. The frontend UI is already built, but the following backend components are missing or restricted.

## 1. Alumni Directory (Donor List)
**Issue:** Current attempts to fetch the donor list via `/api/donors` or `/api/rankings/top-donors` are returning `401 Unauthorized`.
**Requirement:** 
- We need an endpoint (e.g., `GET /api/donors`) that returns a list of all registered donors.
- **Privacy:** This endpoint should return `id`, `name`, `surname`, `email`, and `profile_image`. Sensitive data like phone numbers or addresses should be excluded unless the user is viewing their own profile.
- **Access:** This should be accessible to any authenticated donor so they can find peers to message.

## 2. Messaging Database Schema
We need a `messages` table to store peer-to-peer communication.
**Suggested Fields:**
- `id` (Primary Key)
- `sender_id` (Foreign Key to `donors.id`)
- `receiver_id` (Foreign Key to `donors.id`)
- `content` (Text/LongText)
- `is_read` (Boolean, default: false)
- `created_at` & `updated_at` (Timestamps)

## 3. Required API Endpoints
Please implement the following endpoints under the `auth:sanctum` (or equivalent donor session) middleware:

### A. Send Message
- **Endpoint:** `POST /api/messages`
- **Payload:** `{ "receiver_id": 123, "content": "Hello fellow alumni!" }`
- **Logic:** Set `sender_id` automatically from the authenticated session.

### B. Fetch Received Messages
- **Endpoint:** `GET /api/messages/received`
- **Response:** List of messages where `receiver_id` matches the authenticated user. Include the `sender` object (name, surname, profile_image).

### C. Fetch Sent Messages
- **Endpoint:** `GET /api/messages/sent`
- **Response:** List of messages where `sender_id` matches the authenticated user. Include the `receiver` object.

### D. Mark as Read
- **Endpoint:** `PUT /api/messages/{id}/read`
- **Logic:** Update `is_read` to `true` for the specified message.

### E. Unread Count
- **Endpoint:** `GET /api/messages/unread-count`
- **Response:** `{ "count": 5 }` (Count of received messages where `is_read` is `false`).

## 4. Authentication Note
The frontend uses `X-Device-Session` or `Bearer` tokens. Please ensure the `donor_id` is correctly resolved from the active session (referencing the `donor_sessions` table) to prevent the "wrong donor ID" bug we encountered previously.

## Frontend Implementation Reference
The frontend is already calling these exact paths:
- `donorsAPI.getAll()` -> `GET /api/donors`
- `messagesAPI.getReceived()` -> `GET /api/messages/received`
- `messagesAPI.getSent()` -> `GET /api/messages/sent`
- `messagesAPI.send(data)` -> `POST /api/messages`
- `messagesAPI.markAsRead(id)` -> `PUT /api/messages/{id}/read`
- `messagesAPI.getUnreadCount()` -> `GET /api/messages/unread-count`
