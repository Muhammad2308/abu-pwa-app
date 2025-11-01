# Backend Fix: Separate Name Fields in Donors Table

## Problem
Currently, when updating a donor record, the `name`, `surname`, and `other_name` fields are being combined and saved only in the `name` column in the `donors` table. We need each field to be saved to its corresponding database column.

## Frontend is Sending Correct Data
The frontend is correctly sending separate fields in the request payload:

```json
{
  "name": "John",
  "surname": "Doe",
  "other_name": "Smith",
  "email": "john.doe@example.com",
  "phone": "1234567890",
  ...
}
```

## What Backend Should Do

### 1. Update Endpoint: `PUT /api/donors/{id}`

The backend should receive and save each field separately:

**Laravel Example:**
```php
public function update(Request $request, $id)
{
    $donor = Donor::findOrFail($id);
    
    $validated = $request->validate([
        'name' => 'required|string|max:255',
        'surname' => 'required|string|max:255',
        'other_name' => 'nullable|string|max:255',
        'email' => 'required|email',
        'phone' => 'required|string',
        // ... other fields
    ]);
    
    // IMPORTANT: Save each field to its own column
    $donor->name = $validated['name'];
    $donor->surname = $validated['surname'];
    $donor->other_name = $validated['other_name'] ?? null;
    $donor->email = $validated['email'];
    $donor->phone = $validated['phone'];
    
    $donor->save();
    
    return response()->json([
        'success' => true,
        'donor' => $donor
    ]);
}
```

**Common Mistakes to Avoid:**

1. **DON'T combine them:**
   ```php
   // ❌ WRONG - Don't do this
   $donor->name = $request->name . ' ' . $request->surname . ' ' . $request->other_name;
   ```

2. **DON'T use fill() without specifying fields:**
   ```php
   // ❌ WRONG - This might combine fields if there's a mutator
   $donor->fill($request->all());
   ```

3. **DO save each field explicitly:**
   ```php
   // ✅ CORRECT - Save each field separately
   $donor->name = $request->input('name');
   $donor->surname = $request->input('surname');
   $donor->other_name = $request->input('other_name');
   ```

### 2. Check Database Migration

Ensure your `donors` table has three separate columns:

```php
Schema::create('donors', function (Blueprint $table) {
    $table->id();
    $table->string('name');
    $table->string('surname');
    $table->string('other_name')->nullable();
    // ... other columns
});
```

### 3. Check Model Mutators/Accessors

If you have any mutators or accessors in your Donor model that combine name fields, remove or fix them:

```php
// ❌ WRONG - Remove mutators like this
public function setNameAttribute($value)
{
    // Don't combine fields here
}

// ✅ CORRECT - No mutator, just store as-is
// Or if you need a combined name for display:
public function getFullNameAttribute()
{
    return trim(implode(' ', array_filter([
        $this->name,
        $this->surname,
        $this->other_name
    ])));
}
```

### 4. Check Mass Assignment

If using mass assignment, make sure your model allows these fields:

```php
protected $fillable = [
    'name',
    'surname',
    'other_name',
    'email',
    'phone',
    // ... other fields
];
```

Then update like this:
```php
$donor->update([
    'name' => $request->name,
    'surname' => $request->surname,
    'other_name' => $request->other_name,
    'email' => $request->email,
    'phone' => $request->phone,
]);
```

### 5. Verify the Fix

After implementing the fix:

1. Test with this payload:
   ```json
   {
     "name": "John",
     "surname": "Doe",
     "other_name": "Smith",
     "email": "test@example.com",
     "phone": "1234567890"
   }
   ```

2. Check the database - you should see:
   - `name` column = "John"
   - `surname` column = "Doe"
   - `other_name` column = "Smith"

3. Verify the response returns the donor with separate fields:
   ```json
   {
     "success": true,
     "donor": {
       "id": 1,
       "name": "John",
       "surname": "Doe",
       "other_name": "Smith",
       ...
     }
   }
   ```

## Request Format

The frontend sends a `PUT` request to `/api/donors/{id}` with JSON body:

```
PUT /api/donors/123
Content-Type: application/json

{
  "name": "John",
  "surname": "Doe",
  "other_name": "Smith",
  "email": "john.doe@example.com",
  "phone": "1234567890",
  "reg_number": "ABU/PGS/2355/20",
  ...
}
```

## Summary

**The frontend is working correctly.** The issue is in the backend update handler. Please:

1. ✅ Check the update method receives separate `name`, `surname`, `other_name` fields
2. ✅ Save each field to its corresponding database column
3. ✅ Remove any code that combines these fields before saving
4. ✅ Ensure database columns exist for all three fields
5. ✅ Check for mutators/accessors that might be interfering
6. ✅ Test that each field is saved separately in the database

