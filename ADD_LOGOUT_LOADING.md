# Add Loading Indicator for Logout

## Problem
Logout takes time but there's no visual feedback showing it's in progress.

## Solution
Add a loading toast notification that appears immediately when logout starts.

## Manual Fix

### Step 1: Open the File
Open `src/components/Layout.js`

### Step 2: Find the handleLogout Function
Press `Ctrl+F` and search for: `const handleLogout`

You'll find this around line 39:

```javascript
const handleLogout = async () => {
  setShowUserDropdown(false);
  await logout();
  toast.success('Logged out successfully. You can now login with a different account.');
  // Small delay before navigation to ensure state is cleared
  setTimeout(() => {
    navigate('/', { replace: true });
  }, 300);
};
```

### Step 3: Replace with This Code

Replace the entire function with:

```javascript
const handleLogout = async () => {
  setShowUserDropdown(false);
  
  // Show loading toast immediately
  const loadingToast = toast.loading('Logging out...');
  
  try {
    await logout();
    toast.dismiss(loadingToast);
    toast.success('Logged out successfully. You can now login with a different account.');
    
    // Small delay before navigation to ensure state is cleared
    setTimeout(() => {
      navigate('/', { replace: true });
    }, 300);
  } catch (error) {
    toast.dismiss(loadingToast);
    toast.error('Logout failed. Please try again.');
  }
};
```

### Step 4: Save
Press `Ctrl+S`

## What This Does

1. **Immediate Feedback**: Shows "Logging out..." toast as soon as user clicks logout
2. **Better UX**: User knows something is happening instead of waiting with no feedback
3. **Error Handling**: If logout fails, shows an error message
4. **Clean Transition**: Dismisses loading toast before showing success message

## Result
Now when users click logout, they'll immediately see a loading indicator, making the app feel more responsive even if the backend is slow.
