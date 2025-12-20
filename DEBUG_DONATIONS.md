# Debugging: Why Donations Don't Show After Login

## Steps to Debug

### 1. Open Browser Console
Press **F12** to open Developer Tools, then click on the **Console** tab.

### 2. Login to Your Account
Login with an account that has made donations before.

### 3. Look for This Log Message
After logging in, you should see a console log that says:
```
Total donations calculation: {
  allDonations: X,
  userDonations: Y,
  userId: Z,
  donations: [...]
}
```

### 4. Check These Values:

**If `allDonations` is 0:**
- The API `/api/donations/history` is not returning any donations
- Check your backend/database

**If `allDonations` > 0 but `userDonations` is 0:**
- There's a **USER ID MISMATCH**
- Your `user.id` doesn't match the `donor_id` in the donations
- This is the most likely issue!

**If you see the donations array:**
- Look at the `donor_id` values in the donations
- Compare them to your `userId`
- Check if one is a string and one is a number

### 5. Common Issues:

#### Issue: Type Mismatch
```javascript
// Your user.id might be: "123" (string)
// But donor_id might be: 123 (number)
// These won't match with ===
```

**Solution:** We need to convert both to the same type before comparing.

#### Issue: Wrong Field Name
```javascript
// Maybe the donations use 'user_id' instead of 'donor_id'
// Or maybe it's nested differently
```

## Quick Fix to Try

If you see a type mismatch in the console, try this:

1. Open `src/pages/Home.js`
2. Find line 427 (in the `useEffect` around line 413)
3. Change this line:
```javascript
const donorId = donation.donor_id || donation.donor?.id || donation.donor_id;
return donorId === user.id;
```

To this (converts both to strings):
```javascript
const donorId = donation.donor_id || donation.donor?.id || donation.donor_id;
return String(donorId) === String(user.id);
```

## What to Send Me

After you login and check the console, please send me:
1. The value of `allDonations` (how many total donations)
2. The value of `userDonations` (how many match your user)
3. The value of `userId` (your user ID)
4. One example donation object from the array (if any)

This will help me fix the exact issue!
