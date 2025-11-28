# PAYSTACK PAYMENT FIX - SIMPLE STEPS

## ⚠️ The Problem
Your payment is failing because you're using **deprecated Paystack API**. The console shows:
- `"PaystackPop.setup()" has been deprecated`
- `"openIframe" has been deprecated`
- `POST https://api.paystack.co/checkout/request_inline 400 (Bad Request)`

## ✅ Simple Fix (3 Changes)

### Step 1: Change Line 418
**Find this line (line 418):**
```javascript
const paystack = window.PaystackPop.setup({
```

**Replace with:**
```javascript
const handler = new window.PaystackPop();
handler.newTransaction({
```

### Step 2: Change Lines 419-423
**Find these lines (419-423):**
```javascript
key: process.env.REACT_APP_PAYSTACK_PUBLIC_KEY || 'pk_test_your_key_here',
email: paymentData.email,
amount: amountInNaira * 100,
ref: response.data.data.reference,
metadata: metadata,
```

**Replace with:**
```javascript
key: process.env.REACT_APP_PAYSTACK_PUBLIC_KEY || 'pk_test_your_key_here',
accessCode: access_code,
```

### Step 3: Change Lines 424-428 and 510-512
**Find this (lines 424-428):**
```javascript
onClose: function () {
  console.log('Paystack popup closed');
  setProcessingPayment(false);
},
callback: function (response) {
```

**Replace with:**
```javascript
onSuccess: (transaction) => {
```

**AND remove line 512:**
```javascript
paystack.openIframe();  // DELETE THIS LINE
```

**Add after line 509 (after the closing `}`):**
```javascript
onCancel: () => {
  console.log('Paystack popup closed');
  setProcessingPayment(false);
}
```

## 📋 Quick Summary
1. Line 418: `const handler = new window.PaystackPop();` + `handler.newTransaction({`
2. Lines 419-423: Keep only `key` and add `accessCode: access_code,`
3. Line 424: Change `onClose` + `callback` to `onSuccess: (transaction) =>`
4. Line 512: **DELETE** `paystack.openIframe();`
5. After line 509: Add `onCancel` callback

## 🎯 Result
After these changes, the payment will work without deprecation warnings!

---

## Alternative: Copy-Paste Full Replacement

If you prefer, open `Donations.js` and replace lines 417-512 with this complete block:

```javascript
      // Open Paystack payment popup using current API
      const handler = new window.PaystackPop();
      
      handler.newTransaction({
        key: process.env.REACT_APP_PAYSTACK_PUBLIC_KEY || 'pk_test_your_key_here',
        accessCode: access_code,
        onSuccess: (transaction) => {
          // Payment successful - verify immediately with backend
          console.log('Paystack payment successful:', transaction);
          const reference = transaction.reference || transaction.trxref;

          if (reference) {
            // Verify payment with backend immediately
            console.log('Verifying payment immediately with reference:', reference);
            paymentsAPI.verify(reference)
              .then(verifyResponse => {
                console.log('Immediate verification response:', verifyResponse.data);
                const verifyData = verifyResponse.data.data || verifyResponse.data;

                // Check both status and gateway_response
                const isSuccess = verifyResponse.data.success ||
                  verifyData?.status === 'success' ||
                  (verifyData?.gateway_response &&
                    verifyData.gateway_response.toLowerCase() === 'successful');

                if (isSuccess) {
                  const projectName = selectedProject?.project_title || 'the Endowment Fund';
                  const amount = verifyData?.amount ? verifyData.amount / 100 : amountInNaira;

                  // Store thank you data
                  sessionStorage.setItem('donationThankYou', JSON.stringify({
                    project: projectName,
                    amount: amount
                  }));

                  toast.success('Payment verified successfully! 🎉');

                  // Redirect to home using React Router to preserve authentication state
                  setTimeout(() => {
                    navigate('/', { replace: true });
                  }, 500);
                } else {
                  // Verification didn't confirm success, but payment was made
                  console.warn('Payment made but verification unclear:', verifyData);
                  toast.success('Payment received! Verification in progress...');

                  // Still redirect - webhook will handle final verification
                  const projectName = selectedProject?.project_title || 'the Endowment Fund';
                  sessionStorage.setItem('donationThankYou', JSON.stringify({
                    project: projectName,
                    amount: amountInNaira
                  }));

                  setTimeout(() => {
                    navigate('/', { replace: true });
                  }, 500);
                }
              })
              .catch(error => {
                console.error('Immediate verification error:', error);
                // Payment was successful in Paystack, but verification failed
                // Still proceed - webhook will handle verification
                toast.success('Payment received! Verification in progress...');

                const projectName = selectedProject?.project_title || 'the Endowment Fund';
                sessionStorage.setItem('donationThankYou', JSON.stringify({
                  project: projectName,
                  amount: amountInNaira
                }));

                setTimeout(() => {
                  navigate('/', { replace: true });
                }, 500);
              });
          } else {
            // No reference - fallback to callback URL handling
            console.warn('No reference in Paystack response, relying on callback URL');
            const projectName = selectedProject?.project_title || 'the Endowment Fund';
            sessionStorage.setItem('donationThankYou', JSON.stringify({
              project: projectName,
              amount: amountInNaira
            }));

            setTimeout(() => {
              navigate('/', { replace: true });
            }, 500);
          }
        },
        onCancel: () => {
          console.log('Paystack popup closed');
          setProcessingPayment(false);
        }
      });
```

Save the file and the payment should work! 🎉
