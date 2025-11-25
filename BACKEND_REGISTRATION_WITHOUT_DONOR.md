# Backend: Registration Without Donor Creation

## New Registration Flow

The frontend now **skips donor creation** during registration. Only `donor_sessions` are created. Donors are created/updated later when users complete their profile.

---

## ✅ Changes Required

### 1. Make `donor_id` Optional in Donor Sessions Registration

**File:** `app/Http/Controllers/Api/DonorSessionsController.php` or validation rules

**Before:**
```php
$validated = $request->validate([
    'username' => 'required|email',
    'password' => 'required|string|min:6',
    'donor_id' => 'required|integer|exists:donors,id', // ❌ Required
]);
```

**After:**
```php
$validated = $request->validate([
    'username' => 'required|email',
    'password' => 'required|string|min:6',
    'donor_id' => 'nullable|integer|exists:donors,id', // ✅ Optional
]);
```

### 2. Handle Registration Without Donor ID

**Update registration logic:**

```php
public function register(Request $request)
{
    $validated = $request->validate([
        'username' => 'required|email',
        'password' => 'required|string|min:6',
        'donor_id' => 'nullable|integer|exists:donors,id',
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
    
    // Create session without donor (donor will be created later)
    $session = DonorSession::create([
        'username' => $validated['username'],
        'password' => Hash::make($validated['password']),
        'donor_id' => $validated['donor_id'] ?? null, // ✅ Can be null
        'device_session_id' => $validated['device_session_id'] ?? null,
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

### 3. Update Donor Creation Validation

**File:** `app/Http/Controllers/Api/DonorsController.php`

**Only validate and create donor if these fields are filled:**
- `donor_type` (required if creating donor)
- `name` (required if creating donor) 
- `surname` (required if creating donor)

**Validation Rules:**

```php
public function store(Request $request)
{
    // Only validate if donor_type is provided (user is creating donor)
    if ($request->has('donor_type') && !empty($request->donor_type)) {
        $validated = $request->validate([
            'donor_type' => 'required|string|in:addressable_alumni,non_addressable_alumni,Individual,Organization,NGO',
            'name' => 'required|string|max:255',
            'surname' => 'required|string|max:255', // Required if creating donor
            'email' => 'required|email|unique:donors,email',
            'phone' => 'nullable|string|max:20',
            'other_name' => 'nullable|string|max:255',
            // ... other optional fields
        ]);
        
        // Create donor
        $donor = Donor::create($validated);
        
        return response()->json([
            'success' => true,
            'message' => 'Donor created successfully',
            'data' => $donor
        ], 201);
    } else {
        // No donor_type provided - return error
        return response()->json([
            'success' => false,
            'message' => 'Donor type, name, and surname are required to create a donor'
        ], 422);
    }
}
```

**Or use conditional validation:**

```php
public function store(Request $request)
{
    $rules = [];
    
    // Only require fields if donor_type is provided
    if ($request->has('donor_type') && !empty($request->donor_type)) {
        $rules = [
            'donor_type' => 'required|string|in:addressable_alumni,non_addressable_alumni,Individual,Organization,NGO',
            'name' => 'required|string|max:255',
            'surname' => 'required|string|max:255',
            'email' => 'required|email|unique:donors,email',
            'phone' => 'nullable|string|max:20',
            // ... other fields
        ];
    } else {
        // If no donor_type, return error
        return response()->json([
            'success' => false,
            'message' => 'Donor type, name, and surname are required to create a donor'
        ], 422);
    }
    
    $validated = $request->validate($rules);
    $donor = Donor::create($validated);
    
    return response()->json([
        'success' => true,
        'data' => $donor
    ], 201);
}
```

---

## 🔄 Registration Flow

### Before:
```
1. User registers with email + password
2. Frontend creates donor (minimal data)
3. Frontend creates donor_session (with donor_id)
4. User logged in
```

### After:
```
1. User registers with email + password
2. Frontend creates donor_session (NO donor_id)
3. User logged in
4. User completes profile later
5. Frontend creates/updates donor (with full data)
6. Backend links donor to session
```

---

## 📋 Database Schema

### `donor_sessions` Table

Ensure `donor_id` column allows NULL:

```sql
ALTER TABLE donor_sessions 
MODIFY COLUMN donor_id INT NULL; -- ✅ Allow NULL
```

### `donors` Table

No changes needed - existing schema is fine.

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

### Test 2: Donor Creation (Profile Update)

```bash
POST /api/donors
{
  "donor_type": "Individual",
  "name": "John",
  "surname": "Doe",
  "email": "test@example.com"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": 456,
    "name": "John",
    "surname": "Doe",
    "email": "test@example.com",
    "donor_type": "Individual"
  }
}
```

### Test 3: Link Donor to Session

After creating donor, update session:

```bash
PUT /api/donor-sessions/{session_id}
{
  "donor_id": 456
}
```

Or handle automatically in profile update endpoint.

---

## ✅ Checklist

- [ ] Make `donor_id` nullable in `donor_sessions` table
- [ ] Make `donor_id` optional in registration validation
- [ ] Update registration logic to handle null `donor_id`
- [ ] Update donor creation to require `donor_type`, `name`, `surname`
- [ ] Return null donor in registration response if no `donor_id`
- [ ] Test registration without donor
- [ ] Test donor creation separately
- [ ] Test linking donor to session

---

## 📝 Summary

**Key Changes:**
1. ✅ `donor_id` is now optional in `donor_sessions` registration
2. ✅ Donor creation only happens when user fills profile
3. ✅ Donor creation requires `donor_type`, `name`, `surname`
4. ✅ Registration works with just email + password

**Benefits:**
- ✅ Simpler registration flow
- ✅ No validation errors during registration
- ✅ Users can complete profile later
- ✅ Better user experience

---

**Please update the backend to support registration without donor creation!** 🎯

