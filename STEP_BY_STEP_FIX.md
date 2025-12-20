# Step-by-Step Guide: Fix Donation Total Update Issue

## Problem
Your donation total shows ₦0.00 or doesn't update immediately after a donation because the frontend fetches data before the Paystack webhook finishes processing.

## Solution Steps

### Step 1: Open the File
Open `src/pages/Home.js` in your editor.

### Step 2: Find the Code to Replace
Press `Ctrl+F` and search for: `// Handle thank you message and refresh donations`

You should find this around line 334. The current code looks like this:

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
        // ... more code ...
      }).catch(() => {
        // Silent fail - don't show error
      });
    }
    
    // ... more code for projects refresh ...
  }
}, [thankYou, isAuthenticated, user]);
```

### Step 3: What to Change
**IMPORTANT:** You need to change ONLY the part that says `// Refresh donations history to update total` and the code inside the `if (isAuthenticated && user)` block.

**DO NOT** change:
- The `if (thankYou)` line
- The `toast.success()` call
- The projects refresh code (the `setTimeout` part)
- The `window.history.replaceState` line
- The closing `}` and `}, [thankYou, isAuthenticated, user]);`

### Step 4: Replace the Donation Fetch Code

Find this specific section (starts around line 343):

```javascript
    // Refresh donations history to update total
    if (isAuthenticated && user) {
      const cacheKey = `abu_totalDonated_${user.id}`;
      donationsAPI.getHistory().then(res => {
        const allDonations = res.data.donations || [];

        // Filter donations to only show the authenticated user's donations
        // Include ALL donations (endowment and projects) for this user
        const userDonations = allDonations.filter(donation => {
          const donorId = donation.donor_id || donation.donor?.id || donation.donor_id;
          return donorId === user.id;
        });

        // Calculate sum from user's donations only
        // Check both 'amount' and 'type' fields as the database might have them swapped
        const sum = userDonations.reduce((acc, d) => {
          const amount = d.amount || d.type || 0;
          return acc + Number(amount || 0);
        }, 0);

        console.log('Thank you - Total updated:', { sum, userDonations: userDonations.length });
        setTotalDonated(sum);
        localStorage.setItem(cacheKey, sum);
      }).catch(() => {
        // Silent fail - don't show error
      });
    }
```

**Replace it with:**

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

### Step 5: Verify Your Changes

After making the change, your complete `useEffect` should look like this:

```javascript
// Handle thank you message and refresh donations
useEffect(() => {
  if (thankYou) {
    // Show success toast
    toast.success(
      `Thank you for your donation of ${formatNaira(thankYou.amount)} to ${thankYou.project}! 🎉`,
      { duration: 5000 }
    );

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

    // Refresh projects list to show updated raised amounts
    // Clear cache and refetch projects after a short delay to allow backend to update
    setTimeout(() => {
      localStorage.removeItem('abu_projects');
      api.get('/api/projects')
        .then(res => {
          const activeProjects = res.data.filter(project => project.deleted_at === null || project.deleted_at === undefined);
          setProjects(activeProjects);
          localStorage.setItem('abu_projects', JSON.stringify(activeProjects));
        })
        .catch(() => {
          // Silent fail - don't show error
        });
    }, 2000); // 2 second delay to allow backend webhook to process

    // Clear location state to prevent showing message again on refresh
    window.history.replaceState({}, document.title);
  }
}, [thankYou, isAuthenticated, user]);
```

### Step 6: Save and Test

1. Save the file (`Ctrl+S`)
2. The app should recompile automatically
3. Make a test donation
4. Watch the console for "Donation total updated:" messages
5. Your total should update within 3-10 seconds!

## What This Fix Does

1. **Clears cache immediately** - Removes stale data
2. **Waits 3 seconds** - Gives the webhook time to process
3. **Polls 5 times** - Checks every 2 seconds for up to 10 seconds
4. **Auto-cleanup** - Stops polling after 10 seconds or when component unmounts

## Troubleshooting

If you still see syntax errors:
1. Make sure you didn't accidentally delete or change the `if (thankYou) {` line
2. Make sure the closing `}` and `}, [thankYou, isAuthenticated, user]);` are still there
3. Make sure you only replaced the donation fetch code, not the projects refresh code
