# Backend Fix: Donor ID NULL Constraint Error

## Problem

When registering without a donor (new flow), the backend tries to insert `NULL` into `donor_sessions.donor_id`, but the database column has a `NOT NULL` constraint.

**Error:**
```
SQLSTATE[23000]: Integrity constraint violation: 19 NOT NULL constraint failed: donor_sessions.donor_id
```

**SQL Query:**
```sql
insert into "donor_sessions" 
("username", "password", "donor_id", "device_session_id", "auth_provider", "updated_at", "created_at") 
values (..., ?, 2, email, ...)
```

The `?` is NULL, but the column doesn't allow NULL.

---

## ✅ Solution

### 1. Make `donor_id` Column Nullable in Database

**Migration File:** `database/migrations/YYYY_MM_DD_HHMMSS_make_donor_id_nullable_in_donor_sessions.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class MakeDonorIdNullableInDonorSessions extends Migration
{
    public function up()
    {
        Schema::table('donor_sessions', function (Blueprint $table) {
            $table->unsignedBigInteger('donor_id')->nullable()->change();
        });
    }

    public function down()
    {
        Schema::table('donor_sessions', function (Blueprint $table) {
            $table->unsignedBigInteger('donor_id')->nullable(false)->change();
        });
    }
}
```

**Or if using SQLite directly:**

```sql
-- Note: SQLite doesn't support ALTER COLUMN directly
-- You may need to recreate the table or use a workaround

-- Option 1: Recreate table (backup data first!)
CREATE TABLE donor_sessions_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    donor_id INTEGER NULL,  -- ✅ Changed to NULL
    device_session_id INTEGER NULL,
    auth_provider VARCHAR(50) DEFAULT 'email',
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    FOREIGN KEY (donor_id) REFERENCES donors(id)
);

-- Copy data
INSERT INTO donor_sessions_new SELECT * FROM donor_sessions;

-- Drop old table
DROP TABLE donor_sessions;

-- Rename new table
ALTER TABLE donor_sessions_new RENAME TO donor_sessions;
```

**Or for MySQL/PostgreSQL:**

```sql
ALTER TABLE donor_sessions 
MODIFY COLUMN donor_id INT NULL;  -- MySQL

-- OR

ALTER TABLE donor_sessions 
ALTER COLUMN donor_id DROP NOT NULL;  -- PostgreSQL
```

### 2. Update Model to Allow Null

**File:** `app/Models/DonorSession.php`

```php
protected $fillable = [
    'username',
    'password',
    'donor_id',  // ✅ Can be null
    'device_session_id',
    'auth_provider',
];

// Make sure casts allow null
protected $casts = [
    'donor_id' => 'integer',  // Will be null if not provided
    'device_session_id' => 'integer',
];
```

### 3. Update Registration Logic

**File:** `app/Http/Controllers/Api/DonorSessionsController.php`

```php
public function register(Request $request)
{
    $validated = $request->validate([
        'username' => 'required|email',
        'password' => 'required|string|min:6',
        'donor_id' => 'nullable|integer|exists:donors,id', // ✅ Nullable
        'device_session_id' => 'nullable|string',
    ]);
    
    // Check if user already exists
    $existingSession = DonorSession::where('username', $validated['username'])->first();
    if ($existingSession) {
        return response()->json([
            'success' => false,
            'message' => 'User already exists. Please login instead.'
        ], 409);
    }
    
    // Create session - donor_id can be null
    $session = DonorSession::create([
        'username' => $validated['username'],
        'password' => Hash::make($validated['password']),
        'donor_id' => $validated['donor_id'] ?? null, // ✅ Explicitly set to null if not provided
        'device_session_id' => $validated['device_session_id'] ?? null,
        'auth_provider' => 'email',
    ]);
    
    // Return session data (donor will be null if not provided)
    return response()->json([
        'success' => true,
        'message' => 'Registration successful! Please complete your profile.',
        'data' => [
            'id' => $session->id,
            'username' => $session->username,
            'donor' => $session->donor, // Will be null if donor_id is null
            'device_session_id' => $session->device_session_id,
        ]
    ], 201);
}
```

### 4. Update Foreign Key Constraint (If Needed)

If your database enforces foreign key constraints, you may need to make the foreign key nullable:

**For SQLite:**
```sql
-- SQLite doesn't enforce foreign keys by default unless enabled
-- If enabled, the foreign key should still work with NULL values
```

**For MySQL/PostgreSQL:**
```sql
-- Foreign keys can reference NULL values, so no change needed
-- Just ensure the column allows NULL
```

---

## 🧪 Testing

### Test 1: Registration Without Donor

```bash
POST /api/donor-sessions/register
{
  "username": "test@example.com",
  "password": "password123"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Registration successful! Please complete your profile.",
  "data": {
    "id": 123,
    "username": "test@example.com",
    "donor": null,
    "device_session_id": null
  }
}
```

### Test 2: Check Database

```sql
SELECT * FROM donor_sessions WHERE username = 'test@example.com';
```

**Expected:**
```
id: 123
username: test@example.com
donor_id: NULL  -- ✅ Should be NULL, not error
```

---

## 📋 Checklist

- [ ] Create migration to make `donor_id` nullable
- [ ] Run migration: `php artisan migrate`
- [ ] Update `DonorSession` model to allow null
- [ ] Update registration controller to handle null `donor_id`
- [ ] Test registration without donor
- [ ] Verify database allows NULL in `donor_id` column
- [ ] Test that existing sessions with `donor_id` still work

---

## 🔍 Verify Current Schema

Check your current `donor_sessions` table schema:

**SQLite:**
```sql
PRAGMA table_info(donor_sessions);
```

**MySQL:**
```sql
DESCRIBE donor_sessions;
```

**PostgreSQL:**
```sql
\d donor_sessions
```

Look for `donor_id` column - it should show `NULL` allowed after the fix.

---

## ⚠️ Important Notes

1. **Backup First:** Always backup your database before running migrations
2. **Data Migration:** If you have existing sessions with `donor_id`, they won't be affected
3. **Foreign Key:** The foreign key constraint should still work with NULL values
4. **Queries:** Update any queries that assume `donor_id` is always present

---

## 📝 Summary

**The Issue:**
- Database column `donor_sessions.donor_id` has `NOT NULL` constraint
- Frontend sends registration without `donor_id` (null)
- Database rejects the insert

**The Fix:**
1. Make `donor_id` column nullable in database
2. Update model to allow null
3. Update controller to handle null `donor_id`
4. Test registration works

**After Fix:**
- ✅ Registration works without donor
- ✅ `donor_id` can be null
- ✅ User can complete profile later
- ✅ Existing sessions still work

---

**Please update the database schema to allow NULL in `donor_sessions.donor_id`!** 🎯

