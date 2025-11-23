# Backend Migration: Remove Device Fingerprint, Use Only Donor Sessions

## Overview
Remove all `device_fingerprint`-based authentication and use **only** the `donor_sessions` table for authentication.

## Changes Required

### 1. Payment Initialization Endpoint (`/api/payments/initialize`)

#### BEFORE (Current)
```php
// Accepts device_fingerprint
$deviceFingerprint = $request->device_fingerprint;

// Finds donor by device_fingerprint first
$deviceSession = DeviceSession::where('device_fingerprint', $deviceFingerprint)->first();
if ($deviceSession && $deviceSession->donor_id) {
    $donor = Donor::find($deviceSession->donor_id);
}
```

#### AFTER (New)
```php
// ❌ REMOVE: device_fingerprint parameter
// ✅ REQUIRE: Authenticated donor_session

// Check if user is authenticated via donor_sessions
$sessionId = $request->header('X-Session-ID') || $request->session_id;
if (!$sessionId) {
    return response()->json([
        'success' => false,
        'message' => 'Authentication required. Please login first.'
    ], 401);
}

// Verify session
$session = DonorSession::find($sessionId);
if (!$session || !$session->is_active) {
    return response()->json([
        'success' => false,
        'message' => 'Invalid or expired session. Please login again.'
    ], 401);
}

// Use donor from session
$donor = $session->donor;
if (!$donor) {
    return response()->json([
        'success' => false,
        'message' => 'Donor not found for this session.'
    ], 404);
}

// OR: Use metadata.donor_id (sent from frontend)
$donorId = $request->input('metadata.donor_id');
if ($donorId) {
    $donor = Donor::find($donorId);
    
    // Security: Verify this donor belongs to the authenticated session
    if (!$donor || $donor->id !== $session->donor_id) {
        return response()->json([
            'success' => false,
            'message' => 'Donor ID mismatch with authenticated session.'
        ], 403);
    }
} else {
    // Fallback to session donor
    $donor = $session->donor;
}
```

### 2. Remove Device Fingerprint from Request Validation

#### BEFORE
```php
$validated = $request->validate([
    'email' => 'required|email',
    'amount' => 'required|numeric|min:100',
    'device_fingerprint' => 'required|string', // ❌ REMOVE
    'metadata' => 'required|array',
]);
```

#### AFTER
```php
$validated = $request->validate([
    'email' => 'required|email',
    'amount' => 'required|numeric|min:100',
    // device_fingerprint removed
    'metadata' => 'required|array',
]);

// Require authentication instead
$sessionId = $request->header('X-Session-ID') ?? $request->session_id;
if (!$sessionId) {
    return response()->json([
        'success' => false,
        'message' => 'Authentication required'
    ], 401);
}
```

### 3. Donor Session Authentication Middleware

Create or update middleware to verify donor sessions:

```php
// app/Http/Middleware/VerifyDonorSession.php
public function handle($request, Closure $next)
{
    $sessionId = $request->header('X-Session-ID') 
        ?? $request->header('Authorization') 
        ?? $request->session_id;
    
    if (!$sessionId) {
        return response()->json([
            'success' => false,
            'message' => 'Authentication required'
        ], 401);
    }
    
    $session = DonorSession::where('id', $sessionId)
        ->where('is_active', true)
        ->first();
    
    if (!$session) {
        return response()->json([
            'success' => false,
            'message' => 'Invalid or expired session'
        ], 401);
    }
    
    // Attach session and donor to request
    $request->merge([
        'donor_session' => $session,
        'donor' => $session->donor,
        'donor_id' => $session->donor_id
    ]);
    
    return $next($request);
}
```

### 4. Update Payment Controller

```php
public function initialize(Request $request)
{
    // Validate request (no device_fingerprint)
    $validated = $request->validate([
        'email' => 'required|email',
        'amount' => 'required|numeric|min:100',
        'metadata' => 'required|array',
        'callback_url' => 'required|url',
    ]);
    
    // Get authenticated donor from middleware or session
    $donor = $request->donor; // Set by middleware
    
    if (!$donor) {
        return response()->json([
            'success' => false,
            'message' => 'Authentication required. Please login first.'
        ], 401);
    }
    
    // Verify email matches authenticated donor
    if ($donor->email !== $validated['email']) {
        return response()->json([
            'success' => false,
            'message' => 'Email mismatch with authenticated account.'
        ], 403);
    }
    
    $metadata = $validated['metadata'];
    
    // Extract donation type
    $donationType = $metadata['type'] ?? 
        ($metadata['endowment'] === 'yes' ? 'endowment' : 'project');
    
    // Create donation with authenticated donor
    $donation = Donation::create([
        'donor_id' => $donor->id, // Always use authenticated donor
        'project_id' => $metadata['project_id'] ?? null,
        'amount' => $validated['amount'],
        'endowment' => $metadata['endowment'] ?? 'no',
        'type' => $donationType,
        'status' => 'pending',
        'payment_reference' => $reference,
        'frequency' => 'onetime',
    ]);
    
    // Initialize Paystack payment...
}
```

### 5. Optional: Make `/api/check-device` Endpoint Optional

You can either:
- **Option A**: Remove the endpoint completely
- **Option B**: Keep it but make it optional (return empty response for compatibility)

```php
// Option B: Keep for compatibility but return empty
public function checkDevice(Request $request)
{
    return response()->json([
        'success' => true,
        'recognized' => false, // Always false - device recognition disabled
        'has_donor_session' => false,
    ]);
}
```

## Security Considerations

1. **Always verify session**: Don't trust `metadata.donor_id` alone - verify it matches the authenticated session
2. **Session expiration**: Check if session is still active
3. **Email verification**: Ensure payment email matches authenticated donor email
4. **Rate limiting**: Add rate limiting to payment endpoints

## Migration Steps

1. ✅ Update payment initialization to require authentication
2. ✅ Remove `device_fingerprint` parameter
3. ✅ Add session verification middleware
4. ✅ Update all payment-related endpoints
5. ✅ Test with authenticated users only
6. ✅ Update API documentation

## Testing

After migration, test:
- [ ] Authenticated user can make payment
- [ ] Unauthenticated user gets 401 error
- [ ] Payment uses correct donor_id from session
- [ ] Session expiration works correctly
- [ ] Email mismatch is rejected

## Rollback Plan

If issues arise:
1. Temporarily accept `device_fingerprint` as optional fallback
2. Use device session if no authenticated session
3. Gradually migrate users to login-based flow

