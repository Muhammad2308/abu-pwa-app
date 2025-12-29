# BACKEND PROMPT: Fix Donor Registration Issue

## Problem Statement
User registration is not creating donor records in the production database. When users register via the frontend (both email/password and Google OAuth), the donor_sessions table is being populated, but the corresponding donor record is not being created in the donors table.

## Current Frontend Flow

### Email/Password Registration:
1. User submits email and password on `/register` page
2. Frontend calls `POST /api/donor-sessions/register` with:
   ```json
   {
     "username": "user@example.com",
     "password": "password123",
     "donor_id": null
   }
   ```
3. After successful session creation, user is prompted to complete their profile
4. Frontend calls `POST /api/donors` with donor details:
   ```json
   {
     "donor_type": "Alumni",
     "name": "John",
     "surname": "Doe",
     "email": "user@example.com",
     "phone": "+2348012345678",
     "address": "123 Main St",
     "state": "Kaduna",
     "city": "Zaria",
     "registration_number": "ABU/2020/001",
     "entry_year": 2020,
     "graduation_year": 2024,
     "faculty_id": 1,
     "department_id": 5
   }
   ```
5. Frontend then links the donor to the session via `PUT /api/donor-sessions/{session_id}` with `{ "donor_id": <new_donor_id> }`

### Google OAuth Registration:
1. User clicks "Sign up with Google"
2. Frontend receives Google ID token
3. Frontend calls `POST /api/donor-sessions/google-register` with:
   ```json
   {
     "token": "<google_id_token>",
     "device_session_id": null
   }
   ```
4. **Expected:** Backend should create both donor_session AND donor record automatically
5. **Actual:** Only donor_session is created, donor record is missing

## Required Backend Fixes

### 1. Verify Donor Creation Endpoint (`POST /api/donors`)
**Check:**
- Is the endpoint accessible and properly authenticated?
- Are all required fields being validated correctly?
- Is the donor record actually being inserted into the database?
- Are there any database constraints preventing insertion?

**Expected Response:**
```json
{
  "success": true,
  "message": "Donor created successfully",
  "data": {
    "id": 123,
    "name": "John",
    "surname": "Doe",
    "email": "user@example.com",
    ...
  }
}
```

### 2. Fix Google OAuth Registration Flow
**Current Issue:** `POST /api/donor-sessions/google-register` is not creating a donor record.

**Required Implementation:**
```php
// In GoogleAuthController or equivalent
public function googleRegister(Request $request)
{
    // 1. Verify Google token
    $googleUser = $this->verifyGoogleToken($request->token);
    
    // 2. Check if donor already exists
    $donor = Donor::where('email', $googleUser->email)->first();
    
    if (!$donor) {
        // 3. Create donor record FIRST
        $donor = Donor::create([
            'email' => $googleUser->email,
            'name' => $googleUser->given_name ?? '',
            'surname' => $googleUser->family_name ?? '',
            'donor_type' => 'Individual', // Default type
            'email_verified_at' => now(), // Google emails are pre-verified
        ]);
    }
    
    // 4. Create donor session with the donor_id
    $session = DonorSession::create([
        'username' => $googleUser->email,
        'donor_id' => $donor->id, // CRITICAL: Link to donor
        'device_session_id' => $request->device_session_id,
        'is_google_account' => true,
    ]);
    
    return response()->json([
        'success' => true,
        'message' => 'Registration successful',
        'data' => [
            'session_id' => $session->id,
            'username' => $session->username,
            'donor' => $donor,
            'device_session_id' => $session->device_session_id,
        ]
    ]);
}
```

### 3. Fix Google OAuth Login - Duplicate Session Error
**Current Issue:** `POST /api/donor-sessions/google-login` throws `UNIQUE constraint failed: donor_sessions.username` when a session already exists.

**Root Cause:** The endpoint tries to create a new session without checking if one already exists for the user.

