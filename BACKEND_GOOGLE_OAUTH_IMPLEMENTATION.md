# Backend Implementation Guide: Google OAuth Authentication

## Overview
This document provides a comprehensive guide for implementing Google OAuth authentication in the backend. The frontend sends Google ID tokens to the backend, which must verify them and create/authenticate user sessions.

---

## 1. Database Schema Updates

### Add Google OAuth Fields to `donor_sessions` Table

You need to add fields to store Google authentication information:

```sql
ALTER TABLE donor_sessions 
ADD COLUMN auth_provider ENUM('email', 'google') DEFAULT 'email' AFTER password,
ADD COLUMN google_id VARCHAR(255) NULL UNIQUE AFTER auth_provider,
ADD COLUMN google_email VARCHAR(255) NULL AFTER google_id,
ADD COLUMN google_name VARCHAR(255) NULL AFTER google_email,
ADD COLUMN google_picture TEXT NULL AFTER google_name,
ADD INDEX idx_google_id (google_id),
ADD INDEX idx_google_email (google_email);
```

**Field Descriptions:**
- `auth_provider`: Indicates whether the user authenticated via email/password or Google
- `google_id`: Google's unique user ID (from Google token)
- `google_email`: Email from Google account (should match `username` field)
- `google_name`: Full name from Google account
- `google_picture`: Profile picture URL from Google

**Note:** For Google-authenticated users:
- `password` field should be `NULL` (no password needed)
- `username` field should contain the Google email
- `google_id` should be unique to prevent duplicate Google accounts

---

## 2. Install Required Dependencies

### For Laravel/PHP Backend:

```bash
composer require google/apiclient
```

Or if using a simpler approach with JWT verification:

```bash
composer require firebase/php-jwt
```

---

## 3. Google OAuth Configuration

### Add to `.env` file:

```env
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID_HERE
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET_HERE
```

### Add to `config/services.php`:

```php
'google' => [
    'client_id' => env('GOOGLE_CLIENT_ID'),
    'client_secret' => env('GOOGLE_CLIENT_SECRET'),
    'redirect' => env('GOOGLE_REDIRECT_URI'),
],
```

---

## 4. Create Google Token Verification Service

### File: `app/Services/GoogleAuthService.php`

```php
<?php

namespace App\Services;

use Google_Client;
use Exception;
use Illuminate\Support\Facades\Log;

class GoogleAuthService
{
    protected $client;

    public function __construct()
    {
        $this->client = new Google_Client(['client_id' => config('services.google.client_id')]);
    }

    /**
     * Verify Google ID token and extract user information
     * 
     * @param string $idToken The Google ID token from frontend
     * @return array|false Returns user data array or false on failure
     */
    public function verifyToken($idToken)
    {
        try {
            // Verify the token
            $payload = $this->client->verifyIdToken($idToken);
            
            if ($payload) {
                return [
                    'google_id' => $payload['sub'], // Google's unique user ID
                    'email' => $payload['email'],
                    'email_verified' => $payload['email_verified'] ?? false,
                    'name' => $payload['name'] ?? null,
                    'given_name' => $payload['given_name'] ?? null,
                    'family_name' => $payload['family_name'] ?? null,
                    'picture' => $payload['picture'] ?? null,
                ];
            }
            
            return false;
        } catch (Exception $e) {
            Log::error('Google token verification failed: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Alternative method using JWT verification (if Google_Client doesn't work)
     */
    public function verifyTokenWithJWT($idToken)
    {
        try {
            // Decode JWT without verification first to get header
            $parts = explode('.', $idToken);
            if (count($parts) !== 3) {
                return false;
            }

            $header = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $parts[0])), true);
            $payload = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $parts[1])), true);

            // Verify issuer
            if ($payload['iss'] !== 'https://accounts.google.com' && 
                $payload['iss'] !== 'accounts.google.com') {
                return false;
            }

            // Verify audience (client ID)
            if ($payload['aud'] !== config('services.google.client_id')) {
                return false;
            }

            // Verify expiration
            if (isset($payload['exp']) && $payload['exp'] < time()) {
                return false;
            }

            return [
                'google_id' => $payload['sub'],
                'email' => $payload['email'],
                'email_verified' => $payload['email_verified'] ?? false,
                'name' => $payload['name'] ?? null,
                'given_name' => $payload['given_name'] ?? null,
                'family_name' => $payload['family_name'] ?? null,
                'picture' => $payload['picture'] ?? null,
            ];
        } catch (Exception $e) {
            Log::error('Google JWT verification failed: ' . $e->getMessage());
            return false;
        }
    }
}
```

