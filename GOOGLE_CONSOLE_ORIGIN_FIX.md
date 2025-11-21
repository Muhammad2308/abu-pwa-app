# Google Console Origin Error - Quick Fix Guide

## 🔍 Error Message

```
[GSI_LOGGER]: The given origin is not allowed for the given client ID.
```

## ✅ Solution: Configure Google Cloud Console

This is a **Google Cloud Console configuration issue**, not a frontend code issue. The frontend is already correctly configured.

---

## 📋 Step-by-Step Fix

### Step 1: Access Google Cloud Console

1. Go to: https://console.cloud.google.com/apis/credentials
2. Sign in with your Google account
3. Select your project (or create one if needed)

### Step 2: Find Your OAuth 2.0 Client

1. Look for: `470253699627-a50centdev8a3ahhq0e01oiakatu3qh4`
2. Click on it to edit

### Step 3: Add Authorized JavaScript Origins

**In the "Authorized JavaScript origins" section, add:**

#### For Local Development:
```
http://localhost:3000
```

#### For Production:
```
https://abu-endowment-mobile.vercel.app
```

**Important Rules:**
- ✅ Must include protocol (`http://` or `https://`)
- ✅ Must include port if not default (`:3000`)
- ✅ **No trailing slash** (`/`)
- ✅ Exact match with your frontend URL
- ✅ Case-sensitive

### Step 4: Save and Wait

1. Click **"Save"** at the bottom
2. Wait **1-5 minutes** for changes to propagate

---

## 🔍 Verify Your Current Setup

### Check Frontend URL

**Local Development:**
- React default: `http://localhost:3000`
- Check your terminal: `webpack compiled successfully` should show the port
- If different port (e.g., `3001`), add that too

**Production:**
- Vercel URL: `https://abu-endowment-mobile.vercel.app`
- Check your Vercel dashboard for exact URL

### Check Google Console

**Authorized JavaScript origins should have:**
```
http://localhost:3000
https://abu-endowment-mobile.vercel.app
```

**Common Mistakes:**
- ❌ `localhost:3000` (missing `http://`)
- ❌ `http://localhost:3000/` (trailing slash)
- ❌ `http://www.localhost:3000` (extra `www.`)
- ❌ `https://localhost:3000` (wrong protocol for localhost)

---

## 🧪 Test After Configuration

### Step 1: Clear Browser Cache

**Chrome/Edge:**
- Press `Ctrl+Shift+Delete`
- Select "Cached images and files"
- Click "Clear data"

**Or Hard Refresh:**
- `Ctrl+Shift+R` or `Ctrl+F5`

### Step 2: Test Google Sign-In

1. Go to `/register` or `/login`
2. Click "Register with Google" or "Login with Google"
3. Check browser console

**Expected:**
- ✅ No `[GSI_LOGGER]` errors
- ✅ Google sign-in popup appears
- ✅ Can complete sign-in

**If Still Getting Error:**
- Wait 5 more minutes
- Double-check exact URL match
- Verify no typos

---

## 🔍 Troubleshooting

### Issue 1: Still Getting Origin Error

**Check:**
1. Exact URL match (case-sensitive)
2. Protocol match (`http://` vs `https://`)
3. Port match (`:3000` vs `:3001`)
4. No trailing slash
5. Waited 5 minutes after saving

**Solution:**
- Remove and re-add the origin
- Clear browser cache
- Try incognito/private window

### Issue 2: Different Port

**If React runs on different port:**

**Check your terminal:**
```
Compiled successfully!

You can now view abu-pwa-app in the browser.

  Local:            http://localhost:3001  ← Check this port
  On Your Network:  http://192.168.1.1:3001
```

**Add the correct port:**
```
http://localhost:3001  ← Use actual port
```

### Issue 3: Production Domain Changed

**If Vercel URL changed:**
1. Check Vercel dashboard for current URL
2. Update Google Console with new URL
3. Remove old URL if no longer used

---

## 📊 Frontend Code Status

**No code changes needed!** The frontend is already correctly configured:

**File: `src/App.js`**
```javascript
export const GOOGLE_CLIENT_ID = '470253699627-a50centdev8a3ahhq0e01oiakatu3qh4.apps.googleusercontent.com';
```

**File: `public/index.html`**
```html
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

**File: `src/hooks/useGoogleAuth.js`**
- Correctly initializes Google Identity Services
- Uses the correct client ID

✅ **Everything is set up correctly on the frontend side!**

---

## 🎯 Complete Fix Checklist

### Google Cloud Console:
- [ ] Added `http://localhost:3000` to Authorized JavaScript origins
- [ ] Added `https://abu-endowment-mobile.vercel.app` to Authorized JavaScript origins
- [ ] No trailing slashes
- [ ] Exact URL match
- [ ] Saved changes
- [ ] Waited 5 minutes

### Frontend:
- [x] Client ID configured correctly
- [x] Google Identity Services script loaded
- [x] GoogleSignInButton component working
- [x] Token validation in place

### Testing:
- [ ] Cleared browser cache
- [ ] Hard refresh (Ctrl+Shift+R)
- [ ] Tested Google sign-in
- [ ] No `[GSI_LOGGER]` errors
- [ ] Google popup appears

---

## 🚀 After Origin Fix

Once the origin error is fixed:

1. **Google sign-in will work** ✅
2. **Token will be generated** ✅
3. **Frontend will send token to backend** ✅
4. **Backend needs to verify token** (see backend 401 fix)

---

## 📝 Summary

**Issue:** Google Cloud Console doesn't recognize your frontend origin

**Fix:** Add your frontend URLs to "Authorized JavaScript origins" in Google Cloud Console

**Frontend Status:** ✅ Already correctly configured (no code changes needed)

**Time to Fix:** 5-10 minutes (mostly waiting for Google to update)

---

## 🔗 Related Issues

1. **Origin Error** (this guide) → Google Cloud Console configuration
2. **401 Backend Error** → Backend `GOOGLE_CLIENT_ID` not loading from `.env`

Both need to be fixed for Google OAuth to work completely!

