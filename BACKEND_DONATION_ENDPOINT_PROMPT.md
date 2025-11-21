# Backend: Donation Creation Endpoint - CRITICAL FIX

## 🚨 URGENT: Payment System Integration

The frontend payment flow now creates donations directly through `POST /api/donations`. This endpoint MUST be working for the payment system to function properly.

## Current Frontend Flow

1. User fills donation form
2. User submits payment in Flutterwave modal
3. Frontend calls `POST /api/donations` to create donation record
4. If successful, redirects to home page with success message
5. Home page refreshes donation history to show updated total

## Required Endpoint

```
POST /api/donations
Content-Type: application/json
```

### Request Payload Structure

The frontend sends this payload:

```json
{
  "amount": "100",
  "email": "user@example.com",
  "name": "John",
  "surname": "Doe",
  "other_name": "Smith",
  "phone": "+2341234567890",
  "project_id": 123,  // or null for endowment
  "endowment": "yes", // or "no"
  "type": "endowment", // or "project"
  "device_fingerprint": "base64_encoded_string"
}
```

### Expected Response

**Success Response:**
```json
{
  "success": true,
  "message": "Donation recorded successfully",
  "data": {
    "id": 1,
    "donor_id": 18,
    "amount": 100,
    "project_id": 123,
    "type": "endowment",
    "status": "success",
    "created_at": "2025-10-31T21:30:37.000000Z"
  }
}
```

OR

```json
{
  "success": true,
  "donation": {
    "id": 1,
    "donor_id": 18,
    "amount": 100,
    ...
  }
}
```

## Backend Implementation Requirements

### 1. Endpoint Logic

```php
// DonationController@store or similar
public function store(Request $request)
{
    $validated = $request->validate([
        'amount' => 'required|numeric|min:100',
        'email' => 'required|email',
        'name' => 'required|string',
        'surname' => 'required|string',
        'other_name' => 'nullable|string',
        'phone' => 'required|string',
        'project_id' => 'nullable|exists:projects,id',
        'endowment' => 'required|in:yes,no',
        'type' => 'required|in:endowment,project',
        'device_fingerprint' => 'nullable|string',
    ]);

    // Find or create donor
    $donor = Donor::where('email', $validated['email'])->first();
    
    if (!$donor) {
        // Create new donor with SEPARATE name fields
        $donor = Donor::create([
            'name' => $validated['name'],
            'surname' => $validated['surname'],
            'other_name' => $validated['other_name'] ?? null,
            'email' => $validated['email'],
            'phone' => $validated['phone'],
            'donor_type' => 'non_addressable_alumni', // or appropriate type
        ]);
    } else {
        // Update existing donor with SEPARATE name fields
        $donor->update([
            'name' => $validated['name'],
            'surname' => $validated['surname'],
            'other_name' => $validated['other_name'] ?? $donor->other_name,
            'phone' => $validated['phone'],
        ]);
    }

    // Create donation record
    $donation = Donation::create([
        'donor_id' => $donor->id,
        'project_id' => $validated['project_id'] ?? null,
        'amount' => $validated['amount'],
        'endowment' => $validated['endowment'],
        'type' => $validated['type'], // CRITICAL: Must be set!
        'status' => 'success', // Since payment is simulated/dummy
        'payment_reference' => 'FLUTTERWAVE_' . time() . '_' . $donor->id,
        'frequency' => 'onetime',
    ]);

    // Return success response
    return response()->json([
        'success' => true,
        'message' => 'Donation recorded successfully',
        'data' => $donation->load('donor', 'project')
    ], 201);
}
```

### 2. Database Schema Requirements

Ensure your `donations` table has:

```sql
CREATE TABLE donations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    donor_id INT NOT NULL,
    project_id INT NULL, -- NULL for endowment donations
    amount DECIMAL(10,2) NOT NULL,
    endowment ENUM('yes', 'no') DEFAULT 'no',
    type ENUM('endowment', 'project') NOT NULL, -- REQUIRED!
    status ENUM('pending', 'success', 'failed') DEFAULT 'pending',
    payment_reference VARCHAR(255),
    frequency ENUM('onetime', 'recurring') DEFAULT 'onetime',
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    FOREIGN KEY (donor_id) REFERENCES donors(id),
    FOREIGN KEY (project_id) REFERENCES projects(id)
);
```

### 3. Key Points

✅ **CRITICAL:** Save `name`, `surname`, `other_name` to SEPARATE columns  
✅ **CRITICAL:** Set `type` field when creating donation  
✅ **CRITICAL:** Return `success: true` in response  
✅ Create or update donor based on email  
✅ Link donation to project if `project_id` provided  
✅ Set status to 'success' since it's a dummy/simulated payment  
✅ Generate payment_reference for tracking  

### 4. Donor Name Fields

**DO NOT combine name fields:**
```php
// ❌ WRONG
$donor->name = $request->name . ' ' . $request->surname;

// ✅ CORRECT
$donor->name = $request->name;
$donor->surname = $request->surname;
$donor->other_name = $request->other_name ?? null;
```

## Testing

### Test Request

```bash
curl -X POST http://localhost:8000/api/donations \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "amount": "500",
    "email": "test@example.com",
    "name": "Test",
    "surname": "User",
    "other_name": "Demo",
    "phone": "+2341234567890",
    "endowment": "yes",
    "type": "endowment",
    "device_fingerprint": "test123"
  }'
```

### Expected Behavior

1. ✅ Creates or updates donor with separate name fields
2. ✅ Creates donation record with `type` field set
3. ✅ Returns success response
4. ✅ Donation appears in `/api/donations/history`
5. ✅ Total contributions update on home page

## Why This Matters

- Users complete payment in Flutterwave modal
- Frontend immediately saves donation to database
- User sees success message and updated contributions
- Creates smooth, real-feeling payment experience
- Allows testing without actual payment gateway integration

## Error Handling

If validation fails, return:
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "email": ["The email field is required."],
    "amount": ["The amount must be at least 100."]
  }
}
```

For server errors, return:
```json
{
  "success": false,
  "message": "Failed to record donation. Please try again."
}
```

## Summary

**The frontend expects:**
1. `POST /api/donations` endpoint to accept donation payload
2. Endpoint to create/update donor with separate name fields
3. Endpoint to create donation record with `type` field
4. Response with `success: true` or `data` object
5. Donation to appear in history endpoint immediately

**This is critical for the payment flow to work!** Without this endpoint working, users cannot complete donations.

