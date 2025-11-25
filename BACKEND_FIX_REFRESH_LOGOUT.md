# Backend Fix: Prevent User Logout on Browser Refresh

## Problem

Users are being logged out when they refresh the browser, even though they have valid sessions stored in localStorage. This happens because the backend session verification is too strict or returning 401 errors.

---

## Root Causes

### 1. **Session Expiration Too Short**
- Sessions might expire too quickly
- Backend checks expiration before allowing access
- Returns 401 even for valid sessions

### 2. **Strict Session Validation**
- Backend might be checking additional conditions that fail
- Session might be marked as inactive incorrectly
- Database queries might be failing

### 3. **401 Response on Session Check**
- `/api/donor-sessions/me` endpoint returns 401 for valid sessions
- Frontend clears session on 401 response
- User appears logged out

### 4. **Missing Session Refresh Mechanism**
- No token refresh mechanism
- Sessions expire without renewal
- No grace period for expired sessions

---

## ✅ Backend Solutions

### Solution 1: Extend Session Expiration

**File:** `app/Models/DonorSession.php` or migration

```php
// Extend session expiration to 30 days (or longer)
protected $fillable = [
    'donor_id',
    'username',
    'session_id',
    'expires_at', // Add this field
    'is_active',
    // ...
];

// In migration or model
public function __construct(array $attributes = [])
{
    parent::__construct($attributes);
    
    // Set expiration to 30 days from now
    if (!isset($this->expires_at)) {
        $this->expires_at = now()->addDays(30);
    }
}
```

**Or in Session Creation:**

```php
// When creating session
$session = DonorSession::create([
    'donor_id' => $donor->id,
    'username' => $username,
    'session_id' => $sessionId,
    'expires_at' => now()->addDays(30), // 30 days expiration
    'is_active' => true,
    'created_at' => now(),
    'updated_at' => now(),
]);
```

### Solution 2: Make Session Check Endpoint More Lenient

**File:** `app/Http/Controllers/DonorSessionController.php`

```php
/**
 * Get current session (for session verification)
 * 
 * This endpoint should be LENIENT - don't return 401 unless session is truly invalid
 */
public function getCurrentSession(Request $request)
{
    try {
        $sessionId = $request->input('session_id') 
                  || $request->header('X-Session-ID')
                  || $request->query('session_id');
        
        if (!$sessionId) {
            return response()->json([
                'success' => false,
                'message' => 'Session ID required'
            ], 400);
        }
        
        // Find session - be lenient with expiration
        $session = DonorSession::where('session_id', $sessionId)
            ->where('is_active', true)
            ->first();
        
        if (!$session) {
            // Session not found or inactive
            return response()->json([
                'success' => false,
                'message' => 'Session not found or inactive'
            ], 404); // Use 404 instead of 401
        }
        
        // Check expiration with grace period (allow 7 days after expiration)
        if ($session->expires_at && $session->expires_at->isPast()) {
            $gracePeriod = $session->expires_at->addDays(7);
            
            if (now()->isAfter($gracePeriod)) {
                // Session expired beyond grace period
                $session->update(['is_active' => false]);
                return response()->json([
                    'success' => false,
                    'message' => 'Session expired'
                ], 401);
            } else {
                // Within grace period - auto-renew session
                $session->update([
                    'expires_at' => now()->addDays(30),
                    'updated_at' => now()
                ]);
            }
        }
        
        // Load donor relationship
        $session->load('donor');
        
        if (!$session->donor) {
            return response()->json([
                'success' => false,
                'message' => 'Donor not found for this session'
            ], 404);
        }
        
        // Return session with donor data
        return response()->json([
            'success' => true,
            'data' => [
                'session_id' => $session->session_id,
                'username' => $session->username,
                'donor' => $session->donor,
                'expires_at' => $session->expires_at,
                'device_session_id' => $session->device_session_id ?? null,
            ]
        ], 200);
        
    } catch (\Exception $e) {
        \Log::error('Get current session error', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        
        // Don't return 401 on errors - return 500 instead
        return response()->json([
            'success' => false,
            'message' => 'Error checking session'
        ], 500);
    }
}
```

### Solution 3: Add Session Auto-Renewal

**File:** `app/Http/Controllers/DonorSessionController.php`

```php
/**
 * Auto-renew session if it's about to expire
 */
private function autoRenewSession($session)
{
    // If session expires in less than 7 days, renew it
    if ($session->expires_at && $session->expires_at->diffInDays(now()) < 7) {
        $session->update([
            'expires_at' => now()->addDays(30),
            'last_activity_at' => now(),
            'updated_at' => now()
        ]);
        
        \Log::info('Session auto-renewed', [
            'session_id' => $session->session_id,
            'new_expires_at' => $session->expires_at
        ]);
    }
    
    return $session;
}
```

### Solution 4: Update Session on Every Request

**File:** `app/Http/Middleware/VerifyDonorSession.php` (if exists)

```php
public function handle($request, Closure $next)
{
    $sessionId = $request->header('X-Session-ID') 
              || $request->input('session_id');
    
    if ($sessionId) {
        $session = DonorSession::where('session_id', $sessionId)
            ->where('is_active', true)
            ->first();
        
        if ($session) {
            // Update last activity
            $session->update([
                'last_activity_at' => now(),
                'updated_at' => now()
            ]);
            
            // Auto-renew if needed
            if ($session->expires_at && $session->expires_at->diffInDays(now()) < 7) {
                $session->update([
                    'expires_at' => now()->addDays(30)
                ]);
            }
        }
    }
    
    return $next($request);
}
```

### Solution 5: Never Return 401 for Session Check Endpoint

