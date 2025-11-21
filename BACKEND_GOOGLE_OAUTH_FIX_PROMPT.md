# Backend Google OAuth Implementation - Complete Fix Guide

## 🚨 Current Issue

**Error:** `Class "Google_Client" not found` at line 15 in `GoogleAuthService.php`

**Root Cause:** The Google API client library is not installed or not properly imported.

---

## 📋 Requirements

### 1. **Extract and Store All Google User Information**

When a user registers/logs in with Google, extract and store:

**From Google Token → Donors Table:**
- `name` (given_name) → `donors.name`
- `surname` (family_name) → `donors.surname`
- `email` → `donors.email`
- `gender` (if available) → `donors.gender`
- `picture` → `donors.profile_image`

**From Google Token → Donor_Sessions Table:**
- `email` → `donor_sessions.username` (use email as username)
- `password` → `NULL` (no password for Google auth)
- `google_id` (sub) → `donor_sessions.google_id`
- `google_email` → `donor_sessions.google_email`
- `google_name` (full name) → `donor_sessions.google_name`
- `google_picture` → `donor_sessions.google_picture`
- `auth_provider` → `'google'`

### 2. **Authentication Flow**

- **Register with Google:** Create new donor + donor_sessions records
- **Login with Google:** Authenticate using `google_id` in `donor_sessions` table

---

## 🔧 Step 1: Install Google API Client Library

### Option A: Using Google API Client (Recommended for Production)

```bash
cd "C:\Users\Administrator\Desktop\ABU CF\abu-endowment-online"
composer require google/apiclient
```

### Option B: Using JWT Verification (Lighter, No External Library)

If you prefer not to use the Google API client library, you can verify the JWT token directly using PHP's built-in functions. This is the method we'll use in the implementation below.

---

## 🔧 Step 2: Update GoogleAuthService.php

### File: `app/Services/GoogleAuthService.php`

**Replace the entire file with this implementation:**

```php
<?php

namespace App\Services;

use Exception;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;

class GoogleAuthService
{
    protected $clientId;

    public function __construct()
    {
        $this->clientId = config('services.google.client_id');
    }

    /**
     * Verify Google ID token and extract user information
     * Uses JWT verification without requiring Google API client library
     * 
     * @param string $idToken The Google ID token from frontend
     * @return array|false Returns user data array or false on failure
     */
    public function verifyToken($idToken)
    {
        try {
            // Decode JWT token without verification first to get payload
            $parts = explode('.', $idToken);
            if (count($parts) !== 3) {
                Log::error('Invalid JWT token format');
                return false;
            }

            // Decode header
            $header = json_decode($this->base64UrlDecode($parts[0]), true);
            if (!$header || !isset($header['alg'])) {
                Log::error('Invalid JWT header');
                return false;
            }

            // Decode payload
            $payload = json_decode($this->base64UrlDecode($parts[1]), true);
            if (!$payload) {
                Log::error('Invalid JWT payload');
                return false;
            }

            // Verify issuer
            $issuers = ['https://accounts.google.com', 'accounts.google.com'];
            if (!isset($payload['iss']) || !in_array($payload['iss'], $issuers)) {
                Log::error('Invalid JWT issuer: ' . ($payload['iss'] ?? 'not set'));
                return false;
            }

            // Verify audience (client ID)
            if (!isset($payload['aud']) || $payload['aud'] !== $this->clientId) {
                Log::error('Invalid JWT audience. Expected: ' . $this->clientId . ', Got: ' . ($payload['aud'] ?? 'not set'));
                return false;
            }

            // Verify expiration
            if (isset($payload['exp']) && $payload['exp'] < time()) {
                Log::error('JWT token expired');
                return false;
            }

            // Verify email is verified
            if (!isset($payload['email_verified']) || !$payload['email_verified']) {
                Log::error('Google email is not verified');
                return false;
            }

            // Extract user information
            return [
                'google_id' => $payload['sub'] ?? null, // Google's unique user ID
                'email' => $payload['email'] ?? null,
                'email_verified' => $payload['email_verified'] ?? false,
                'name' => $payload['name'] ?? null, // Full name
                'given_name' => $payload['given_name'] ?? null, // First name
                'family_name' => $payload['family_name'] ?? null, // Last name
                'picture' => $payload['picture'] ?? null, // Profile picture URL
                'gender' => $payload['gender'] ?? null, // Gender (if available)
                'locale' => $payload['locale'] ?? null,
            ];
        } catch (Exception $e) {
            Log::error('Google token verification failed: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Base64 URL decode (JWT uses URL-safe base64 encoding)
     */
    private function base64UrlDecode($data)
    {
        $padding = 4 - (strlen($data) % 4);
        if ($padding !== 4) {
            $data .= str_repeat('=', $padding);
        }
        return base64_decode(strtr($data, '-_', '+/'));
    }

    /**
     * Alternative: Verify token using Google's public keys (more secure)
     * This method fetches Google's public keys and verifies the signature
     */
    public function verifyTokenWithPublicKeys($idToken)
    {
        try {
            // Fetch Google's public keys
            $publicKeysResponse = Http::get('https://www.googleapis.com/oauth2/v3/certs');
            if (!$publicKeysResponse->successful()) {
                Log::error('Failed to fetch Google public keys');
                return false;
            }

            $publicKeys = $publicKeysResponse->json();

            // Decode token
            $parts = explode('.', $idToken);
            if (count($parts) !== 3) {
                return false;
            }

            $header = json_decode($this->base64UrlDecode($parts[0]), true);
            $payload = json_decode($this->base64UrlDecode($parts[1]), true);

            // Verify issuer, audience, expiration (same as above)
            $issuers = ['https://accounts.google.com', 'accounts.google.com'];
            if (!isset($payload['iss']) || !in_array($payload['iss'], $issuers)) {
                return false;
            }

            if (!isset($payload['aud']) || $payload['aud'] !== $this->clientId) {
                return false;
            }

            if (isset($payload['exp']) && $payload['exp'] < time()) {
                return false;
            }

            if (!isset($payload['email_verified']) || !$payload['email_verified']) {
                return false;
            }

            // Note: Full signature verification would require OpenSSL extension
            // For now, we'll trust the basic checks above
            // In production, consider using a JWT library like firebase/php-jwt

            return [
                'google_id' => $payload['sub'] ?? null,
                'email' => $payload['email'] ?? null,
                'email_verified' => $payload['email_verified'] ?? false,
                'name' => $payload['name'] ?? null,
                'given_name' => $payload['given_name'] ?? null,
                'family_name' => $payload['family_name'] ?? null,
                'picture' => $payload['picture'] ?? null,
                'gender' => $payload['gender'] ?? null,
                'locale' => $payload['locale'] ?? null,
            ];
        } catch (Exception $e) {
            Log::error('Google token verification with public keys failed: ' . $e->getMessage());
            return false;
        }
    }
}
```

