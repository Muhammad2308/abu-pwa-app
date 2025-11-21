# Google Origin Error - Step-by-Step Fix

## 🔍 Current Error

```
[GSI_LOGGER]: The given origin is not allowed for the given client ID.
```

## ✅ Solution: Add Your Exact Origin to Google Cloud Console

---

## 📋 Step 1: Find Your Current Origin

### Check Browser Console

I've added debugging to the frontend. When you load the page, check the browser console for:

```
Google OAuth - Current origin: http://localhost:XXXX
Google OAuth - Full URL: http://localhost:XXXX/register
```

**This tells you the exact origin you need to add!**

### Or Check Manually

**Look at your browser's address bar:**
- If it shows: `http://localhost:3000` → Origin is `http://localhost:3000`
- If it shows: `http://localhost:3001` → Origin is `http://localhost:3001`
- If it shows: `http://localhost:5173` → Origin is `http://localhost:5173` (Vite)
- If it shows: `https://abu-endowment-mobile.vercel.app` → Origin is `https://abu-endowment-mobile.vercel.app`

**The origin is:** `protocol://host:port` (no path, no trailing slash)

---

## 📋 Step 2: Go to Google Cloud Console

1. **Open:** https://console.cloud.google.com/apis/credentials
2. **Sign in** with your Google account
3. **Select your project** (or the project that contains your OAuth client)

---

## 📋 Step 3: Find Your OAuth 2.0 Client

1. **Look for:** `470253699627-a50centdev8a3ahhq0e01oiakatu3qh4`
2. **Click on it** to edit

---

## 📋 Step 4: Add Authorized JavaScript Origins

### In the "Authorized JavaScript origins" section:

**Click "+ ADD URI"** and add your exact origin:

#### For Local Development (Common Ports):

```
http://localhost:3000
```

**OR if your console shows a different port:**

```
http://localhost:3001   ← If React runs on port 3001
http://localhost:5173   ← If using Vite (port 5173)
http://localhost:8080   ← If using port 8080
```

#### For Production:

```
https://abu-endowment-mobile.vercel.app
```

### Important Rules:

- ✅ **Must include protocol:** `http://` or `https://`
- ✅ **Must include port** if not default (80 for http, 443 for https)
- ✅ **NO trailing slash:** `http://localhost:3000` ✅ (not `http://localhost:3000/` ❌)
- ✅ **NO path:** `http://localhost:3000` ✅ (not `http://localhost:3000/register` ❌)
- ✅ **Exact match:** Must match exactly what's in your browser's address bar

### Example of Correct Format:

```
http://localhost:3000
https://abu-endowment-mobile.vercel.app
```

### Example of Wrong Format:

```
❌ localhost:3000                    (missing http://)
❌ http://localhost:3000/            (trailing slash)
❌ http://localhost:3000/register    (includes path)
❌ http://www.localhost:3000         (extra www)
❌ https://localhost:3000            (wrong protocol for localhost)
```

---

## 📋 Step 5: Save and Wait

1. **Click "SAVE"** at the bottom of the page
2. **Wait 1-5 minutes** for Google to update their servers

---

## 📋 Step 6: Test

1. **Clear browser cache:**
   - Press `Ctrl+Shift+Delete`
   - Select "Cached images and files"
   - Click "Clear data"

2. **Hard refresh:**
   - Press `Ctrl+Shift+R` or `Ctrl+F5`

3. **Try Google sign-in again:**
   - Go to `/register` or `/login`
   - Click "Register with Google" or "Login with Google"
   - Check browser console

**Expected:**
- ✅ No `[GSI_LOGGER]` errors
- ✅ Google sign-in popup appears
- ✅ Console shows: `Google OAuth - Current origin: http://localhost:XXXX`

---

## 🔍 Troubleshooting

### Issue 1: Still Getting Error After Adding Origin

**Check:**
1. **Exact match:** Origin must match exactly (case-sensitive)
2. **No typos:** Double-check for typos
3. **Waited 5 minutes:** Google updates can take time
4. **Cleared cache:** Browser might be caching old config
5. **Correct client ID:** Make sure you're editing the right OAuth client

**Solution:**
- Remove the origin and re-add it
- Try incognito/private window
- Wait 5 more minutes

### Issue 2: Don't Know Your Port

**Check your terminal where React is running:**

```
Compiled successfully!

You can now view abu-pwa-app in the browser.

  Local:            http://localhost:3000  ← This is your origin
  On Your Network:  http://192.168.1.1:3000
```

**Or check browser console:**
- The debugging I added will show: `Google OAuth - Current origin: ...`

### Issue 3: Multiple Ports

**If React sometimes runs on different ports:**

Add all possible ports:
```
http://localhost:3000
http://localhost:3001
http://localhost:5173
```

### Issue 4: Production URL Changed

**If your Vercel URL changed:**

1. Check Vercel dashboard for current URL
2. Update Google Console with new URL
3. Remove old URL if no longer used

---

## 📊 Quick Checklist

- [ ] Found your exact origin (check browser console or address bar)
- [ ] Went to Google Cloud Console
- [ ] Found OAuth client: `470253699627-a50centdev8a3ahhq0e01oiakatu3qh4`
- [ ] Added origin to "Authorized JavaScript origins"
- [ ] No trailing slash
- [ ] Includes protocol (`http://` or `https://`)
- [ ] Includes port if not default
- [ ] Saved changes
- [ ] Waited 5 minutes
- [ ] Cleared browser cache
- [ ] Hard refresh (Ctrl+Shift+R)
- [ ] Tested Google sign-in
- [ ] No more origin errors

---

## 🎯 Summary

**The error means:** Google doesn't recognize your frontend's origin.

**The fix:** Add your exact origin to Google Cloud Console.

**How to find origin:** Check browser console (I added debugging) or look at address bar.

**Time to fix:** 5-10 minutes (mostly waiting for Google to update).

---

## 💡 Pro Tip

**After adding the origin, the browser console will show:**
```
Google OAuth - Current origin: http://localhost:3000
```

**If you see a warning:**
```
Google OAuth - Origin not in expected list: http://localhost:XXXX
Google OAuth - Please add this origin to Google Cloud Console:
  http://localhost:XXXX
```

**That's the exact origin you need to add!** 🎯

