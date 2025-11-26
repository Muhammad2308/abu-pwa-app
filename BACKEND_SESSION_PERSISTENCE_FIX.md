# Backend Session Persistence Fix - User Logout on Page Refresh

## Problem
Users are being logged out when they refresh the page, even though the frontend is storing the session ID in localStorage and attempting to restore it.

## Current Frontend Implementation

### What the Frontend is Doing:
1. **Session Storage**: Storing `donor_session_id` and `donor_username` in localStorage
2. **Optimistic Restoration**: On page load, immediately restores user state from localStorage
3. **Background Verification**: Calls `POST /api/donor-sessions/me` with `session_id` in the request body to verify the session
4. **Cookie Support**: Using `withCredentials: true` in axios configuration

### Frontend Session Check Flow:
```javascript
// On page refresh, frontend does:
1. Gets donor_session_id from localStorage
2. Optimistically sets user as authenticated
3. Calls: POST /api/donor-sessions/me
   Body: { session_id: <stored_id> }
4. If response is 401 or fails, clears session and logs user out
```

## Root Cause Analysis

The issue is likely one of these backend problems:

### Issue 1: Session Not Being Maintained Server-Side
**Symptom**: Backend returns 401 when frontend sends the session_id
**Cause**: Laravel session is not persisting across requests

### Issue 2: CORS/Cookie Configuration
**Symptom**: Cookies are not being sent/received properly
**Cause**: Missing CORS headers or SameSite cookie settings

### Issue 3: Session Validation Logic
**Symptom**: Backend doesn't recognize the session_id
**Cause**: Session lookup or validation failing

## Required Backend Fixes

### Fix 1: Verify Session Driver Configuration

Check your `.env` file:
```env
SESSION_DRIVER=database  # or redis, file - NOT cookie
SESSION_LIFETIME=120     # Session lifetime in minutes
SESSION_DOMAIN=localhost # Your domain
SESSION_SECURE_COOKIE=false  # Set to true in production with HTTPS
SESSION_SAME_SITE=lax    # Important for cross-origin requests
```

**Why**: If using `cookie` driver, sessions won't persist properly with SPA applications.

### Fix 2: Update CORS Configuration

In `config/cors.php`:
```php
return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => ['http://localhost:3000'], // Your frontend URL
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true, // CRITICAL: Must be true
];
```

### Fix 3: Fix DonorSessionController `/me` Endpoint

The `/api/donor-sessions/me` endpoint should:

```php
public function getCurrentSession(Request $request)
{
    try {
        // Get session_id from request body
        $sessionId = $request->input('session_id');
        
        if (!$sessionId) {
            return response()->json([
                'success' => false,
                'message' => 'Session ID required'
            ], 400);
        }

        // Find the donor session
        $donorSession = DonorSession::with('donor')->find($sessionId);
        
        if (!$donorSession) {
            return response()->json([
                'success' => false,
                'message' => 'Session not found'
            ], 401);
        }

        // Check if session is still valid (not expired)
        // Add your expiration logic here if needed
        // Example: Check if created_at is within acceptable range
        
        return response()->json([
            'success' => true,
            'data' => [
                'id' => $donorSession->id,
                'username' => $donorSession->username,
                'donor' => $donorSession->donor,
                'device_session_id' => $donorSession->device_session_id,
            ],
            'message' => 'Session valid'
        ]);
        
    } catch (\Exception $e) {
        \Log::error('Get current session error: ' . $e->getMessage());
        return response()->json([
            'success' => false,
            'message' => 'Failed to retrieve session'
        ], 500);
    }
}
```

### Fix 4: Add Session Persistence to Login/Register

Make sure your login and register methods are properly storing sessions:

```php
public function login(Request $request)
{
    // ... your existing validation and authentication logic ...
    
    // After successful authentication:
    $donorSession = DonorSession::create([
        'donor_id' => $donor->id,
        'username' => $request->username,
        'device_session_id' => $request->device_session_id,
        // Add any other fields you need
    ]);
    
    // IMPORTANT: Store in Laravel session as well
    session(['donor_session_id' => $donorSession->id]);
    session(['donor_username' => $donorSession->username]);
    
    return response()->json([
        'success' => true,
        'data' => [
            'session_id' => $donorSession->id,
            'username' => $donorSession->username,
            'donor' => $donor,
            'device_session_id' => $donorSession->device_session_id,
        ]
    ]);
}
```

### Fix 5: Create Sessions Migration (if not exists)

Ensure you have a `sessions` table if using database driver:

```bash
php artisan session:table
php artisan migrate
```

### Fix 6: Add Middleware to Routes

In `routes/api.php`, ensure the `/me` endpoint uses proper middleware:

```php
Route::post('/donor-sessions/me', [DonorSessionController::class, 'getCurrentSession'])
    ->middleware(['api']); // Don't require auth middleware for session check
```

## Testing Steps

1. **Test Session Persistence**:
```bash
# In Laravel tinker
php artisan tinker

# Check if sessions are being stored
DB::table('sessions')->get();
# or
DB::table('donor_sessions')->get();
```

2. **Test the /me Endpoint**:
```bash
# Use Postman or curl
curl -X POST http://localhost:8000/api/donor-sessions/me \
  -H "Content-Type: application/json" \
  -d '{"session_id": 1}'
```

3. **Check Laravel Logs**:
```bash
tail -f storage/logs/laravel.log
```

4. **Enable Query Logging** (temporarily):
```php
// In your controller
\DB::enableQueryLog();
// ... your code ...
dd(\DB::getQueryLog());
```

## Debugging Checklist

- [ ] Verify `SESSION_DRIVER` is set to `database` or `redis` (not `cookie`)
- [ ] Confirm `supports_credentials` is `true` in CORS config
- [ ] Check that `/me` endpoint returns 200 with valid session_id
- [ ] Verify `donor_sessions` table has records after login
- [ ] Confirm sessions table is being populated (if using database driver)
- [ ] Check that cookies are being sent with `withCredentials: true`
- [ ] Verify no 401 errors in browser Network tab on page refresh
- [ ] Check Laravel logs for any session-related errors

## Expected Behavior After Fix

1. User logs in → session_id stored in localStorage and backend database
2. User refreshes page → frontend sends session_id to `/me` endpoint
3. Backend validates session_id and returns user data
4. User stays logged in ✅

## Additional Notes

- **Session Expiration**: Consider adding a `last_activity` timestamp to track session expiration
- **Security**: In production, use HTTPS and set `SESSION_SECURE_COOKIE=true`
- **Cleanup**: Add a cron job to clean up expired sessions periodically
