# Authentication System Flow - Detailed Explanation

## What Was Implemented

### 1. **Donor Sessions API Integration** (`src/services/api.js`)
- Added `donorSessionsAPI` with 4 endpoints:
  - `register(username, password, donor_id)` - Creates a new session account
  - `login(username, password)` - Authenticates and returns session
  - `logout()` - Ends the current session
  - `getCurrentSession(session_id)` - Verifies if session is still valid

### 2. **Authentication Context** (`src/contexts/AuthContext.js`)
- **State Management:**
  - `sessionId` - Current session ID from localStorage
  - `username` - Current username
  - `isAuthenticated` - Boolean indicating if user is logged in
  - `user` - Donor data from session
  - `isDeviceRecognized` - Legacy device recognition (still works as fallback)

- **Methods:**
  - `register(registerData)` - Registers new session, stores in localStorage
  - `login(credentials)` - Logs in, stores session in localStorage
  - `logout()` - Clears session from localStorage and calls API
  - `checkSession()` - Auto-runs on app load, verifies session from localStorage

- **Session Persistence:**
  - Stores `donor_session_id` and `donor_username` in localStorage
  - On app refresh, automatically calls `/api/donor-sessions/me` to verify session
  - If valid, restores user state; if invalid, clears storage

### 3. **Protected Routes** (`src/components/ProtectedRoute.js`)
- Wraps routes that require authentication
- Checks `isAuthenticated` from AuthContext
- Redirects to `/login` if not authenticated
- Preserves intended location for post-login redirect

### 4. **Login & Register Components**
- **Login** (`src/pages/Login.js`): Username/password form
- **Register** (`src/pages/Register.js`): Username/password/donor_id form

---

## THE PROBLEM: Current Flow Issue

### Current Situation:
1. ✅ User clicks "Donate" button on Home page
2. ❌ **BLOCKED** - Donations.js is protected, requires authentication
3. ❌ User can't access Donations.js without being logged in
4. ❌ User can't log in without a `donor_id`
5. ❌ User can't get `donor_id` without accessing Donations.js to search/register

**This creates a circular dependency!**

---

## THE SOLUTION: New User Flow

### Flow for New Users (Not Authenticated):

#### **Scenario A: User is ABU Alumni (Has Record in Database)**

1. **User clicks "Donate"** → Goes to `/donations` (should be accessible without auth)
2. **User sees "First time here?" section** → Clicks "I'm an ABU Alumni"
3. **User searches** with reg number, email, or phone
4. **System finds alumni record** → Shows editable form with pre-filled data
5. **User updates info** (name, email, phone, etc.) → Clicks "Update & Continue"
6. **System saves to `donors` table** → Returns donor with `id`
7. **NEW STEP: Prompt for Session Creation**
   - Show modal/form: "Create your account to continue"
   - Ask for: Username, Password, Confirm Password
   - Call `donorSessionsAPI.register({ username, password, donor_id: donor.id })`
   - This creates record in `donor_sessions` table
8. **System stores session** in localStorage → User is now authenticated
9. **User proceeds to donation form** → Can make payment

#### **Scenario B: User is New Supporter (No Record in Database)**

1. **User clicks "Donate"** → Goes to `/donations` (accessible without auth)
2. **User sees "First time here?" section** → Clicks "New Supporter"
3. **User fills registration form** (name, gender, email, phone, address, etc.)
4. **System creates donor** in `donors` table → Returns donor with `id`
5. **NEW STEP: Prompt for Session Creation**
   - Show modal/form: "Create your account to continue"
   - Ask for: Username, Password, Confirm Password
   - Call `donorSessionsAPI.register({ username, password, donor_id: donor.id })`
   - This creates record in `donor_sessions` table
6. **System stores session** in localStorage → User is now authenticated
7. **User proceeds to donation form** → Can make payment

#### **Scenario C: Returning User (Already Has Session)**

1. **User clicks "Donate"** → Goes to `/donations`
2. **System checks localStorage** → Finds `donor_session_id`
3. **System calls `/api/donor-sessions/me`** → Verifies session
4. **If valid** → User is authenticated, sees donation form with pre-filled data
5. **If invalid** → Clears storage, shows "First time here?" section

---

## What Needs to Be Changed

### 1. **Make Donations.js Partially Accessible**
- Remove `ProtectedRoute` wrapper OR make it conditional
- Allow access to:
  - Alumni search
  - Registration form
  - Donation form (but show session creation prompt if not authenticated)

### 2. **Add Session Creation Step**
- After `createDonor()` or `updateDonor()` succeeds:
  - Check if user is authenticated
  - If NOT authenticated, show session creation modal
  - Collect username/password
  - Call `register()` from AuthContext
  - On success, proceed to donation

### 3. **Update Donations.js Logic**
- Check `isAuthenticated` before showing donation form
- If not authenticated but has donor data, show session creation prompt
- After session creation, automatically proceed to donation

---

## Database Flow

### When User Searches & Updates Alumni:
1. `GET /api/donors/search/{regNumber}` → Returns donor from `donors` table
2. `PUT /api/donors/{id}` → Updates `donors` table
3. `POST /api/donor-sessions/register` → Creates record in `donor_sessions` table
   - Links to donor via `donor_id`
   - Stores `username` and hashed `password`

### When User Registers as New:
1. `POST /api/donors` → Creates record in `donors` table
2. `POST /api/donor-sessions/register` → Creates record in `donor_sessions` table
   - Links to donor via `donor_id`
   - Stores `username` and hashed `password`

### When User Makes Donation:
1. User is authenticated (has valid session)
2. `POST /api/payments/initialize` → Creates donation record
3. Payment processed via Paystack
4. Webhook updates donation status

---

## Implementation Plan

1. ✅ Make Donations.js accessible without full authentication
2. ✅ Add session creation modal/component
3. ✅ Integrate session creation after donor creation/update
4. ✅ Update flow to handle authenticated vs unauthenticated states
5. ✅ Test complete flow: Search → Update → Create Session → Donate

