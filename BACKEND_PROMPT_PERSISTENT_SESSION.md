# Backend Prompt: Implement Persistent "Strong" Sessions

## Objective
We need to implement a robust, long-lived session management system that keeps users logged in indefinitely on their devices until they explicitly log out. This should leverage the `device_sessions` table to securely link sessions to specific devices.

## Requirements

### 1. Persistent Session Logic
- **Goal:** The user's session should **never expire** due to inactivity. It should only be invalidated upon an explicit `logout` action by the user.
- **Implementation:**
    - When a user logs in (via email/password or Google), create a session record (e.g., in `donor_sessions`) that has either no expiration date or a very distant one (e.g., 10 years).
    - Ensure the `auth_token` (Sanctum token or custom session ID) issued to the frontend reflects this longevity.

### 2. Device-Linked Sessions (Using `device_sessions`)
- **Goal:** Strengthen security by binding the persistent session to the user's specific device.
- **Implementation:**
    - We are already sending `X-Device-Fingerprint` and `device_session_id` from the frontend.
    - Ensure the `device_sessions` table is used to track authorized devices for each donor.
    - When validating a session (e.g., in `/api/donor-sessions/me` or middleware):
        1.  Check if the `donor_session_id` is valid and active.
        2.  Verify that the request originates from the expected device (matching `device_fingerprint` or `device_session_id`).
    - If the device fingerprint changes significantly or doesn't match the session's bound device, you might prompt for re-authentication, but for the standard use case, the session should remain valid.

### 3. API Endpoints Adjustments
- **Login (`/api/donor-sessions/login` & `/api/donor-sessions/google-login`):**
    - Should return a session token/ID that is valid indefinitely.
    - Should update the `last_active` timestamp in `device_sessions` but **not** rotate or expire the token based on time.
- **Session Check (`/api/donor-sessions/me`):**
    - This endpoint is called on app launch. It must return the authenticated user data if the session ID is valid, regardless of how much time has passed since the last login.
    - It should **not** return 401 (Unauthorized) for expired time-to-live (TTL), only for explicitly revoked sessions.
- **Logout (`/api/donor-sessions/logout`):**
    - This is the **only** action that should invalidate the session.
    - It should mark the `donor_session` as `expired` or `revoked` and potentially update the `device_session` status.

### 4. Security Considerations
- While sessions are indefinite, critical actions (like changing passwords or updating sensitive profile info) should ideally require a fresh password confirmation (sudo mode), though this is a secondary enhancement.
- Ensure that if a user changes their password, all *other* active sessions (on other devices) are optionally revoked or re-validated.

## Summary for Implementation
"Please update the backend session management to support 'infinite' sessions. The session should be linked to the `device_sessions` table. Do not expire sessions based on inactivity. The session must persist until the `/api/donor-sessions/logout` endpoint is called. Ensure the `check-device` and `me` endpoints validate these long-lived sessions correctly."
