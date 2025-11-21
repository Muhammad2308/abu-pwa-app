# Complete User Flow - Detailed Explanation

## 🎯 Overview

The system now supports a complete registration and authentication flow that allows new users to:
1. Search for existing alumni records OR register as new supporters
2. Update their information
3. Create a username/password account (session)
4. Make donations while authenticated

---

## 📋 Complete User Journey

### **Scenario A: ABU Alumni (Has Record in Database)**

#### Step 1: User Clicks "Donate" Button
- User is on Home page (`/`)
- Clicks "Donate" button
- **Route**: `/donations` (now accessible WITHOUT authentication)
- User sees donation page

#### Step 2: User Sees "First Time Here?" Section
- If `!isAuthenticated`, shows yellow banner:
  - "I'm an ABU Alumni" button
  - "New Supporter" button
- User clicks "I'm an ABU Alumni"

#### Step 3: Alumni Search Screen
- User enters:
  - Registration Number, OR
  - Email Address, OR
  - Phone Number
- Clicks "Search"
- **API Call**: `GET /api/donors/search/{regNumber}` or `/api/donors/search/email/{email}` or `/api/donors/search/phone/{phone}`
- **Backend**: Searches `donors` table
- **Result**: Returns donor object with all fields

#### Step 4: Alumni Record Found
- System pre-fills donation form with:
  - `name`, `surname`, `other_name`
  - `email`, `phone`
- User can edit these fields
- User clicks "Update & Continue"

#### Step 5: Update Donor Information
- **API Call**: `PUT /api/donors/{id}`
- **Backend**: Updates `donors` table with new information
- **Response**: Returns updated donor object

#### Step 6: Session Creation Prompt (NEW!)
- **Check**: `if (!isAuthenticated && donor?.id)`
- **Action**: Shows `SessionCreationModal`
- **Modal Content**:
  - Username field (min 3 characters)
  - Password field (min 6 characters)
  - Confirm Password field
  - "Create Account" button

#### Step 7: User Creates Account
- User enters username and password
- Clicks "Create Account"
- **API Call**: `POST /api/donor-sessions/register`
  ```json
  {
    "username": "user123",
    "password": "password123",
    "donor_id": 18
  }
  ```
- **Backend**:
  - Validates username (min 3, unique)
  - Validates password (min 6)
  - Checks if donor already has a session (409 conflict)
  - Creates record in `donor_sessions` table:
    - `id` (session_id)
    - `username`
    - `password` (hashed)
    - `donor_id` (foreign key to `donors` table)
- **Response**: 
  ```json
  {
    "success": true,
    "data": {
      "id": 5,
      "username": "user123",
      "donor": { /* donor object */ }
    }
  }
  ```

#### Step 8: Session Stored & User Authenticated
- **Frontend**:
  - Stores `donor_session_id` in localStorage
  - Stores `donor_username` in localStorage
  - Updates AuthContext state:
    - `sessionId = "5"`
    - `username = "user123"`
    - `isAuthenticated = true`
    - `user = donor object`
- Modal closes
- User proceeds to donation form

#### Step 9: Make Donation
- User fills donation amount
- Clicks payment button
- **API Call**: `POST /api/payments/initialize`
- Payment processed via Paystack
- Donation record created in `donations` table
- User redirected to home page with success message

---

### **Scenario B: New Supporter (No Record in Database)**

#### Step 1-2: Same as Scenario A

#### Step 3: Registration Form (Step 1)
- User fills:
  - Full Name
  - Gender
  - Email
  - Phone
- Clicks "Next"

#### Step 4: Registration Form (Step 2)
- User fills:
  - Country
  - State (if Nigeria)
  - LGA (if Nigeria)
  - Address
- Clicks "Create Account"

#### Step 5: Create Donor Record
- **API Call**: `POST /api/donors`
- **Backend**: Creates new record in `donors` table
- **Response**: Returns donor object with `id`

#### Step 6-9: Same as Scenario A (Steps 6-9)
- Session creation prompt
- User creates account
- Session stored
- User makes donation

---

### **Scenario C: Returning User (Already Has Session)**

#### Step 1: User Clicks "Donate"
- System checks localStorage for `donor_session_id`
- If found, calls `POST /api/donor-sessions/me` with `{ session_id: 5 }`
- **Backend**: Verifies session, returns donor data
- **Frontend**: 
  - Sets `isAuthenticated = true`
  - Sets `user = donor object`
  - Pre-fills donation form

#### Step 2: Make Donation
- User sees pre-filled form
- Enters amount
- Clicks payment button
- Payment processed

---

## 🔄 Key Components & Their Roles

### 1. **AuthContext** (`src/contexts/AuthContext.js`)
- **State Management**:
  - `isAuthenticated` - Boolean indicating login status
  - `sessionId` - Current session ID
  - `username` - Current username
  - `user` - Donor data

- **Methods**:
  - `register({ username, password, donor_id })` - Creates session
  - `login({ username, password })` - Logs in
  - `logout()` - Logs out
  - `checkSession()` - Verifies session on app load
  - `createDonor(donorData)` - Creates donor record
  - `updateDonor(id, donorData)` - Updates donor record
  - `searchAlumni({ regNumber, email, phone })` - Searches for alumni