**Required Fix:**
```php
// In GoogleAuthController or equivalent
public function googleLogin(Request $request)
{
    // 1. Verify Google token
    $googleUser = $this->verifyGoogleToken($request->token);
    
    // 2. Find the donor by email
    $donor = Donor::where('email', $googleUser->email)->first();
    
    if (!$donor) {
        return response()->json([
            'success' => false,
            'message' => 'No account found with this email. Please register first.'
        ], 404);
    }
    
    // 3. Check if a session already exists for this user
    $existingSession = DonorSession::where('username', $googleUser->email)->first();
    
    if ($existingSession) {
        // Update existing session instead of creating new one
        $existingSession->update([
            'device_session_id' => $request->device_session_id,
            'auth_provider' => 'google',
            'google_id' => $googleUser->sub,
            'google_email' => $googleUser->email,
            'google_name' => $googleUser->name,
            'google_picture' => $googleUser->picture,
            'updated_at' => now(),
        ]);
        
        return response()->json([
            'success' => true,
            'message' => 'Login successful',
            'data' => [
                'session_id' => $existingSession->id,
                'username' => $existingSession->username,
                'donor' => $donor,
                'device_session_id' => $existingSession->device_session_id,
            ]
        ]);
    }
    
    // 4. Create new session if none exists
    $session = DonorSession::create([
        'username' => $googleUser->email,
        'donor_id' => $donor->id,
        'device_session_id' => $request->device_session_id,
        'auth_provider' => 'google',
        'google_id' => $googleUser->sub,
        'google_email' => $googleUser->email,
        'google_name' => $googleUser->name,
        'google_picture' => $googleUser->picture,
    ]);
    
    return response()->json([
        'success' => true,
        'message' => 'Login successful',
        'data' => [
            'session_id' => $session->id,
            'username' => $session->username,
            'donor' => $donor,
            'device_session_id' => $session->device_session_id,
        ]
    ]);
}
```

### 3. Validate Donor Table Schema
Ensure the `donors` table has the following structure:

**Required Columns:**
- `id` (Primary Key, Auto Increment)
- `email` (Unique, Nullable)
- `name` (Nullable)
- `surname` (Nullable)
- `other_name` (Nullable)
- `donor_type` (Nullable or Default: 'Individual')
- `phone` (Nullable)
- `address` (Nullable)
- `state` (Nullable)
- `city` (Nullable)
- `lga` (Nullable)
- `registration_number` (Nullable, for Alumni)
- `entry_year` (Nullable, for Alumni)
- `graduation_year` (Nullable, for Alumni)
- `faculty_id` (Nullable, Foreign Key)
- `department_id` (Nullable, Foreign Key)
- `organization_name` (Nullable, for Organizations)
- `email_verified_at` (Nullable, Timestamp)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

**Important:** Make sure there are NO `NOT NULL` constraints on optional fields that would prevent insertion.

### 4. Check Database Permissions
Verify that the database user has `INSERT` permissions on the `donors` table.

### 5. Add Logging for Debugging
Add comprehensive logging to track donor creation:

```php
// In DonorController@store
Log::info('Donor creation attempt', ['data' => $request->all()]);

try {
    $donor = Donor::create($validatedData);
    Log::info('Donor created successfully', ['donor_id' => $donor->id]);
    return response()->json(['success' => true, 'data' => $donor]);
} catch (\Exception $e) {
    Log::error('Donor creation failed', [
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
    return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
}
```

## Testing Checklist

After implementing fixes, test the following scenarios:

1. **Email/Password Registration:**
   - [ ] Register new user with email/password
   - [ ] Verify donor_session is created
   - [ ] Complete profile details
   - [ ] Verify donor record is created in donors table
   - [ ] Verify donor_id is linked to donor_session

2. **Google OAuth Registration:**
   - [ ] Register new user with Google
   - [ ] Verify both donor_session AND donor are created
   - [ ] Verify donor_id is automatically linked to donor_session
   - [ ] Verify email is marked as verified

3. **Duplicate Registration:**
   - [ ] Try to register with existing email
   - [ ] Should return appropriate error (409 Conflict)
   - [ ] Should NOT create duplicate donor records

## Expected API Responses

### Successful Donor Creation:
```json
{
  "success": true,
  "message": "Donor created successfully",
  "data": {
    "id": 123,
    "email": "user@example.com",
    "name": "John",
    "surname": "Doe",
    "donor_type": "Alumni",
    "created_at": "2025-12-28T20:00:00.000000Z"
  }
}
```

### Successful Google Registration:
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "session_id": 456,
    "username": "user@example.com",
    "donor": {
      "id": 123,
      "email": "user@example.com",
      "name": "John",
      "surname": "Doe",
      "email_verified_at": "2025-12-28T20:00:00.000000Z"
    },
    "device_session_id": null
  }
}
```

## Priority
**HIGH** - This is blocking new user registrations in production.
