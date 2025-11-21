# Google Token 401 Error - Debugging Guide

## 🔍 Issue

Getting `401 Unauthorized: "Invalid or expired Google token"` when registering with Google.

## 🛠️ Frontend Debugging (Already Added)

The frontend now:
1. ✅ Validates token format before sending
2. ✅ Decodes token payload to check:
   - Expiration date
   - Email verification status
   - Client ID match
3. ✅ Shows detailed error messages
4. ✅ Logs token information to console

## 🔍 Backend Debugging Steps

### 1. Check Backend Logs

Look at `storage/logs/laravel.log` for detailed error messages:

```bash
tail -f storage/logs/laravel.log
```

### 2. Verify GoogleAuthService Configuration

**File: `app/Services/GoogleAuthService.php`**

Check that:
- ✅ `$this->clientId` is set correctly from config
- ✅ JWT decoding is working
- ✅ Token verification logic is correct

**Add Debug Logging:**

```php
public function verifyToken($idToken)
{
    try {
        Log::info('Google Token Verification - Start', [
            'token_length' => strlen($idToken),
            'token_preview' => substr($idToken, 0, 30) . '...',
            'client_id' => $this->clientId,
        ]);

        $parts = explode('.', $idToken);
        if (count($parts) !== 3) {
            Log::error('Google Token - Invalid format (not 3 parts)');
            return false;
        }

        $header = json_decode($this->base64UrlDecode($parts[0]), true);
        $payload = json_decode($this->base64UrlDecode($parts[1]), true);

        Log::info('Google Token - Decoded', [
            'header' => $header,
            'payload' => [
                'iss' => $payload['iss'] ?? null,
                'aud' => $payload['aud'] ?? null,
                'email' => $payload['email'] ?? null,
                'email_verified' => $payload['email_verified'] ?? false,
                'exp' => $payload['exp'] ?? null,
                'exp_date' => isset($payload['exp']) ? date('Y-m-d H:i:s', $payload['exp']) : null,
            ],
        ]);

        // Verify issuer
        $issuers = ['https://accounts.google.com', 'accounts.google.com'];
        if (!isset($payload['iss']) || !in_array($payload['iss'], $issuers)) {
            Log::error('Google Token - Invalid issuer', [
                'expected' => $issuers,
                'got' => $payload['iss'] ?? 'not set',
            ]);
            return false;
        }

        // Verify audience (client ID)
        if (!isset($payload['aud']) || $payload['aud'] !== $this->clientId) {
            Log::error('Google Token - Client ID mismatch', [
                'expected' => $this->clientId,
                'got' => $payload['aud'] ?? 'not set',
            ]);
            return false;
        }

        // Verify expiration
        if (isset($payload['exp']) && $payload['exp'] < time()) {
            Log::error('Google Token - Expired', [
                'exp' => $payload['exp'],
                'now' => time(),
                'exp_date' => date('Y-m-d H:i:s', $payload['exp']),
                'now_date' => date('Y-m-d H:i:s'),
            ]);
            return false;
        }

        // Verify email is verified
        if (!isset($payload['email_verified']) || !$payload['email_verified']) {
            Log::error('Google Token - Email not verified', [
                'email' => $payload['email'] ?? 'not set',
                'email_verified' => $payload['email_verified'] ?? 'not set',
            ]);
            return false;
        }

        Log::info('Google Token - Verification successful');

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
        Log::error('Google Token Verification - Exception', [
            'message' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
        ]);
        return false;
    }
}
```

### 3. Verify .env Configuration

**File: `.env`**

```env
GOOGLE_CLIENT_ID=470253699627-a50centdev8a3ahhq0e01oiakatu3qh4.apps.googleusercontent.com
```

**Verify it matches frontend:**
- Frontend: `src/App.js` → `GOOGLE_CLIENT_ID`
- Backend: `.env` → `GOOGLE_CLIENT_ID`
- **Must be exactly the same!**

### 4. Check config/services.php

**File: `config/services.php`**

```php
'google' => [
    'client_id' => env('GOOGLE_CLIENT_ID'),
    'client_secret' => env('GOOGLE_CLIENT_SECRET'),
    'redirect' => env('GOOGLE_REDIRECT_URI'),
],
```

### 5. Clear Config Cache

```bash
php artisan config:clear
php artisan cache:clear
```

### 6. Test Token Verification Directly

**Create a test route:**

```php
// routes/web.php or routes/api.php
Route::get('/test-google-token', function (Request $request) {
    $token = $request->get('token');
    if (!$token) {
        return response()->json(['error' => 'Token required'], 400);
    }

    $googleAuth = app(\App\Services\GoogleAuthService::class);
    $result = $googleAuth->verifyToken($token);

    return response()->json([
        'success' => $result !== false,
        'data' => $result,
    ]);
});
```

**Test with:**
```
GET http://localhost:8000/test-google-token?token=YOUR_GOOGLE_TOKEN
```

## 🔍 Common Issues & Solutions

### Issue 1: Client ID Mismatch

**Symptom:** Backend logs show "Client ID mismatch"

**Solution:**
- Verify `GOOGLE_CLIENT_ID` in `.env` matches frontend
- Clear config cache: `php artisan config:clear`
- Restart backend server

### Issue 2: Token Expired

**Symptom:** Backend logs show "Token expired"

**Solution:**
- Google tokens expire quickly (usually within 1 hour)
- User needs to sign in with Google again
- Frontend will detect this and show error

### Issue 3: Email Not Verified

**Symptom:** Backend logs show "Email not verified"

**Solution:**
- User must verify their Google email first
- Frontend will show helpful error message

### Issue 4: Invalid Token Format

**Symptom:** Backend logs show "Invalid JWT format"

**Solution:**
- Check that token is being sent correctly from frontend
- Verify token is not truncated or modified
- Check network tab to see actual request payload

### Issue 5: Base64URL Decode Issue

**Symptom:** Backend can't decode token

**Solution:**
- Verify `base64UrlDecode` method is correct
- Check for special characters in token
- Ensure proper padding is added

## 📊 Frontend Console Output

When you register with Google, check the browser console for:

```
Google Register - Token payload: {
  iss: "https://accounts.google.com",
  aud: "470253699627-a50centdev8a3ahhq0e01oiakatu3qh4.apps.googleusercontent.com",
  email: "user@gmail.com",
  email_verified: true,
  exp: 1234567890,
  exp_date: "2024-01-01T12:00:00.000Z",
  now: "2024-01-01T11:00:00.000Z",
  expired: false
}
```

**If any of these are wrong, that's the issue!**

## ✅ Verification Checklist

- [ ] Frontend `GOOGLE_CLIENT_ID` matches backend `.env`
- [ ] Backend config cache cleared
- [ ] Backend logs show token verification attempts
- [ ] Token payload shows correct `aud` (client ID)
- [ ] Token payload shows `email_verified: true`
- [ ] Token payload shows `exp` is in the future
- [ ] Backend `GoogleAuthService` is being called
- [ ] No exceptions in backend logs

## 🚀 Quick Test

1. Open browser console
2. Click "Register with Google"
3. Complete Google sign-in
4. Check console for token payload
5. Check backend logs for verification attempt
6. Compare client IDs and token data

If everything matches but still fails, the issue is likely in the backend's JWT verification logic.

