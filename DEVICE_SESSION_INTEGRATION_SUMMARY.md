# Device Session Integration - Complete Summary

## Overview
This document explains how device recognition is integrated with donor authentication sessions, allowing the system to:
1. Check if a device is registered (device_sessions table)
2. Determine if the donor has a username/password account (donor_sessions table)
3. Show appropriate UI (Register vs Login) based on device and session status

---

## Database Schema Changes

### New Column in `donor_sessions` Table
- **Column**: `device_session_id` (nullable, foreign key to `device_sessions.id`)
- **Purpose**: Links donor sessions to device sessions
- **Relationship**: Many donor_sessions can share one device_session (multiple users on same device)

### Relationships
```
device_sessions (1) ──< (many) donor_sessions
     │                        │
     └── donor_id             └── donor_id
         │                        │
         └──────> donors <────────┘
```

---

## Backend Changes Required

See `BACKEND_DEVICE_SESSION_INTEGRATION.md` for complete backend implementation details.

### Key Endpoints:
1. **GET `/api/donor-sessions/check-device`** (NEW)
   - Checks device recognition and donor session status
   - Returns: `{ recognized, donor, has_donor_session, donor_session }`

2. **POST `/api/donor-sessions/register`** (UPDATED)
   - Now accepts `device_session_id` parameter
   - Links donor session to device session

3. **POST `/api/donor-sessions/login`** (UPDATED)
   - Now accepts `device_session_id` parameter
   - Optionally links device session if not already linked

---

## Frontend Flow

### 1. App Load Sequence

```
App Starts
    ↓
AuthContext.checkSession()
    ↓
Check localStorage for donor_session_id
    ↓
┌─────────────────────────────────────┐
│ Has stored session_id?              │
└─────────────────────────────────────┘
    │                    │
   YES                  NO
    ↓                    ↓
Verify with /me      checkDeviceAndDonorSession()
    ↓                    ↓
Valid?              GET /api/donor-sessions/check-device
    │                    ↓
   YES              ┌─────────────────────────────┐
    ↓               │ Device recognized?           │
Authenticated       └─────────────────────────────┘
    │                    │              │
    └────────────────────┴──────────────┘
                         │
                    ┌────┴────┐
                    │         │
                   YES       NO
                    │         │
                    ↓         ↓
            ┌───────────────┐  No donor data
            │ Has donor     │  Show default
            │ session?      │  register/login
            └───────────────┘
                    │
            ┌───────┴───────┐
            │               │
           YES             NO
            │               │
            ↓               ↓
      Show Login    Show Register
      (with name)   (with name)
```

### 2. State Variables in AuthContext

- `isDeviceRecognized` - Device is registered in device_sessions
- `hasDonorSession` - Donor has a username/password in donor_sessions
- `user` - Donor data from donors table
- `deviceSessionId` - ID of the device_session record
- `isAuthenticated` - User is logged in with donor_session

### 3. UI Logic

#### Login Page (`/login`)
- **If** `isDeviceRecognized && user && hasDonorSession`:
  - Show: "Welcome Back, {name}!"
  - Show: "Sign in to your account to continue"
- **Else**:
  - Show: "Welcome Back"
  - Show: "Sign in to your account"

#### Register Page (`/register`)
- **If** `isDeviceRecognized && user && !hasDonorSession`:
  - Show: "Welcome, {name}!"
  - Show: "Create your account to access your donation history"
  - Show: "Already have an account? Sign in here" (link to login)
  - Auto-fill `donor_id` field (disabled)
- **Else**:
  - Show: "Create Account"
  - Show: "Register to access your donor account"
  - Donor ID field enabled

---

## User Scenarios

### Scenario 1: New Device, New User
1. User visits app → Device not recognized
2. User goes to `/donations` → Sees "First time here?" section
3. User searches/registers → Creates donor record
4. Session creation modal appears → User creates username/password
5. `donor_sessions` record created with `device_session_id = null` (device not registered yet)
6. User authenticated → Can make donations

### Scenario 2: Registered Device, No Donor Session
1. User visits app → Device recognized (has device_session)
2. System checks → No donor_session for this donor_id
3. User redirected to `/register` → Sees "Welcome, {name}!"
4. Donor ID auto-filled → User creates username/password
5. `donor_sessions` record created with `device_session_id` linked
6. User authenticated → Can make donations

### Scenario 3: Registered Device, Has Donor Session
1. User visits app → Device recognized
2. System checks → Has donor_session for this donor_id
3. User redirected to `/login` → Sees "Welcome Back, {name}!"
4. User enters username/password → Logs in
5. `device_session_id` linked to donor_session (if not already)
6. User authenticated → Can make donations

### Scenario 4: Returning User (Has Session in localStorage)
1. User visits app → Finds `donor_session_id` in localStorage
2. System verifies with `/api/donor-sessions/me` → Valid session
3. User authenticated immediately → No login required
4. Can access all protected routes

---

## API Request Flow

### Register Request
```javascript
POST /api/donor-sessions/register
{
  "username": "user123",
  "password": "password123",
  "donor_id": 18,
  "device_session_id": 5  // Optional, included if available
}
```

### Login Request
```javascript
POST /api/donor-sessions/login
{
  "username": "user123",
  "password": "password123",
  "device_session_id": 5  // Optional, included if available
}
```

### Check Device Request
```javascript
GET /api/donor-sessions/check-device
Headers: {
  "X-Device-Fingerprint": "abc123..."
}
```

Response:
```json
{
  "success": true,
  "recognized": true,
  "device_session": {
    "id": 5,
    "donor_id": 18
  },
  "donor": {
    "id": 18,
    "name": "John",
    "surname": "Doe",
    ...
  },
  "has_donor_session": true,
  "donor_session": {
    "id": 3,
    "username": "user123"
  }
}
```

---

## Files Modified

### Frontend:
1. `src/contexts/AuthContext.js`
   - Added `checkDeviceAndDonorSession()` method
   - Added `deviceSessionId` and `hasDonorSession` state
   - Updated `register()` and `login()` to include `device_session_id`

2. `src/services/api.js`
   - Added `checkDevice()` to `donorSessionsAPI`

3. `src/pages/Login.js`
   - Shows personalized welcome if device recognized and has session

4. `src/pages/Register.js`
   - Shows personalized welcome if device recognized but no session
   - Auto-fills donor_id if device recognized

### Backend (See BACKEND_DEVICE_SESSION_INTEGRATION.md):
1. Migration: Add `device_session_id` to `donor_sessions`
2. Model: Update `DonorSession` and `DeviceSession` models
3. Controller: Update register/login endpoints
4. New Endpoint: `/api/donor-sessions/check-device`

---

## Testing Checklist

- [ ] New device, new user → Can register and create session
- [ ] Registered device, no session → Shows register with welcome message
- [ ] Registered device, has session → Shows login with welcome message
- [ ] Returning user with session → Auto-authenticated
- [ ] Multiple users on same device → Each can have their own donor_session
- [ ] Device session linked correctly → `device_session_id` saved in donor_sessions
- [ ] Login links device session → `device_session_id` updated if not set
- [ ] Register links device session → `device_session_id` saved on registration

---

## Notes

- Device recognition still works as before (via device_sessions table)
- Donor sessions now link to device sessions via `device_session_id`
- Multiple donor sessions can share the same device session
- The system gracefully falls back to old device check endpoint if new endpoint fails
- All existing functionality preserved, with enhanced user experience

