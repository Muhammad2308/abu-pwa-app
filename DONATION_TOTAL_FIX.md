# Fix for Donation Total Not Updating

## Problem
The total donations display shows ₦0.00 or doesn't update immediately after making a donation. This happens because:

1. **Webhook Delay**: After payment, Paystack sends a webhook to save the donation. This takes 2-5 seconds.
2. **Frontend Fetches Too Early**: The app fetches donation history immediately, before the webhook completes.
3. **Stale Cache**: The cached total in `localStorage` shows the old value.

## Solution
Add a **polling mechanism** to check for new donations multiple times after a payment.

## Implementation

In `src/pages/Home.js`, find the `useEffect` hook around **line 335-369** that starts with:
```javascript
// Handle thank you message and refresh donations
useEffect(() => {
  if (thankYou) {
    // Show success toast
    toast.success(
      `Thank you for your donation of ${formatNaira(thankYou.amount)} to ${thankYou.project}! 🎉`,
      { duration: 5000 }
    );

    // Refresh donations history to update total
    if (isAuthenticated && user) {
      const cacheKey = `abu_totalDonated_${user.id}`;
      donationsAPI.getHistory().then(res => {
        // ... existing code ...
      }).catch(() => {
        // Silent fail - don't show error
      });
    }
```

**Replace the section starting from `// Refresh donations history to update total` (line 343-369) with:**

```javascript
      // Refresh donations history to update total with polling mechanism
      if (isAuthenticated && user) {
        const cacheKey = `abu_totalDonated_${user.id}`;
        
        // Clear cache immediately to force refresh
        localStorage.removeItem(cacheKey);
        
        // Function to fetch and update donation total
        const fetchDonationTotal = async () => {
          try {
            const res = await donationsAPI.getHistory();
            const allDonations = res.data.donations || [];

            // Filter donations to only show the authenticated user's donations
            const userDonations = allDonations.filter(donation => {
              const donorId = donation.donor_id || donation.donor?.id;
              return donorId === user.id;
            });

            // Calculate sum from user's donations only
            const sum = userDonations.reduce((acc, d) => {
              const amount = d.amount || d.type || 0;
              return acc + Number(amount || 0);
            }, 0);

            console.log('Donation total updated:', { sum, userDonations: userDonations.length });
            setTotalDonated(sum);
            localStorage.setItem(cacheKey, sum);
            
            return sum;
          } catch (error) {
            console.error('Error fetching donation total:', error);
            return null;
          }
        };

        // Initial fetch after 3 seconds (give webhook time to process)
        setTimeout(() => {
          fetchDonationTotal();
        }, 3000);

        // Poll every 2 seconds for up to 10 seconds to catch webhook updates
        let pollCount = 0;
        const maxPolls = 5; // 5 polls = 10 seconds
        const pollInterval = setInterval(async () => {
          pollCount++;
          await fetchDonationTotal();
          
          if (pollCount >= maxPolls) {
            clearInterval(pollInterval);
          }
        }, 2000);

        // Cleanup interval on unmount
        return () => clearInterval(pollInterval);
      }
```

## How It Works

1. **Immediate Cache Clear**: Removes the old cached total right away
2. **Initial Delay**: Waits 3 seconds before first fetch (gives webhook time)
3. **Polling**: Checks for new donations every 2 seconds
4. **Max Duration**: Stops after 5 polls (10 seconds total)
5. **Cleanup**: Clears the interval when component unmounts

## Result

Your donation total will update within 3-10 seconds after a successful payment, even if the webhook is slow!

## Testing

1. Make a test donation
2. Watch the console logs for "Donation total updated:"
3. The total should update within 3-10 seconds
4. Make another donation to verify it works consistently