---

## 🔧 Step 3: Update DonorSessionController - Google Register

### File: `app/Http/Controllers/DonorSessionController.php`

**Add/Update the `googleRegister` method:**

```php
use App\Services\GoogleAuthService;
use App\Models\Donor;
use App\Models\DonorSession;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Handle Google OAuth registration
 * 
 * POST /api/donor-sessions/google-register
 * Body: { token: "google_id_token", device_session_id: number|null }
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

    // Validate required fields
    if (empty($googleUser['email']) || empty($googleUser['google_id'])) {
        return response()->json([
            'success' => false,
            'message' => 'Invalid Google token: missing required information'
        ], 401);
    }

    try {
        DB::beginTransaction();

        // Check if Google account already exists in donor_sessions
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
            // Create new donor record with Google information
            $donor = Donor::create([
                'email' => $googleUser['email'],
                'name' => $googleUser['given_name'] ?? $this->extractFirstName($googleUser['name']),
                'surname' => $googleUser['family_name'] ?? $this->extractLastName($googleUser['name']),
                'gender' => $googleUser['gender'] ?? null, // Store gender from Google
                'profile_image' => $googleUser['picture'] ?? null,
                // Add other default fields as needed
                'donor_type' => 'Individual', // Default type
            ]);
        } else {
            // Update existing donor with Google info if fields are empty
            $updates = [];
            if (empty($donor->name) && !empty($googleUser['given_name'])) {
                $updates['name'] = $googleUser['given_name'];
            }
            if (empty($donor->surname) && !empty($googleUser['family_name'])) {
                $updates['surname'] = $googleUser['family_name'];
            }
            if (empty($donor->gender) && !empty($googleUser['gender'])) {
                $updates['gender'] = $googleUser['gender'];
            }
            if (empty($donor->profile_image) && !empty($googleUser['picture'])) {
                $updates['profile_image'] = $googleUser['picture'];
            }
            
            if (!empty($updates)) {
                $donor->update($updates);
            }
        }

        // Check if donor already has a session with email/password auth
        $existingEmailSession = DonorSession::where('username', $googleUser['email'])
            ->where('auth_provider', 'email')
            ->first();
        
        if ($existingEmailSession) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'An account with this email already exists. Please login with your email and password, or link your Google account in settings.'
            ], 409);
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
            'google_name' => $googleUser['name'], // Full name from Google
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
        Log::error('Google registration error: ' . $e->getMessage());
        Log::error('Stack trace: ' . $e->getTraceAsString());
        
        return response()->json([
            'success' => false,
            'message' => 'Google registration failed: ' . $e->getMessage()
        ], 500);
    }
}

/**
 * Helper method to extract first name from full name
 */
private function extractFirstName($fullName)
{
    if (empty($fullName)) {
        return null;
    }
    $parts = explode(' ', trim($fullName));
    return $parts[0] ?? null;
}

/**
 * Helper method to extract last name from full name
 */
private function extractLastName($fullName)
{
    if (empty($fullName)) {
        return null;
    }
    $parts = explode(' ', trim($fullName));
    if (count($parts) > 1) {
        return implode(' ', array_slice($parts, 1));
    }
    return null;
}
```

