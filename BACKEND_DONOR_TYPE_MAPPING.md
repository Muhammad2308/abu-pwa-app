# Backend Donor Type Mapping Fix

## Problem

The frontend sends `donor_type: "Alumni"` but the backend validation expects:
- `addressable_alumni` or `non_addressable_alumni` (not `Alumni`)
- `Individual`, `Organization`, `NGO` (these work)

**Backend Validation:**
```php
'donor_type' => 'required|string|in:supporter,addressable_alumni,non_addressable_alumni,Individual,Organization,NGO'
```

**Frontend Sends:**
```json
{
  "donor_type": "Alumni"  // ❌ Not in allowed list
}
```

---

## ✅ Frontend Fix Applied

Added a mapping function to convert frontend donor types to backend format:

```javascript
const mapDonorTypeToBackend = (frontendType) => {
  const mapping = {
    'Alumni': 'addressable_alumni', // Map "Alumni" to backend format
    'Individual': 'Individual',
    'Organization': 'Organization',
    'NGO': 'NGO'
  };
  return mapping[frontendType] || 'Individual'; // Default to Individual if unknown
};
```

**Now sends:**
```json
{
  "donor_type": "addressable_alumni"  // ✅ Valid backend value
}
```

---

## 🔄 Alternative Backend Fix

If you prefer to keep frontend values as-is, update backend validation:

### Option 1: Accept "Alumni" in validation

```php
'donor_type' => 'required|string|in:supporter,addressable_alumni,non_addressable_alumni,Alumni,Individual,Organization,NGO',
```

Then map in backend controller:

```php
// Map frontend "Alumni" to backend format
if ($validated['donor_type'] === 'Alumni') {
    $validated['donor_type'] = 'addressable_alumni'; // or 'non_addressable_alumni'
}
```

### Option 2: Accept both formats

```php
'donor_type' => 'required|string|in:supporter,addressable_alumni,non_addressable_alumni,Alumni,Individual,Organization,NGO',
```

---

## 📋 Donor Type Mapping

| Frontend Value | Backend Value | Notes |
|---------------|---------------|-------|
| `Alumni` | `addressable_alumni` | Mapped in frontend |
| `Individual` | `Individual` | Direct match |
| `Organization` | `Organization` | Direct match |
| `NGO` | `NGO` | Direct match |

---

## ✅ Status

**FIXED** - Frontend now maps "Alumni" to "addressable_alumni" before sending to backend.

Registration should now work for all donor types! 🎉