### 2. **Donations.js** (`src/pages/Donations.js`)
- **Accessible Without Authentication** (removed ProtectedRoute wrapper)
- **Three Main Steps**:
  1. `alumni-search` - Search for alumni record
  2. `registration` - Register as new supporter
  3. `donation` - Make donation

- **Session Creation Integration**:
  - After `createDonor()` or `updateDonor()` succeeds
  - Checks `if (!isAuthenticated && donor?.id)`
  - Shows `SessionCreationModal`
  - On success, proceeds to donation

### 3. **SessionCreationModal** (`src/components/SessionCreationModal.js`)
- **Purpose**: Collect username/password to create session
- **Props**:
  - `isOpen` - Boolean to show/hide
  - `onClose` - Callback when closed
  - `donorId` - Donor ID to link session
  - `onSuccess` - Callback when session created

- **Validation**:
  - Username: min 3 characters
  - Password: min 6 characters
  - Passwords must match

### 4. **ProtectedRoute** (`src/components/ProtectedRoute.js`)
- **Purpose**: Protect routes that require authentication
- **Behavior**:
  - Checks `isAuthenticated` from AuthContext
  - Shows loading spinner while checking
  - Redirects to `/login` if not authenticated
  - Preserves intended location for post-login redirect

---

## 🗄️ Database Flow

### Tables Involved:

1. **`donors` Table**
   - Stores donor information
   - Fields: `id`, `name`, `surname`, `other_name`, `email`, `phone`, etc.
   - Created via `POST /api/donors`
   - Updated via `PUT /api/donors/{id}`

2. **`donor_sessions` Table**
   - Stores authentication sessions
   - Fields: `id` (session_id), `username`, `password` (hashed), `donor_id`
   - Created via `POST /api/donor-sessions/register`
   - Links to `donors` via `donor_id` foreign key

3. **`donations` Table**
   - Stores donation records
   - Fields: `id`, `donor_id`, `project_id`, `amount`, `status`, etc.
   - Created via payment webhook or `POST /api/donations`

---

## 🔐 Authentication Flow

### On App Load:
1. `AuthProvider` calls `checkSession()` in `useEffect`
2. Checks localStorage for `donor_session_id`
3. If found, calls `POST /api/donor-sessions/me` with `{ session_id: X }`
4. Backend verifies session, returns donor data
5. Frontend updates state: `isAuthenticated = true`, `user = donor`

### On Login:
1. User enters username/password
2. Calls `POST /api/donor-sessions/login`
3. Backend validates credentials
4. Returns `{ session_id, username, donor }`
5. Frontend stores in localStorage and updates state

### On Logout:
1. Calls `POST /api/donor-sessions/logout`
2. Clears localStorage
3. Updates state: `isAuthenticated = false`, `user = null`

---

## 🎨 UI/UX Flow

### Visual States:

1. **Not Authenticated**:
   - Shows "First time here?" banner
   - Shows "I'm an ABU Alumni" and "New Supporter" buttons
   - Donation form visible but prompts for session creation after donor operations

2. **Authenticated**:
   - Shows welcome message with user name
   - Pre-fills donation form
   - No "First time here?" banner
   - Can make donations immediately

3. **Session Creation Modal**:
   - Appears after donor creation/update
   - Cannot be dismissed (must create account or close)
   - On success, automatically proceeds to donation

---

## ✅ What Was Changed

1. **App.js**:
   - Removed `ProtectedRoute` wrapper from `/donations` route
   - Made donations page accessible without authentication

2. **Donations.js**:
   - Added `isAuthenticated` check from AuthContext
   - Added session creation modal state
   - Integrated modal after `createDonor()` and `updateDonor()`
   - Updated "First time here?" condition to check `!isAuthenticated`

3. **New Component: SessionCreationModal.js**:
   - Created modal for username/password collection
   - Validates input
   - Calls `register()` from AuthContext
   - Handles success/error states

4. **AuthContext.js** (already implemented):
   - `register()` method creates session
   - Stores session in localStorage
   - Updates authentication state

---

## 🚀 How to Use

### For New Users:
1. Click "Donate" → Goes to `/donations`
2. Click "I'm an ABU Alumni" or "New Supporter"
3. Search/Register → Get donor record
4. Update/Create donor → Modal appears
5. Create username/password → Account created
6. Make donation → Payment processed

### For Returning Users:
1. Click "Donate" → System checks session
2. If valid → Pre-filled form, make donation
3. If invalid → Shows "First time here?" section

---

## 🔍 Testing Checklist

- [ ] New user can access `/donations` without login
- [ ] Alumni search works (reg number, email, phone)
- [ ] Alumni update saves to database
- [ ] New supporter registration creates donor
- [ ] Session creation modal appears after donor operations
- [ ] Session creation saves to `donor_sessions` table
- [ ] User is authenticated after session creation
- [ ] Donation form accessible after authentication
- [ ] Payment processing works
- [ ] Returning user session persists on refresh
- [ ] Logout clears session and redirects to login

---

## 📝 Notes

- **Device Recognition**: Still works as fallback if no session exists
- **Session Persistence**: Sessions stored in localStorage, verified on app load
- **Error Handling**: All API calls have proper error handling and user feedback
- **Validation**: Username (min 3), Password (min 6), Passwords must match
- **Security**: Passwords are hashed on backend, never stored in plain text

