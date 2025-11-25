# Paystack Test Mode Debugging Guide

## Overview

When using Paystack in **test mode**, the payment window allows you to simulate success or failure. This guide helps debug issues when selecting "success" in the test payment window.

---

## ✅ Normal Test Mode Flow

### Expected Behavior:

1. **User clicks "Pay" button**
   - Frontend calls `/api/payments/initialize`
   - Backend creates payment record with `status = 'pending'`

2. **Paystack test window opens**
   - Shows test payment form
   - User can select "Success" or "Failure"

3. **User selects "Success"**
   - Paystack simulates successful payment
   - `onSuccess` callback fires with reference

4. **Frontend verifies payment**
   - Calls `/api/payments/verify/{reference}`
   - Backend verifies with Paystack API

5. **Backend updates donation**
   - Sets `status = 'completed'`
   - Updates project `raised` amount

6. **User sees success message**
   - Redirects to home page
   - Projects refresh with updated amounts

---

## 🔍 Debugging Steps

### Step 1: Check Browser Console

After selecting "Success" in Paystack test window, check browser console for:

```
✅ "Paystack payment successful (onSuccess callback):" - Should show full response
✅ "Verifying payment immediately with reference:" - Should show reference
✅ "Payment verification response received:" - Should show backend response
✅ "Payment verification result:" - Should show isSuccess: true
```

**If you see errors:**
- ❌ "Immediate verification error:" - Backend verification failed
- ❌ "Payment verification error:" - Network or API error

### Step 2: Check Network Tab

1. Open browser DevTools → Network tab
2. Filter by "verify"
3. Look for: `GET /api/payments/verify/{reference}`
4. Check:
   - **Status:** Should be `200 OK`
   - **Response:** Should have `success: true` and `status: "success"`

**Common Issues:**
- `404 Not Found` - Verify endpoint doesn't exist
- `500 Internal Server Error` - Backend error
- `401 Unauthorized` - Authentication issue

### Step 3: Check Backend Logs

Check your backend logs for:

```
✅ "Payment verification attempt" - Verification started
✅ "Paystack verification response" - Paystack API response
✅ "Donation status updated" - Status changed to completed
✅ "Project raised amount updated" - Project updated
```

**If you see errors:**
- ❌ "Donation not found" - Reference doesn't match
- ❌ "Paystack API error" - Paystack verification failed
- ❌ "Failed to update project raised" - Project update failed

---

## 🐛 Common Issues & Solutions

### Issue 1: Payment Shows Success But Status Stays "Pending"

**Symptoms:**
- Paystack shows success
- Frontend shows success message
- But donation status is still "pending" in database

**Possible Causes:**

#### A. Verification Not Called
- **Check:** Browser console for "Verifying payment immediately"
- **Solution:** Ensure `onSuccess` callback is firing

#### B. Verification Fails Silently
- **Check:** Network tab for verify request
- **Check:** Backend logs for errors
- **Solution:** Check backend verification logic

#### C. Backend Not Updating Status
- **Check:** Backend logs for "Donation status updated"
- **Solution:** Ensure backend checks both `status` and `gateway_response`

**Fix:**
```javascript
// Frontend should check both fields
const isSuccess = response.data.success || 
                paymentData?.status === 'success' ||
                (paymentData?.gateway_response && 
                 paymentData.gateway_response.toLowerCase() === 'successful');
```

### Issue 2: Reference Not Found

**Symptoms:**
- Console shows "Donation not found"
- Backend returns 404 or error

**Possible Causes:**

#### A. Reference Mismatch
- Paystack returns different reference than stored
- **Solution:** Backend should try both request reference and Paystack response reference

#### B. Payment Not Initialized
- Payment record doesn't exist in database
- **Solution:** Check if `/api/payments/initialize` created the record

**Fix:**
```php
// Backend should check both references
$donation = Donation::where('payment_reference', $reference)
    ->orWhere('payment_reference', $paystackResponse['reference'])
    ->first();
```

### Issue 3: Test Mode Keys Not Working

**Symptoms:**
- Payment window doesn't open
- "Invalid key" error

