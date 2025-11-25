# Solution Plan: Supporting Users with Session but No Donor Record

## Problem Analysis

When users register with email/password, they get a `donor_sessions` record but no `donors` record. This causes:

1. **AuthContext** sets `user = null` when `donorData` is null
2. **All components** check `isAuthenticated && user` to show user-specific content
3. **Result**: User appears logged out across all pages (Layout, Home, Donations, etc.)

## Root Cause

The codebase uses `user` as a proxy for authentication status, but `isAuthenticated` is the actual source of truth. When `user` is null but `isAuthenticated` is true, components incorrectly treat the user as logged out.

## Solution Strategy

### Phase 1: Create Minimal User Object in AuthContext

**File: `src/contexts/AuthContext.js`**

When `donorData` is null but session exists, create a minimal user object:

```javascript
// In checkSession function, after getting sessionData:
const donorData = sessionData.donor || sessionData.data?.donor || response.data.data?.donor;

// Create minimal user object if donor is null
const minimalUser = donorData || {
  id: null, // No donor ID yet
  email: sessionData.username || storedUsername,
  name: null,
  surname: null,
  profile_image: null,
  donor_type: null,
  // All other fields null
  _isMinimal: true // Flag to indicate this is a minimal user object
};

setUser(minimalUser);
```

### Phase 2: Update Components to Handle Minimal Users

**Files to Update:**

1. **`src/components/Layout.js`**
   - Change `isAuthenticated && user` to `isAuthenticated`
   - Use `user?.email || username` for display
   - Show "Complete Profile" prompt if `user?._isMinimal`

2. **`src/pages/Home.js`**
   - Change `isAuthenticated && user` to `isAuthenticated`
   - Use `user?.id` checks only when needed (e.g., donation history)
   - Show email instead of name if `user?._isMinimal`

3. **`src/pages/Donations.js`**
   - Already handles `isAuthenticated && !user` correctly
   - Keep existing logic

4. **`src/pages/Profile.js`**
   - Check if `user?._isMinimal` and show registration prompt
   - Allow profile completion

### Phase 3: Update Helper Functions

**File: `src/contexts/AuthContext.js`**

1. **`cacheUserData`**: Handle minimal user objects
2. **`getCachedUserData`**: Return minimal user if needed
3. **`register`**: Create minimal user object after registration
4. **`login`**: Create minimal user object if no donor

### Phase 4: Update API Calls

Some API calls require `user.id`. For minimal users:
- Donation history: Show empty or prompt to complete profile
- Profile updates: Redirect to registration modal
- Other donor-specific features: Show "Complete Profile" prompt

## Implementation Steps

### Step 1: Update AuthContext to Create Minimal User

```javascript
// In checkSession, after line 147:
if (!donorData && sessionData.username) {
  // Create minimal user object
  const minimalUser = {
    id: null,
    email: sessionData.username,
    name: null,
    surname: null,
    profile_image: null,
    donor_type: null,
    _isMinimal: true
  };
  setUser(minimalUser);
  cacheUserData(minimalUser, sessionData.username);
} else {
  setUser(donorData);
  cacheUserData(donorData, sessionData.username);
}
```

### Step 2: Update Layout Component

```javascript
// Change line 167:
{isAuthenticated ? (
  // Show user menu
) : (
  // Show login button
)}

// Change line 277:
{isAuthenticated && (user?.email || username) && (
  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
    <p className="text-xs text-gray-500 mb-1">Signed in as</p>
    <p className="text-sm font-medium text-gray-900 truncate">
      {user?.email || username}
    </p>
    {user?._isMinimal && (
      <p className="text-xs text-yellow-600 mt-1">
        Complete your profile to unlock all features
      </p>
    )}
  </div>
)}
```

### Step 3: Update Home Component

```javascript
// Change line 616:
{isAuthenticated && (user?.name || user?.surname || user?.email) && (
  <div className="text-right">
    <p className="text-sm font-semibold text-white opacity-95">
      {[user?.name, user?.surname].filter(Boolean).join(' ') || user?.email || 'User'}
    </p>
  </div>
)}

// Change line 626:
if (isAuthenticated) {
  if (user?.id) {
    setShowHistoryModal(true);
  } else {
    toast.info('Please complete your profile to view transaction history');
    // Optionally redirect to profile completion
  }
}

// Change line 642:
<div className="text-3xl font-bold">
  {formatNaira(isAuthenticated && user?.id ? totalDonated : 0)}
</div>
```

### Step 4: Update Register/Login Functions

```javascript
// In register function, after successful registration:
if (!donorData) {
  const minimalUser = {
    id: null,
    email: newUsername,
    name: null,
    surname: null,
    profile_image: null,
    donor_type: null,
    _isMinimal: true
  };
  setUser(minimalUser);
  cacheUserData(minimalUser, newUsername);
}
```

## Testing Checklist

- [ ] User registers with email/password → sees minimal user object
- [ ] User logs in → sees minimal user object if no donor
- [ ] Layout shows user menu when authenticated (even without donor)
- [ ] Home page shows email instead of name for minimal users
- [ ] Donation history prompts to complete profile for minimal users
- [ ] Profile page shows registration form for minimal users
- [ ] All pages recognize user as authenticated
- [ ] User can complete profile and get full user object

## Benefits

1. **Consistent Authentication State**: `isAuthenticated` is the single source of truth
2. **Better UX**: Users see they're logged in even without donor record
3. **Clear Path Forward**: Users are prompted to complete profile
4. **Backward Compatible**: Existing code with full user objects still works
5. **Minimal Changes**: Most components just need to check `isAuthenticated` instead of `isAuthenticated && user`

## Migration Notes

- Components checking `user?.id` should handle `null` gracefully
- Components checking `user?.name` should fallback to `user?.email`
- All authentication checks should use `isAuthenticated`, not `user`
- Donor-specific features should check `user?.id` and show prompts if null