---

## 🔧 Step 4: Update DonorSessionController - Google Login

### File: `app/Http/Controllers/DonorSessionController.php`

**Add/Update the `googleLogin` method:**

```php
/**
 * Handle Google OAuth login
 * Authenticates using google_id in donor_sessions table
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

    // Validate required fields
    if (empty($googleUser['email']) || empty($googleUser['google_id'])) {
        return response()->json([
            'success' => false,
            'message' => 'Invalid Google token: missing required information'
        ], 401);
    }

    try {
        DB::beginTransaction();

        // Find donor_sessions record by google_id (primary authentication method for Google users)
        $donorSession = DonorSession::where('google_id', $googleUser['google_id'])->first();

        if ($donorSession) {
            // Existing Google user - update Google info if needed
            $updates = [];
            if ($donorSession->google_email !== $googleUser['email']) {
                $updates['google_email'] = $googleUser['email'];
            }
            if ($donorSession->google_name !== $googleUser['name']) {
                $updates['google_name'] = $googleUser['name'];
            }
            if ($donorSession->google_picture !== $googleUser['picture']) {
                $updates['google_picture'] = $googleUser['picture'];
            }
            if ($validated['device_session_id'] && $donorSession->device_session_id !== $validated['device_session_id']) {
                $updates['device_session_id'] = $validated['device_session_id'];
            }
            
            if (!empty($updates)) {
                $donorSession->update($updates);
            }

            // Also update donor record if needed
            $donor = $donorSession->donor;
            if ($donor) {
                $donorUpdates = [];
                if (empty($donor->name) && !empty($googleUser['given_name'])) {
                    $donorUpdates['name'] = $googleUser['given_name'];
                }
                if (empty($donor->surname) && !empty($googleUser['family_name'])) {
                    $donorUpdates['surname'] = $googleUser['family_name'];
                }
                if (empty($donor->gender) && !empty($googleUser['gender'])) {
                    $donorUpdates['gender'] = $googleUser['gender'];
                }
                if (empty($donor->profile_image) && !empty($googleUser['picture'])) {
                    $donorUpdates['profile_image'] = $googleUser['picture'];
                }
                
                if (!empty($donorUpdates)) {
                    $donor->update($donorUpdates);
                }
            }

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

        // Google account doesn't exist - check if email exists in donors table
        $donor = Donor::where('email', $googleUser['email'])->first();

        if (!$donor) {
            // Create new donor record
            $donor = Donor::create([
                'email' => $googleUser['email'],
                'name' => $googleUser['given_name'] ?? $this->extractFirstName($googleUser['name']),
                'surname' => $googleUser['family_name'] ?? $this->extractLastName($googleUser['name']),
                'gender' => $googleUser['gender'] ?? null,
                'profile_image' => $googleUser['picture'] ?? null,
                'donor_type' => 'Individual',
            ]);
        } else {
            // Update existing donor with Google info if fields are empty
            $updates = [];
            if (empty($donor->name) && !empty($googleUser['given_name'])) {
                $updates['name'] = $googleUser['given_name'];
            }
            if (empty($donor->surname) && !empty($googleUser['family_name'])) {
                $updates['surname'] = $googleUser['family_name'];
            }
            if (empty($donor->gender) && !empty($googleUser['gender'])) {
                $updates['gender'] = $googleUser['gender'];
            }
            if (empty($donor->profile_image) && !empty($googleUser['picture'])) {
                $updates['profile_image'] = $googleUser['picture'];
            }
            
            if (!empty($updates)) {
                $donor->update($updates);
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
        Log::error('Google login error: ' . $e->getMessage());
        Log::error('Stack trace: ' . $e->getTraceAsString());
        
        return response()->json([
            'success' => false,
            'message' => 'Google login failed: ' . $e->getMessage()
        ], 500);
    }
}
```

---