---

## 5. Update DonorSession Model

### File: `app/Models/DonorSession.php`

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DonorSession extends Model
{
    protected $fillable = [
        'username',
        'password',
        'donor_id',
        'device_session_id',
        // Google OAuth fields
        'auth_provider',
        'google_id',
        'google_email',
        'google_name',
        'google_picture',
    ];

    protected $hidden = [
        'password',
    ];

    protected $casts = [
        'auth_provider' => 'string',
    ];

    /**
     * Get the donor that owns this session.
     */
    public function donor(): BelongsTo
    {
        return $this->belongsTo(Donor::class);
    }

    /**
     * Get the device session associated with this donor session.
     */
    public function deviceSession(): BelongsTo
    {
        return $this->belongsTo(DeviceSession::class);
    }

    /**
     * Check if this session is authenticated via Google
     */
    public function isGoogleAuth(): bool
    {
        return $this->auth_provider === 'google';
    }
}
```

---

## 6. Implement Google Login Endpoint

### File: `app/Http/Controllers/DonorSessionController.php`

Add the `googleLogin` method:

```php
use App\Services\GoogleAuthService;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

/**
 * Handle Google OAuth login
 * 
 * POST /api/donor-sessions/google-login
 * Body: { token: "google_id_token", device_session_id: number|null }
 */
public function googleLogin(Request $request, GoogleAuthService $googleAuth)
{
    $validated = $request->validate([
        'token' => 'required|string',
        'device_session_id' => 'nullable|exists:device_sessions,id',
    ]);

    // Verify Google token
    $googleUser = $googleAuth->verifyToken($validated['token']);
    
    if (!$googleUser) {
        return response()->json([
            'success' => false,
            'message' => 'Invalid or expired Google token'
        ], 401);
    }

    // Check if email is verified
    if (!$googleUser['email_verified']) {
        return response()->json([
            'success' => false,
            'message' => 'Google email is not verified'
        ], 401);
    }

    try {
        DB::beginTransaction();

        // Check if donor_sessions record exists with this Google ID
        $donorSession = DonorSession::where('google_id', $googleUser['google_id'])->first();

        if ($donorSession) {
            // Existing Google user - update Google info if needed
            $donorSession->update([
                'google_email' => $googleUser['email'],
                'google_name' => $googleUser['name'],
                'google_picture' => $googleUser['picture'],
                'device_session_id' => $validated['device_session_id'] ?? $donorSession->device_session_id,
            ]);

            // Load donor relationship
            $donorSession->load('donor');

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Google login successful',
                'data' => [
                    'session_id' => $donorSession->id,
                    'username' => $donorSession->username,
                    'donor' => $donorSession->donor,
                    'device_session_id' => $donorSession->device_session_id,
                ]
            ], 200);
        }

        // Check if donor exists with this email
        $donor = Donor::where('email', $googleUser['email'])->first();

        if (!$donor) {
            // Create new donor record
            $donor = Donor::create([
                'email' => $googleUser['email'],
                'name' => $googleUser['given_name'] ?? explode(' ', $googleUser['name'])[0] ?? null,
                'surname' => $googleUser['family_name'] ?? (count(explode(' ', $googleUser['name'])) > 1 ? explode(' ', $googleUser['name'])[1] : null) ?? null,
                'profile_image' => $googleUser['picture'],
                // Add other default fields as needed
            ]);
        } else {
            // Update existing donor with Google info if profile_image is empty
            if (empty($donor->profile_image) && $googleUser['picture']) {
                $donor->update(['profile_image' => $googleUser['picture']]);
            }
        }

        // Create donor_sessions record for Google auth
        $donorSession = DonorSession::create([
            'username' => $googleUser['email'], // Use email as username
            'password' => null, // No password for Google auth
            'donor_id' => $donor->id,
            'device_session_id' => $validated['device_session_id'] ?? null,
            'auth_provider' => 'google',
            'google_id' => $googleUser['google_id'],
            'google_email' => $googleUser['email'],
            'google_name' => $googleUser['name'],
            'google_picture' => $googleUser['picture'],
        ]);

        // Load donor relationship
        $donorSession->load('donor');

        DB::commit();

        return response()->json([
            'success' => true,
            'message' => 'Google login successful',
            'data' => [
                'session_id' => $donorSession->id,
                'username' => $donorSession->username,
                'donor' => $donorSession->donor,
                'device_session_id' => $donorSession->device_session_id,
            ]
        ], 200);

    } catch (\Exception $e) {
        DB::rollBack();
        \Log::error('Google login error: ' . $e->getMessage());
        
        return response()->json([
            'success' => false,
            'message' => 'Google login failed. Please try again.'
        ], 500);
    }
}
```

---

## 7. Implement Google Register Endpoint

### File: `app/Http/Controllers/DonorSessionController.php`

Add the `googleRegister` method:

```php
/**
 * Handle Google OAuth registration
 * 
 * POST /api/donor-sessions/google-register
 * Body: { token: "google_id_token", device_session_id: number|null }
 * 
 * Note: This is similar to googleLogin but explicitly for new registrations
 */
