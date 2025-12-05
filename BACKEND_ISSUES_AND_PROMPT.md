# Backend Issues & Requirements

## 1. Persistent Session & Logout on Refresh
**Problem:** Users are being logged out on page refresh.
**Root Cause:** The frontend `fetchAlumniList` calls `/api/donors`. This endpoint returns `401 Unauthorized`. The frontend interceptor interprets this as an invalid session and clears the local storage.
**Requirements:**
*   **Endpoint Security:** If `/api/donors` is intended to be public (e.g., a list of alumni), please remove the authentication middleware or allow public access.
*   **Session Auth:** If `/api/donors` *must* be protected, ensure it accepts the `X-Device-Session` header authentication scheme we implemented for persistent sessions. The frontend is sending this header.
*   **Persistent Session Logic:** Verify that the `device_sessions` table is correctly linking to `donor_sessions` and that the `X-Device-Session` header is sufficient to authenticate requests when the standard Bearer token is expired or missing.

## 2. Donation Total is 0.00
**Problem:** After login, the user's donation total shows `₦0.00` even for users with donation history.
**Observation:** The frontend receives an empty `donations` array from the backend.
**Requirements:**
*   **Endpoint Check:** Verify the endpoint returning donation history (likely `/api/donors/me` or `/api/donations/history`).
*   **Data Integrity:** Ensure that `donations` are correctly linked to the `donor_id`.
*   **Query Logic:** Check if the query filters are too strict (e.g., filtering by a specific status that isn't met, or date ranges).

## 3. Image 404 Errors
**Problem:** Project icons are failing to load.
**URL Example:** `http://127.0.0.1:8000/storage/projects/icons/ni1SuwLVGFsBMPJb5P1lUPjYMSGOR7DDcXyFFq0P.jpg`
**Requirements:**
*   **Storage Link:** Run `php artisan storage:link` on the server to ensure the `public/storage` symlink exists.
*   **Permissions:** Verify that the `storage/app/public` directory and its subdirectories have the correct read permissions.
*   **File Existence:** Confirm that the file actually exists in `storage/app/public/projects/icons/`.

## 4. Google Login Origin Error
**Problem:** Google Sign-In button fails with `The given origin is not allowed for the given client ID`.
**Requirements:**
*   **Google Cloud Console:** Add `http://localhost:3000` (and your production URL) to the **Authorized JavaScript origins** for the OAuth 2.0 Client ID used in the project.
*   **Clear Cache:** Sometimes this change takes a few minutes to propagate.

## 5. Persistent Session Implementation (Recap)
To ensure the "strong" session works as requested:
*   **Login/Register:** Return `device_session_id` in the response.
*   **Check Device:** The `/api/donor-sessions/check-device` endpoint should return `recognized: true` and `has_donor_session: true` if the `X-Device-Fingerprint` matches a valid device session linked to an active donor session.
*   **Me Endpoint:** `/api/donor-sessions/me` should validate the session based on `session_id` (body) OR `X-Device-Session` (header) and never expire until explicit logout.