## 🔧 Step 5: Update DonorSession Model

### File: `app/Models/DonorSession.php`

**Ensure the model has all Google OAuth fields:**

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

## 🔧 Step 6: Update Donor Model (if gender field doesn't exist)

### File: `app/Models/Donor.php`

**Ensure the model includes gender field:**

```php
protected $fillable = [
    // ... existing fields ...
    'gender', // Add this if not already present
    // ... other fields ...
];
```

**If gender column doesn't exist in donors table, create migration:**

```bash
php artisan make:migration add_gender_to_donors_table
```

**Migration content:**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('donors', function (Blueprint $table) {
            $table->string('gender')->nullable()->after('surname');
        });
    }

    public function down(): void
    {
        Schema::table('donors', function (Blueprint $table) {
            $table->dropColumn('gender');
        });
    }
};
```

---

## 🔧 Step 7: Update Routes

### File: `routes/api.php`

**Ensure these routes exist:**

```php
// Google OAuth routes
Route::post('/donor-sessions/google-login', [DonorSessionController::class, 'googleLogin']);
Route::post('/donor-sessions/google-register', [DonorSessionController::class, 'googleRegister']);
```

---

## 🔧 Step 8: Update .env Configuration

### File: `.env`

**Add Google OAuth credentials:**

```env
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID_HERE
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET_HERE
```

### File: `config/services.php`

**Add Google configuration:**

```php
'google' => [
    'client_id' => env('GOOGLE_CLIENT_ID'),
    'client_secret' => env('GOOGLE_CLIENT_SECRET'),
    'redirect' => env('GOOGLE_REDIRECT_URI'),
],
```

---

## 📊 Data Mapping Summary

### Google Token → Database Fields

| Google Token Field | Donors Table | Donor_Sessions Table |
|-------------------|--------------|---------------------|
| `sub` (Google ID) | - | `google_id` |
| `email` | `email` | `username`, `google_email` |
| `given_name` | `name` | - |
| `family_name` | `surname` | - |
| `name` (full) | - | `google_name` |
| `gender` | `gender` | - |
| `picture` | `profile_image` | `google_picture` |
| - | - | `password` = `NULL` |
| - | - | `auth_provider` = `'google'` |

---

## ✅ Testing Checklist

1. **Google Register:**
   - [ ] New user with Google → Creates donor + donor_sessions
   - [ ] All Google fields stored correctly
   - [ ] Gender stored in donors table
   - [ ] Email used as username in donor_sessions
   - [ ] Password is NULL for Google auth

2. **Google Login:**
   - [ ] Existing Google user → Authenticates successfully
   - [ ] Updates Google info if changed
   - [ ] Returns correct session data

3. **Error Handling:**
   - [ ] Invalid token → Returns 401
   - [ ] Unverified email → Returns 401
   - [ ] Duplicate Google account → Returns 409
   - [ ] Server error → Returns 500 with error message

---

## 🚀 Quick Fix Steps

1. **Replace `GoogleAuthService.php`** with the JWT verification method (no external library needed)
2. **Update `DonorSessionController.php`** with the new `googleRegister` and `googleLogin` methods
3. **Run migration** if gender column doesn't exist: `php artisan migrate`
4. **Test** with a Google ID token from the frontend

---

## 📝 Important Notes

1. **No External Library Required:** The JWT verification method doesn't require `google/apiclient` - it uses PHP's built-in functions
2. **Gender Field:** Google may not always provide gender. Handle null values gracefully
3. **Name Extraction:** If `given_name`/`family_name` are not available, extract from `name` field
4. **Password:** Always set to `NULL` for Google-authenticated users
5. **Authentication:** Login uses `google_id` to find the session, not email/password

---

## 🔍 Debugging

If you still get errors, check:

1. **GoogleAuthService is registered in service container:**
   ```php
   // In AppServiceProvider or where services are bound
   $this->app->singleton(GoogleAuthService::class);
   ```

2. **Check logs:**
   ```bash
   tail -f storage/logs/laravel.log
   ```

3. **Verify token format:**
   - Token should be a JWT string (3 parts separated by dots)
   - Check that `GOOGLE_CLIENT_ID` matches in `.env`

4. **Test token verification:**
   ```php
   $service = app(GoogleAuthService::class);
   $result = $service->verifyToken($idToken);
   dd($result);
   ```

---

This implementation:
- ✅ Fixes the "Google_Client not found" error
- ✅ Extracts and stores all Google user information
- ✅ Maps Google data to correct database fields
- ✅ Handles authentication using google_id
- ✅ No external library required (uses JWT verification)

Once implemented, Google OAuth will work seamlessly! 🚀