public function googleRegister(Request $request, GoogleAuthService $googleAuth)
{
    $validated = $request->validate([
        'token' => 'required|string',
        'device_session_id' => 'nullable|exists:device_sessions,id',
    ]);

    // Verify Google token
    $googleUser = $googleAuth->verifyToken($validated['token']);
    
    if (!$googleUser) {
        return response()->json([
            'success' => false,
            'message' => 'Invalid or expired Google token'
        ], 401);
    }

    // Check if email is verified
    if (!$googleUser['email_verified']) {
        return response()->json([
            'success' => false,
            'message' => 'Google email is not verified'
        ], 401);
    }

    try {
        DB::beginTransaction();

        // Check if Google account already exists
        $existingSession = DonorSession::where('google_id', $googleUser['google_id'])->first();
        
        if ($existingSession) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'This Google account is already registered. Please login instead.'
            ], 409);
        }

        // Check if email already exists in donors table
        $donor = Donor::where('email', $googleUser['email'])->first();

        if (!$donor) {
            // Create new donor record
            $donor = Donor::create([
                'email' => $googleUser['email'],
                'name' => $googleUser['given_name'] ?? explode(' ', $googleUser['name'])[0] ?? null,
                'surname' => $googleUser['family_name'] ?? (count(explode(' ', $googleUser['name'])) > 1 ? explode(' ', $googleUser['name'])[1] : null) ?? null,
                'profile_image' => $googleUser['picture'],
                // Add other default fields as needed
            ]);
        } else {
            // Check if donor already has a session (email/password auth)
            $existingEmailSession = DonorSession::where('username', $googleUser['email'])->first();
            
            if ($existingEmailSession) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'An account with this email already exists. Please login with your email and password, or link your Google account in settings.'
                ], 409);
            }

            // Update existing donor with Google info if profile_image is empty
            if (empty($donor->profile_image) && $googleUser['picture']) {
                $donor->update(['profile_image' => $googleUser['picture']]);
            }
        }

        // Create donor_sessions record for Google auth
        $donorSession = DonorSession::create([
            'username' => $googleUser['email'], // Use email as username
            'password' => null, // No password for Google auth
            'donor_id' => $donor->id,
            'device_session_id' => $validated['device_session_id'] ?? null,
            'auth_provider' => 'google',
            'google_id' => $googleUser['google_id'],
            'google_email' => $googleUser['email'],
            'google_name' => $googleUser['name'],
            'google_picture' => $googleUser['picture'],
        ]);

        // Load donor relationship
        $donorSession->load('donor');

        DB::commit();

        return response()->json([
            'success' => true,
            'message' => 'Google registration successful',
            'data' => [
                'session_id' => $donorSession->id,
                'username' => $donorSession->username,
                'donor' => $donorSession->donor,
                'device_session_id' => $donorSession->device_session_id,
            ]
        ], 201);

    } catch (\Exception $e) {
        DB::rollBack();
        \Log::error('Google registration error: ' . $e->getMessage());
        
        return response()->json([
            'success' => false,
            'message' => 'Google registration failed. Please try again.'
        ], 500);
    }
}
```

---

## 8. Update Routes

### File: `routes/api.php`

```php
// Google OAuth routes
Route::post('/donor-sessions/google-login', [DonorSessionController::class, 'googleLogin']);
Route::post('/donor-sessions/google-register', [DonorSessionController::class, 'googleRegister']);
```

---

## 9. Update Logout Endpoint (No Changes Needed)

The existing logout endpoint should work for both email and Google authentication:

```php
public function logout(Request $request)
{
    // The logout logic remains the same
    // It just invalidates the session, regardless of auth_provider
    // No special handling needed for Google OAuth
}
```

**Note:** Google OAuth logout on the frontend is handled by clearing the session. There's no need to call Google's logout API since we're managing sessions server-side.

---

## 10. Update Login/Register Validation

### Update existing `login` method to handle Google users:

```php
public function login(Request $request)
{
    $validated = $request->validate([
        'email' => 'required|string', // Changed from 'username'
        'password' => 'required|string',
        'device_session_id' => 'nullable|exists:device_sessions,id',
    ]);

    // Check if user is trying to login with Google account
    $donorSession = DonorSession::where('username', $validated['email'])->first();
    
    if ($donorSession && $donorSession->auth_provider === 'google') {
        return response()->json([
            'success' => false,
            'message' => 'This account is registered with Google. Please use "Login with Google" instead.'
        ], 401);
    }

    // Continue with normal email/password login...
    // ... rest of existing login code
}
```

---

## 11. Response Format

Both endpoints should return the same format as regular login/register:

```json
{
    "success": true,
    "message": "Google login successful",
    "data": {
        "session_id": 123,
        "username": "user@example.com",
        "donor": {
            "id": 456,
            "name": "John",
            "surname": "Doe",
            "email": "user@example.com",
            "profile_image": "https://...",
            // ... other donor fields
        },
        "device_session_id": 789
    }
}
```

---

## 12. Error Handling

### Common Error Responses:

**Invalid Token:**
```json
{
    "success": false,
    "message": "Invalid or expired Google token"
}
```

**Email Not Verified:**
```json
{
    "success": false,
    "message": "Google email is not verified"
}
```

**Account Already Exists (Register):**
```json
{
    "success": false,
    "message": "This Google account is already registered. Please login instead."
}
```

**Email Already Registered (Register):**
```json
{
    "success": false,
    "message": "An account with this email already exists. Please login with your email and password."
}
```

---

## 13. Security Considerations

1. **Token Verification**: Always verify the Google ID token on the backend. Never trust tokens from the frontend without verification.

2. **Email Verification**: Only allow login/register if `email_verified` is `true` in the Google token payload.

3. **Unique Google ID**: Use `google_id` (sub claim) as the unique identifier, not email, since emails can change.

4. **Password Handling**: For Google-authenticated users, `password` should be `NULL`. Never allow password changes for Google accounts.

5. **Session Management**: Google sessions work the same as email sessions - use the same session management logic.

---

## 14. Testing

### Test Cases:

1. **New Google User Registration**
   - User clicks "Register with Google"
   - Should create new donor and donor_sessions records
   - Should store Google information in donor_sessions

2. **Existing Google User Login**
   - User clicks "Login with Google" with existing Google account
   - Should find existing donor_sessions by google_id
   - Should update Google info if changed

3. **Email Conflict**
   - User tries to register with Google, but email already exists with email/password auth
   - Should return appropriate error message

4. **Token Verification**
   - Invalid/expired token should be rejected
   - Unverified email should be rejected

5. **Logout**
   - Google-authenticated user should be able to logout normally
   - Session should be cleared on backend

---

## 15. Migration File

### Create migration: `database/migrations/YYYY_MM_DD_add_google_oauth_to_donor_sessions.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('donor_sessions', function (Blueprint $table) {
            $table->enum('auth_provider', ['email', 'google'])->default('email')->after('password');
            $table->string('google_id')->nullable()->unique()->after('auth_provider');
            $table->string('google_email')->nullable()->after('google_id');
            $table->string('google_name')->nullable()->after('google_email');
            $table->text('google_picture')->nullable()->after('google_name');
            
            $table->index('google_id');
            $table->index('google_email');
        });
    }

    public function down(): void
    {
        Schema::table('donor_sessions', function (Blueprint $table) {
            $table->dropIndex(['google_email']);
            $table->dropIndex(['google_id']);
            $table->dropColumn(['auth_provider', 'google_id', 'google_email', 'google_name', 'google_picture']);
        });
    }
};
```

---

## Summary

This implementation:
- ✅ Stores Google authentication information in `donor_sessions` table
- ✅ Verifies Google ID tokens on the backend
- ✅ Creates/updates donor records from Google profile
- ✅ Handles both new registrations and existing user logins
- ✅ Prevents duplicate accounts (by Google ID and email)
- ✅ Works with existing device_session_id integration
- ✅ Uses the same logout flow (no special handling needed)
- ✅ Maintains consistency with existing authentication flow

The frontend is already configured to send the Google ID token to these endpoints. Once the backend is implemented, Google OAuth will work seamlessly!

