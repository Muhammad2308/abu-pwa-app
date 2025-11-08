# Backend: Add device_session_id to donor_sessions Table

## Overview
We need to integrate device recognition with donor authentication sessions by adding a `device_session_id` foreign key to the `donor_sessions` table. This allows us to:
- Link donor sessions to device sessions
- Support multiple donor sessions per device (multiple users on same device)
- Check if a device is registered but doesn't have a donor session yet

---

## 1. Database Migration

### Create Migration File
```bash
php artisan make:migration add_device_session_id_to_donor_sessions_table
```

### Migration Content
```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('donor_sessions', function (Blueprint $table) {
            // Add device_session_id column (nullable - existing sessions won't have it)
            $table->unsignedBigInteger('device_session_id')->nullable()->after('donor_id');
            
            // Add foreign key constraint
            $table->foreign('device_session_id')
                  ->references('id')
                  ->on('device_sessions')
                  ->onDelete('set null'); // If device session is deleted, set to null
            
            // Add index for faster lookups
            $table->index('device_session_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('donor_sessions', function (Blueprint $table) {
            // Drop foreign key first
            $table->dropForeign(['device_session_id']);
            
            // Drop index
            $table->dropIndex(['device_session_id']);
            
            // Drop column
            $table->dropColumn('device_session_id');
        });
    }
};
```

---

## 2. Update DonorSession Model

### File: `app/Models/DonorSession.php`

Add to the model:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DonorSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'username',
        'password',
        'donor_id',
        'device_session_id', // ADD THIS
    ];

    /**
     * The attributes that should be hidden for serialization.
     */
    protected $hidden = [
        'password',
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
    public function deviceSession(): BelongsTo // ADD THIS RELATIONSHIP
    {
        return $this->belongsTo(DeviceSession::class);
    }
}
```

---

## 3. Update DeviceSession Model (if needed)

### File: `app/Models/DeviceSession.php`

Add relationship to donor sessions:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DeviceSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'device_fingerprint',
        'donor_id',
        // ... other fields
    ];

    /**
     * Get the donor associated with this device session.
     */
    public function donor(): BelongsTo
    {
        return $this->belongsTo(Donor::class);
    }

    /**
     * Get all donor sessions associated with this device session.
     */
    public function donorSessions(): HasMany // ADD THIS RELATIONSHIP
    {
        return $this->hasMany(DonorSession::class);
    }
}
```

---

## 4. Update Register Endpoint

### File: `app/Http/Controllers/DonorSessionController.php` (or wherever register is handled)

Update the `register` method to accept and save `device_session_id`:

```php
public function register(Request $request)
{
    $validated = $request->validate([
        'username' => 'required|string|min:3|unique:donor_sessions,username',
        'password' => 'required|string|min:6',
        'donor_id' => 'required|exists:donors,id',
        'device_session_id' => 'nullable|exists:device_sessions,id', // ADD THIS
    ]);

    // Check if donor already has a session
    $existingSession = DonorSession::where('donor_id', $validated['donor_id'])->first();
    if ($existingSession) {
        return response()->json([
            'success' => false,
            'message' => 'This donor already has a registered account'
        ], 409);
    }

    // Create the session
    $donorSession = DonorSession::create([
        'username' => $validated['username'],
        'password' => Hash::make($validated['password']),
        'donor_id' => $validated['donor_id'],
        'device_session_id' => $validated['device_session_id'] ?? null, // ADD THIS
    ]);

    // Load the donor relationship
    $donorSession->load('donor');

    return response()->json([
        'success' => true,
        'message' => 'Registration successful',
        'data' => [
            'id' => $donorSession->id,
            'username' => $donorSession->username,
            'donor' => $donorSession->donor,
            'device_session_id' => $donorSession->device_session_id, // ADD THIS
        ]
    ], 201);
}
```

---

## 5. Update Login Endpoint

### Update the `login` method to optionally link device session:

```php
public function login(Request $request)
{
    $validated = $request->validate([
        'username' => 'required|string',
        'password' => 'required|string',
        'device_session_id' => 'nullable|exists:device_sessions,id', // ADD THIS
    ]);

    $donorSession = DonorSession::where('username', $validated['username'])->first();

    if (!$donorSession || !Hash::check($validated['password'], $donorSession->password)) {
        return response()->json([
            'success' => false,
            'message' => 'Invalid credentials'
        ], 401);
    }

    // Optionally update device_session_id if provided and not already set
    if (isset($validated['device_session_id']) && !$donorSession->device_session_id) {
        $donorSession->update(['device_session_id' => $validated['device_session_id']]);
    }

    $donorSession->load('donor');

    return response()->json([
        'success' => true,
        'message' => 'Login successful',
        'data' => [
            'session_id' => $donorSession->id,
            'username' => $donorSession->username,
            'donor' => $donorSession->donor,
            'device_session_id' => $donorSession->device_session_id, // ADD THIS
        ]
    ], 200);
}
```

