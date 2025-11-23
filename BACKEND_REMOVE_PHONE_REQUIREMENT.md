# Backend Update Required: Remove Phone Number Requirement from Donations

## Issue
The frontend is receiving a 422 validation error when attempting to make donations:
```
Validation errors: { "metadata.phone": [...] }
```

The backend is currently requiring the `phone` field in the donation metadata, but we want to make it optional.

## Current Frontend Behavior
The frontend is now sending `phone: ''` (empty string) in the metadata to satisfy the backend validation, but ideally the backend should accept donations without requiring a phone number.

## Required Backend Changes

### 1. Update Donation Validation Rules

**Location:** Likely in the donation controller or validation class (e.g., `DonationRequest.php`, `DonationController.php`, or similar)

**Current (likely):**
```php
'metadata.phone' => 'required|string|...',
```

**Change to:**
```php
'metadata.phone' => 'nullable|string|...',  // or simply remove the rule
```

### 2. Update Database Schema (if needed)

If the `phone` field in the `donations` table or related metadata is set as `NOT NULL`, you may need to:

**Option A:** Make the column nullable
```sql
ALTER TABLE donations MODIFY COLUMN phone VARCHAR(255) NULL;
```

**Option B:** Keep it as is if you're storing phone in metadata JSON and the column allows NULL

### 3. Update Any Business Logic

Check for any code that assumes `phone` is always present:
- Email notifications
- SMS notifications
- Reporting/analytics
- Any other features that use phone number

Make sure these features handle cases where `phone` is `null` or empty.

## Frontend Status

The frontend is currently sending:
```javascript
metadata: {
  name: user.name || '',
  surname: user.surname || '',
  other_name: user.other_name || null,
  phone: '',  // Empty string to satisfy current backend validation
  email: user.email || '',
  endowment: selectedProject ? 'no' : 'yes',
  type: selectedProject ? 'project' : 'endowment'
}
```

**After backend update:** The frontend can continue sending `phone: ''` or you can update the backend to accept requests without the phone field entirely.

## Testing

After making the backend changes, test:
1. ✅ Donation to Endowment Fund (should work without phone)
2. ✅ Donation to Project (should work without phone)
3. ✅ Verify donations are saved correctly in database
4. ✅ Check that any phone-dependent features still work (if phone is provided)

## Priority

**High** - This is blocking donations from being processed. Users cannot complete payments until this is fixed.

---

**Note:** If you prefer to keep phone as required for certain donation types (e.g., projects), you can make it conditional:
```php
'metadata.phone' => Rule::requiredIf(function () {
    return request()->input('metadata.type') === 'project';
}),
```

But based on the requirement, we want phone to be completely optional for all donation types.

