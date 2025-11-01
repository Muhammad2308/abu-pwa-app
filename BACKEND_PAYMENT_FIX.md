# Backend Payment Initialization Fix

## CRITICAL ERROR
```
SQLSTATE[23000]: Integrity constraint violation: 19 NOT NULL constraint failed: donations.type
```

## Problem
The `POST /api/payments/initialize` endpoint is failing because:
1. When inserting into the `donations` table, the `type` column is NOT NULL but not being set
2. The frontend IS sending `type` in the metadata: `"type": "endowment"` or `"type": "project"`
3. The backend needs to extract `type` from metadata and include it in the donations insert

## Current Request from Frontend

```json
POST /api/payments/initialize
{
  "email": "sanikilla@gmail.com",
  "amount": "100",
  "device_fingerprint": "...",
  "callback_url": "http://localhost:3000/donations",
  "metadata": {
    "name": "Abubaka",
    "surname": "Umar", 
    "other_name": "Adam",
    "phone": "+234233295469",
    "endowment": "yes",
    "type": "endowment",     // ← This is being sent!
    "project_id": 123        // ← Only if project donation
  }
}
```

## Database Structure Expected

The `donations` table should have a `type` column:
```sql
donations (
  id,
  donor_id,
  project_id,
  amount,
  endowment,      -- ENUM('yes', 'no')
  type,           -- NOT NULL - Missing in insert!
  status,
  payment_reference,
  created_at,
  updated_at
)
```

## Backend Fix Required

### 1. Extract `type` from metadata
```php
// In PaymentController@initialize
$metadata = $request->input('metadata', []);

// Extract type from metadata
$donationType = $metadata['type'] ?? null; // 'endowment' or 'project'

if (!$donationType) {
    // Fallback: determine from endowment field
    $donationType = ($metadata['endowment'] === 'yes') ? 'endowment' : 'project';
}
```

### 2. Include `type` in donations insert
```php
Donation::create([
    'donor_id' => $donor->id,
    'project_id' => $metadata['project_id'] ?? null,
    'amount' => $request->amount,
    'endowment' => $metadata['endowment'] ?? 'no',
    'type' => $donationType,  // ← ADD THIS! It's currently missing
    'status' => 'pending',
    'payment_reference' => $reference,
]);
```

### 3. Full Example Fix (Laravel)

```php
public function initialize(Request $request)
{
    $validated = $request->validate([
        'email' => 'required|email',
        'amount' => 'required|numeric|min:100',
        'metadata' => 'required|array',
        'device_fingerprint' => 'required|string',
        'callback_url' => 'required|url',
    ]);

    $metadata = $validated['metadata'];
    
    // Extract type from metadata - REQUIRED for donations table
    $donationType = $metadata['type'] ?? null;
    if (!$donationType) {
        // Fallback logic
        $donationType = ($metadata['endowment'] === 'yes') ? 'endowment' : 'project';
    }
    
    // Find or create donor
    $donor = Donor::where('email', $validated['email'])->first();
    
    if (!$donor) {
        // Create donor from metadata - use SEPARATE name fields
        $donor = Donor::create([
            'name' => $metadata['name'] ?? '',
            'surname' => $metadata['surname'] ?? '',
            'other_name' => $metadata['other_name'] ?? null,
            'email' => $validated['email'],
            'phone' => $metadata['phone'] ?? '',
        ]);
    } else {
        // Update donor - use SEPARATE name fields
        $donor->update([
            'name' => $metadata['name'] ?? $donor->name,
            'surname' => $metadata['surname'] ?? $donor->surname,
            'other_name' => $metadata['other_name'] ?? $donor->other_name,
            'phone' => $metadata['phone'] ?? $donor->phone,
        ]);
    }
    
    // Create donation record - INCLUDE TYPE!
    $donation = Donation::create([
        'donor_id' => $donor->id,
        'project_id' => $metadata['project_id'] ?? null,
        'amount' => $validated['amount'],
        'endowment' => $metadata['endowment'] ?? 'no',
        'type' => $donationType,  // ← THIS IS CRITICAL!
        'status' => 'pending',
        'payment_reference' => 'ABU_' . time() . '_' . $donor->id,
    ]);
    
    // Initialize payment with gateway...
    // Return response
}
```

## Also Fix Donor Name Fields

When creating/updating donor from payment metadata, save separate fields:

```php
// ❌ WRONG - Don't combine
$donor->name = $metadata['name'] . ' ' . $metadata['surname'];

// ✅ CORRECT - Save separately
$donor->name = $metadata['name'] ?? '';
$donor->surname = $metadata['surname'] ?? '';
$donor->other_name = $metadata['other_name'] ?? null;
```

## Summary

**Two fixes needed:**

1. ✅ Add `type` field to donations insert (extract from `metadata.type`)
2. ✅ Save donor name fields separately (don't combine name, surname, other_name)

The frontend is sending everything correctly. The backend just needs to:
- Extract `metadata.type` and include it in donations insert
- Save `metadata.name`, `metadata.surname`, `metadata.other_name` to separate columns

