# BACKEND FIX: Donation donor_id Not Matching Logged-in User

## Problem
When a user makes a donation, the `donor_id` saved in the `donations` table does NOT match the logged-in user's `donor_id` from the `donor_sessions` table.

### Current Situation:
- User logs in via `donor_sessions` table
- Session contains `donor_id = 11` (pointing to `donors` table)
- User makes a donation
- **BUG:** Donation is saved with wrong `donor_id` (e.g., 13, 15, 16, 17, etc.)
- Frontend fetches donations where `donor_id = 11` → finds ZERO donations
- Total shows ₦0.00 even though donations exist

### Evidence:
From the database screenshot:
- `donations` table shows donor_ids: 13, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 30, 31, 32, 33, 34
- But logged-in user has `donor_id = 11`
- None of the donations match!

## Root Cause
The backend endpoint that creates donations (likely `/api/donations` or similar) is NOT correctly extracting the `donor_id` from the authenticated session.

## Required Fix

### 1. Check Donation Creation Endpoint
Find the endpoint that handles donation creation (probably in a controller like `DonationController.php` or similar).

### 2. Verify Session Authentication
The endpoint should:
1. Get the authenticated session
2. Extract the `donor_id` from the session
3. Use that `donor_id` when creating the donation record

### 3. Expected Flow
```php
// Example pseudo-code (adjust to your framework)

// When creating a donation:
public function createDonation(Request $request) {
    // Get authenticated session
    $session = $request->session(); // or however you get the session
    
    // Extract donor_id from session
    $donorId = $session->donor_id; // This should be 11 for the current user
    
    // Create donation with correct donor_id
    $donation = Donation::create([
        'donor_id' => $donorId,  // ← THIS MUST BE FROM SESSION!
        'amount' => $request->amount,
        'project_id' => $request->project_id,
        'type' => $request->type,
        // ... other fields
    ]);
    
    return response()->json($donation);
}
```

### 4. Check Paystack Webhook Handler
If donations are created via Paystack webhook, the webhook handler must:
1. Receive the payment reference
2. Look up which user initiated the payment (from a pending_donations or transactions table)
3. Get that user's `donor_id` from `donor_sessions` or `donors` table
4. Create the donation with the correct `donor_id`

**Example webhook flow:**
```php
public function handlePaystackWebhook(Request $request) {
    $reference = $request->data['reference'];
    
    // Find the pending transaction
    $transaction = PendingTransaction::where('reference', $reference)->first();
    
    // Get the donor_id from the transaction
    $donorId = $transaction->donor_id; // ← Must be from session when transaction was created
    
    // Create donation
    Donation::create([
        'donor_id' => $donorId,  // ← Use the donor_id from the transaction
        'amount' => $request->data['amount'] / 100,
        'payment_reference' => $reference,
        // ... other fields
    ]);
}
```

## What to Check

1. **Donation Creation Endpoint:**
   - File: Likely `app/Http/Controllers/DonationController.php` or similar
   - Method: `store()` or `create()` or similar
   - Check: Is `donor_id` being set from the authenticated session?

2. **Paystack Webhook Handler:**
   - File: Likely `app/Http/Controllers/PaystackController.php` or similar
   - Method: `handleWebhook()` or `callback()` or similar
   - Check: Is the webhook correctly associating the payment with the user who initiated it?

3. **Session Structure:**
   - Verify that `donor_sessions` table has a `donor_id` column
   - Verify that this `donor_id` points to the `donors` table
   - Verify that the session middleware is correctly loading this data

## Expected Database State After Fix

After the fix, when user with `donor_id = 11` makes a donation:
```
donations table:
id | donor_id | amount | project_id | ...
---|----------|--------|------------|----
22 | 11       | 5000   | 1          | ...  ← Correct!
```

## Testing Steps

1. Login as a user (note their `donor_id` from `donor_sessions`)
2. Make a test donation
3. Check the `donations` table
4. Verify the new donation has the correct `donor_id` matching the logged-in user

## Frontend Impact

Once this backend fix is deployed:
- Frontend will automatically start showing correct donation totals
- No frontend changes needed
- User will see their donation history correctly

## Priority
**HIGH** - This is a critical bug affecting all users' donation tracking.