**Solution:**
1. Check backend `.env` file:
   ```
   PAYSTACK_PUBLIC_KEY=pk_test_...
   PAYSTACK_SECRET_KEY=sk_test_...
   ```
2. Ensure using **test keys** (start with `pk_test_` and `sk_test_`)
3. Restart backend server after changing keys

### Issue 4: Callback URL Not Working

**Symptoms:**
- Payment succeeds but callback doesn't fire
- No reference in URL after payment

**Solution:**
1. Check Paystack dashboard → Settings → API Keys & Webhooks
2. Ensure callback URL is set: `https://your-domain.com/donations`
3. For local development, use ngrok or similar

---

## 🧪 Testing Checklist

### Before Testing:

- [ ] Backend is using Paystack **test keys**
- [ ] Frontend is calling `/api/payments/initialize`
- [ ] Paystack test window opens correctly
- [ ] Browser console is open for debugging

### During Test:

- [ ] Select "Success" in Paystack test window
- [ ] Check console for "Paystack payment successful"
- [ ] Check console for "Verifying payment immediately"
- [ ] Check Network tab for verify request
- [ ] Check console for verification response

### After Test:

- [ ] Success message appears
- [ ] Redirects to home page
- [ ] Check database: donation `status = 'completed'`
- [ ] Check database: project `raised` amount updated
- [ ] Check frontend: project card shows updated raised amount

---

## 📊 Expected Console Output

### Successful Payment:

```
✅ Paystack payment successful (onSuccess callback): {reference: "ABU_...", ...}
📋 Full Paystack response: {...}
🔍 Verifying payment immediately with reference: ABU_1234567890_1
🌐 Calling: GET /api/payments/verify/ABU_1234567890_1
📥 Immediate verification response received: {success: true, data: {...}}
📋 Full verification response: {...}
✅ Payment verification result: {isSuccess: true, status: "success", ...}
```

### Failed Verification:

```
✅ Paystack payment successful (onSuccess callback): {reference: "ABU_...", ...}
🔍 Verifying payment immediately with reference: ABU_1234567890_1
❌ Immediate verification error: Error: ...
❌ Error details: {message: "...", status: 500, ...}
ℹ️ Payment was successful in Paystack, but verification failed. Webhook will handle final verification.
```

---

## 🔧 Quick Fixes

### Fix 1: Add Manual Verify Button (For Testing)

Add a button to manually trigger verification:

```javascript
// In browser console after payment
const reference = 'YOUR_REFERENCE_HERE';
fetch(`/api/payments/verify/${reference}`)
  .then(res => res.json())
  .then(data => console.log('Verification result:', data));
```

### Fix 2: Check Paystack Dashboard

1. Go to Paystack Dashboard → Transactions
2. Find your test transaction
3. Check status (should be "successful")
4. Copy the reference
5. Use it to manually verify

### Fix 3: Database Check

```sql
-- Check donation status
SELECT id, payment_reference, status, amount, created_at, verified_at
FROM donations
WHERE payment_reference = 'YOUR_REFERENCE'
ORDER BY created_at DESC;

-- Check project raised amount
SELECT id, project_title, target, raised
FROM projects
WHERE id = YOUR_PROJECT_ID;
```

---

## 🎯 Test Mode Best Practices

1. **Always use test keys** in development
2. **Check console logs** for every step
3. **Verify in database** after each test
4. **Test both success and failure** scenarios
5. **Clear browser cache** if issues persist
6. **Check backend logs** for detailed errors

---

## 📝 Summary

When testing in Paystack test mode:

1. ✅ Select "Success" in test window
2. ✅ Check browser console for logs
3. ✅ Check Network tab for verify request
4. ✅ Check backend logs for verification
5. ✅ Verify database shows `status = 'completed'`
6. ✅ Verify project `raised` amount updated

**If any step fails, check the logs and follow the debugging steps above!**

---

## 🚀 Next Steps

1. **Test the flow** with enhanced logging
2. **Check console output** after selecting "Success"
3. **Share console logs** if issues persist
4. **Check backend logs** for verification errors
5. **Verify database** after payment

**The enhanced logging should help identify exactly where the issue occurs!** 🔍

