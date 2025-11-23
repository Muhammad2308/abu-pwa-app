# Backend Fix: Email UNIQUE Constraint Violation in Payment Initialization

## Error
```
SQLSTATE[23000]: Integrity constraint violation: 19 UNIQUE constraint failed: donors.email
SQL: update "donors" set "surname" = X2 Domain, "name" = Infinite, "email" = infinitex2domain@gmail.com, "updated_at" = 2025-11-22 19:18:09 where "id" = 5
```

## Problem
The backend is trying to update donor ID 5 with an email (`infinitex2domain@gmail.com`) that already exists for a different donor. This causes a UNIQUE constraint violation.

## Root Cause
During payment initialization (`POST /api/payments/initialize`), the backend is:
1. Receiving email in both `paymentData.email` (top level) AND `metadata.email`
2. Trying to update the authenticated donor's record with the email from metadata
3. But that email belongs to a different donor, causing the UNIQUE constraint violation

## Frontend Change
The frontend has been updated to **NOT send email in metadata**. The email is only sent at the top level:
```json
{
  "email": "user@example.com",  // ← Top level (for Paystack)
  "metadata": {
    "name": "...",
    "surname": "...",
    "phone": "",
    // email: REMOVED from metadata
  }
}
```

## Backend Fix Required

### Option 1: Don't Update Email from Metadata (Recommended)
When updating the donor during payment initialization, **do NOT update the email field** if it's in metadata. Use the authenticated user's existing email instead.

```php
// In PaymentController@initialize

// Find donor by authenticated session or email from top-level request
$donor = Donor::find($authenticatedDonorId); // Or use session/device recognition

if ($donor) {
    // Update donor fields from metadata, but NOT email
    $donor->update([
        'name' => $metadata['name'] ?? $donor->name,
        'surname' => $metadata['surname'] ?? $donor->surname,
        'other_name' => $metadata['other_name'] ?? $donor->other_name,
        'phone' => $metadata['phone'] ?? $donor->phone,
        // DO NOT update email - keep existing email to avoid conflicts
        // 'email' => $metadata['email'] ?? $donor->email,  // ← REMOVE THIS
    ]);
}
```

### Option 2: Check Email Before Updating
If you must update email, check if it already exists for a different donor:

```php
if (isset($metadata['email']) && $metadata['email'] !== $donor->email) {
    $emailExists = Donor::where('email', $metadata['email'])
                       ->where('id', '!=', $donor->id)
                       ->exists();
    
    if ($emailExists) {
        // Email belongs to another donor - don't update
        // Log warning or return error
        \Log::warning("Cannot update donor {$donor->id} email: {$metadata['email']} already exists");
    } else {
        // Safe to update
        $donor->email = $metadata['email'];
    }
}
```

### Option 3: Use Authenticated User's Email Only
Since the user is authenticated, always use their existing email from the database:

```php
// Get authenticated donor
$donor = Auth::user()->donor; // Or however you get authenticated donor

// Use their existing email, never update from metadata
$paymentEmail = $donor->email; // Use authenticated user's email

// Update other fields but NOT email
$donor->update([
    'name' => $metadata['name'] ?? $donor->name,
    'surname' => $metadata['surname'] ?? $donor->surname,
    'other_name' => $metadata['other_name'] ?? $donor->other_name,
    'phone' => $metadata['phone'] ?? $donor->phone,
    // Email stays as is - don't update
]);
```

## Recommended Solution

**Use Option 1** - Simply don't update email from metadata. The email should come from:
1. The authenticated user's existing record (if authenticated)
2. The top-level `email` field in the payment request (for Paystack)
3. Never from metadata (to avoid conflicts)

## Testing

After fix, test:
1. ✅ Authenticated user making donation (should use their existing email)
2. ✅ User with email that exists for another donor (should not cause conflict)
3. ✅ Payment initialization should succeed without UNIQUE constraint errors

## Priority

**High** - This is blocking all payments. Users cannot complete donations until this is fixed.