**Critical:** The `/api/donor-sessions/me` endpoint should **NEVER** return 401 unless the session is truly invalid.

```php
// ❌ BAD - Returns 401 too easily
if (!$session) {
    return response()->json(['error' => 'Unauthorized'], 401);
}

// ✅ GOOD - Returns 404 for not found, 401 only for truly invalid
if (!$session) {
    return response()->json([
        'success' => false,
        'message' => 'Session not found'
    ], 404); // Use 404, not 401
}

// Only return 401 if session is explicitly invalid
if ($session && !$session->is_active) {
    return response()->json([
        'success' => false,
        'message' => 'Session is inactive'
    ], 401);
}
```

### Solution 6: Add Database Indexes for Performance

**File:** Migration

```php
Schema::table('donor_sessions', function (Blueprint $table) {
    // Add indexes for faster lookups
    $table->index('session_id');
    $table->index('is_active');
    $table->index('expires_at');
    $table->index(['session_id', 'is_active']); // Composite index
});
```

---

## 🔧 Implementation Checklist

### Step 1: Update Session Model
- [ ] Add `expires_at` field to `donor_sessions` table
- [ ] Set default expiration to 30 days
- [ ] Add `last_activity_at` field (optional)

### Step 2: Update Session Creation
- [ ] Set `expires_at` when creating sessions
- [ ] Set expiration to 30 days from creation

### Step 3: Update Session Check Endpoint
- [ ] Make endpoint more lenient (404 instead of 401 for not found)
- [ ] Add grace period for expired sessions
- [ ] Auto-renew sessions within grace period
- [ ] Never return 401 unless session is truly invalid

### Step 4: Add Auto-Renewal
- [ ] Renew sessions that expire in < 7 days
- [ ] Update `last_activity_at` on every request
- [ ] Log renewal for debugging

### Step 5: Add Database Indexes
- [ ] Index `session_id` column
- [ ] Index `is_active` column
- [ ] Index `expires_at` column
- [ ] Composite index on `(session_id, is_active)`

### Step 6: Update Error Handling
- [ ] Return 404 for "session not found" (not 401)
- [ ] Return 401 only for "session invalid/inactive"
- [ ] Return 500 for server errors (not 401)
- [ ] Add detailed logging

---

## 📊 Expected Behavior After Fix

### Before Fix:
```
User refreshes browser
  ↓
Frontend calls /api/donor-sessions/me
  ↓
Backend returns 401 (session expired)
  ↓
Frontend clears session
  ↓
User appears logged out ❌
```

### After Fix:
```
User refreshes browser
  ↓
Frontend calls /api/donor-sessions/me
  ↓
Backend checks session
  ↓
If expired but within grace period:
  - Auto-renew session
  - Return 200 with session data ✅
  ↓
If expired beyond grace period:
  - Return 401 (truly expired)
  ↓
If not found:
  - Return 404 (not 401)
  ↓
Frontend keeps user logged in ✅
```

---

## 🧪 Testing

### Test 1: Valid Session
```bash
# Create session
POST /api/donor-sessions/register
# Get session_id

# Check session (should return 200)
GET /api/donor-sessions/me?session_id=123
# Expected: 200 OK with session data
```

### Test 2: Expired Session (Within Grace Period)
```bash
# Manually expire session in database
UPDATE donor_sessions SET expires_at = DATE_SUB(NOW(), INTERVAL 1 DAY) WHERE session_id = 123;

# Check session (should auto-renew and return 200)
GET /api/donor-sessions/me?session_id=123
# Expected: 200 OK, session auto-renewed
```

### Test 3: Expired Session (Beyond Grace Period)
```bash
# Manually expire session beyond grace period
UPDATE donor_sessions SET expires_at = DATE_SUB(NOW(), INTERVAL 10 DAY) WHERE session_id = 123;

# Check session (should return 401)
GET /api/donor-sessions/me?session_id=123
# Expected: 401 Unauthorized
```

### Test 4: Non-Existent Session
```bash
# Check non-existent session
GET /api/donor-sessions/me?session_id=99999
# Expected: 404 Not Found (NOT 401)
```

---

## 📝 Database Migration

```php
// Add expiration and activity tracking
Schema::table('donor_sessions', function (Blueprint $table) {
    $table->timestamp('expires_at')->nullable()->after('updated_at');
    $table->timestamp('last_activity_at')->nullable()->after('expires_at');
    
    // Add indexes
    $table->index('session_id');
    $table->index('is_active');
    $table->index('expires_at');
    $table->index(['session_id', 'is_active']);
});

// Set default expiration for existing sessions
DB::table('donor_sessions')
    ->whereNull('expires_at')
    ->update(['expires_at' => DB::raw('DATE_ADD(NOW(), INTERVAL 30 DAY)')]);
```

---

## 🎯 Key Points

1. **Never return 401 for "session not found"** - Use 404 instead
2. **Add grace period** - Allow 7 days after expiration before truly invalidating
3. **Auto-renew sessions** - Extend expiration if within grace period
4. **Extend expiration** - Use 30 days instead of shorter periods
5. **Update on activity** - Update `last_activity_at` on every request
6. **Add indexes** - Improve query performance

---

## 🚀 Summary

The backend should:
- ✅ Extend session expiration to 30 days
- ✅ Add 7-day grace period for expired sessions
- ✅ Auto-renew sessions within grace period
- ✅ Return 404 for "not found" (not 401)
- ✅ Return 401 only for truly invalid sessions
- ✅ Update session activity on every request
- ✅ Add database indexes for performance

**After implementing these changes, users should stay logged in on browser refresh!** 🎉