---

## 6. Update Get Current Session Endpoint

### Update `/api/donor-sessions/me` to include device_session_id:

```php
public function getCurrentSession(Request $request)
{
    $validated = $request->validate([
        'session_id' => 'required|integer|exists:donor_sessions,id',
    ]);

    $donorSession = DonorSession::with('donor', 'deviceSession')
        ->find($validated['session_id']);

    if (!$donorSession) {
        return response()->json([
            'success' => false,
            'message' => 'Session not found'
        ], 404);
    }

    return response()->json([
        'success' => true,
        'data' => [
            'id' => $donorSession->id,
            'username' => $donorSession->username,
            'donor' => $donorSession->donor,
            'device_session_id' => $donorSession->device_session_id, // ADD THIS
            'device_session' => $donorSession->deviceSession, // OPTIONAL: Include device session data
        ]
    ], 200);
}
```

---

## 7. New Endpoint: Check Device and Donor Session Status

### Create a new endpoint to check device recognition and donor session status:

```php
/**
 * Check if device is recognized and if donor has a session
 * 
 * GET /api/donor-sessions/check-device
 * Headers: X-Device-Fingerprint: {fingerprint}
 */
public function checkDevice(Request $request)
{
    $deviceFingerprint = $request->header('X-Device-Fingerprint');
    
    if (!$deviceFingerprint) {
        return response()->json([
            'success' => false,
            'message' => 'Device fingerprint not provided'
        ], 400);
    }

    // Find device session
    $deviceSession = DeviceSession::where('device_fingerprint', $deviceFingerprint)
        ->with('donor')
        ->first();

    if (!$deviceSession) {
        return response()->json([
            'success' => false,
            'recognized' => false,
            'message' => 'Device not recognized'
        ], 200);
    }

    // Check if donor has a session
    $donorSession = DonorSession::where('donor_id', $deviceSession->donor_id)
        ->first();

    return response()->json([
        'success' => true,
        'recognized' => true,
        'device_session' => [
            'id' => $deviceSession->id,
            'donor_id' => $deviceSession->donor_id,
        ],
        'donor' => $deviceSession->donor,
        'has_donor_session' => $donorSession !== null,
        'donor_session' => $donorSession ? [
            'id' => $donorSession->id,
            'username' => $donorSession->username,
        ] : null,
    ], 200);
}
```

### Add route:
```php
Route::get('/api/donor-sessions/check-device', [DonorSessionController::class, 'checkDevice']);
```

---

## 8. Update API Routes (if needed)

Make sure the routes are properly set up:

```php
// In routes/api.php or routes/web.php
Route::prefix('api/donor-sessions')->group(function () {
    Route::post('/register', [DonorSessionController::class, 'register']);
    Route::post('/login', [DonorSessionController::class, 'login']);
    Route::post('/logout', [DonorSessionController::class, 'logout']);
    Route::post('/me', [DonorSessionController::class, 'getCurrentSession']);
    Route::get('/check-device', [DonorSessionController::class, 'checkDevice']); // NEW
});
```

---

## Summary of Changes

1. ✅ **Migration**: Add `device_session_id` column to `donor_sessions` table
2. ✅ **Model**: Add `device_session_id` to `$fillable` in `DonorSession` model
3. ✅ **Model**: Add `deviceSession()` relationship in `DonorSession` model
4. ✅ **Model**: Add `donorSessions()` relationship in `DeviceSession` model
5. ✅ **Controller**: Update `register()` to accept and save `device_session_id`
6. ✅ **Controller**: Update `login()` to optionally link `device_session_id`
7. ✅ **Controller**: Update `getCurrentSession()` to return `device_session_id`
8. ✅ **Controller**: Create `checkDevice()` endpoint to check device and donor session status
9. ✅ **Routes**: Add route for `/api/donor-sessions/check-device`

---

## Testing Checklist

- [ ] Run migration: `php artisan migrate`
- [ ] Test register endpoint with `device_session_id`
- [ ] Test register endpoint without `device_session_id` (should still work)
- [ ] Test login endpoint with `device_session_id`
- [ ] Test `/api/donor-sessions/check-device` endpoint
- [ ] Verify foreign key constraint works
- [ ] Verify multiple donor sessions can share same device session
- [ ] Test that existing sessions (without device_session_id) still work

