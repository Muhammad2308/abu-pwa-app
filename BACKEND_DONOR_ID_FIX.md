# Backend Fix: Donor ID Mismatch in Donations

## CRITICAL ISSUE
Donations are being saved with the wrong `donor_id`. The backend is using the device session donor (ID 5) instead of the authenticated donor (ID 7).

## Problem
When a user with `donor_id = 7` makes a donation, the backend is saving it with `donor_id = 5` (the device session donor).

## Root Cause
The backend's payment initialization logic is:
1. Finding donor by `device_fingerprint` first (which returns donor_id 5)
2. Using that donor for the donation, even if the user is authenticated as donor_id 7

## Frontend Fix Applied
The frontend now sends `donor_id` in the payment metadata:
```json
{
  "email": "user@example.com",
  "amount": 100,
  "device_fingerprint": "...",
  "metadata": {
    "name": "...",
    "surname": "...",
    "donor_id": 7,  // ← NEW: Explicitly tells backend which donor to use
    "type": "project",
    "project_id": 5
  }
}
```

## Backend Fix Required

### Priority: Use Authenticated Donor Over Device Session Donor

In `PaymentController@initialize`, the logic should be:

```php
// 1. FIRST: Check if donor_id is provided in metadata (authenticated user)
$authenticatedDonorId = $request->input('metadata.donor_id');

if ($authenticatedDonorId) {
    // Use the authenticated donor from metadata
    $donor = Donor::find($authenticatedDonorId);
    
    if (!$donor) {
        return response()->json([
            'success' => false,
            'message' => 'Invalid donor ID provided'
        ], 400);
    }
    
    // Verify the email matches (security check)
    if ($donor->email !== $request->email) {
        return response()->json([
            'success' => false,
            'message' => 'Email mismatch with donor ID'
        ], 400);
    }
    
    // Use this donor for the donation
} else {
    // 2. FALLBACK: Find by device_fingerprint (for unauthenticated users)
    $deviceSession = DeviceSession::where('device_fingerprint', $request->device_fingerprint)->first();
    
    if ($deviceSession && $deviceSession->donor_id) {
        $donor = Donor::find($deviceSession->donor_id);
    } else {
        // 3. LAST RESORT: Find by email
        $donor = Donor::where('email', $request->email)->first();
        
        if (!$donor) {
            // Create new donor from metadata
            $donor = Donor::create([
                'name' => $metadata['name'] ?? '',
                'surname' => $metadata['surname'] ?? '',
                'other_name' => $metadata['other_name'] ?? null,
                'email' => $request->email,
                'phone' => $metadata['phone'] ?? '',
            ]);
        }
    }
}

// Create donation with the CORRECT donor_id
$donation = Donation::create([
    'donor_id' => $donor->id,  // ← This should be 7, not 5
    'project_id' => $metadata['project_id'] ?? null,
    'amount' => $request->amount,
    'endowment' => $metadata['endowment'] ?? 'no',
    'type' => $metadata['type'] ?? ($metadata['endowment'] === 'yes' ? 'endowment' : 'project'),
    'status' => 'pending',
    'payment_reference' => $reference,
    'frequency' => 'onetime',
]);
```

## Priority Order

1. **FIRST**: Use `metadata.donor_id` if provided (authenticated user)
2. **SECOND**: Use device session donor (if device_fingerprint matches)
3. **THIRD**: Find by email
4. **LAST**: Create new donor

## Security Check

When using `metadata.donor_id`, verify:
- The donor exists
- The donor's email matches `$request->email`
- The donor is not blocked/suspended

## Testing

After fix, test:
1. ✅ Authenticated user (donor_id 7) makes donation → Should save with donor_id 7
2. ✅ Unauthenticated user makes donation → Should use device session or create new donor
3. ✅ Verify donations table shows correct donor_id for each donation

## Current Database State

From the snapshot:
- Row 5: `donor_id: 5, amount: 1234567, type: project` ← This should be donor_id 7
- Row 6: `donor_id: 6, amount: 1000, type: project`
- Row 7: `donor_id: 7, amount: 1234, type: project`

The issue is that when donor_id 7 makes a donation, it's being saved as donor_id 5.

## Priority

**CRITICAL** - This is causing incorrect donation attribution. Users' donations are being credited to the wrong donor account.

