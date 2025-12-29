# Registration Testing Guide

## Overview
This document explains how to test the donor registration system and troubleshoot issues.

## Quick Test Access
Navigate to: **http://localhost:3000/test-registration**

This page provides automated tests for:
- Backend API connectivity
- Donor creation endpoint
- Session registration
- Donor-to-session linking
- Database accessibility

## What Was Fixed

### 1. Google Login Redirect Issue ✅
**Problem:** After successful Google login, users were not being redirected to the home page.

**Solution:**
- Added `checkSession()` call after Google login to ensure user state is fully loaded
- Increased redirect delay from 300ms to 500ms for better state synchronization
- Files modified: `src/pages/Login.js`, `src/pages/Register.js`

### 2. Google Registration Redirect Issue ✅
**Problem:** After successful Google registration, users were redirected to login page instead of home.

**Solution:**
- Added `checkSession()` call after successful Google registration
- Fixed auto-login flow when account already exists (409 error)
- Changed from `window.location.href` to React Router `navigate()` for better state preservation
- Files modified: `src/pages/Register.js`

### 3. Donor Registration Not Creating Records ⚠️
**Problem:** User registration is not creating donor records in production database.

**Status:** Backend issue - requires backend team attention

**Documentation Created:**
- `BACKEND_FIX_REGISTRATION.md` - Comprehensive backend prompt with:
  - Problem analysis
  - Expected vs actual behavior
  - Required backend fixes
  - Database schema validation
  - Testing checklist

## How to Use the Registration Test

1. **Start your development server:**
   ```bash
   npm start
   ```

2. **Navigate to the test page:**
   ```
   http://localhost:3000/test-registration
   ```

3. **Click "Run Tests"** to execute the automated test suite

4. **Review Results:**
   - ✅ Green = Success
   - ❌ Red = Error
   - ⚠️ Yellow = Warning

5. **Expand Details:**
   - Click "View Details" on any test to see the full API response
   - Check timestamps to track test execution order

## Test Scenarios Covered

### Test 1: API Connectivity
Verifies that the frontend can connect to the backend API.

### Test 2: Donor Creation
Tests the `POST /api/donors` endpoint with sample donor data.

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "email": "test@example.com",
    ...
  }
}
```

### Test 3: Session Registration
Tests the `POST /api/donor-sessions/register` endpoint.

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "session_id": 456,
    "username": "test@example.com"
  }
}
```

### Test 4: Donor-Session Linking
Tests linking a donor to a session via `PUT /api/donor-sessions/{id}`.

### Test 5: Donors Table Check
Verifies the donors table is accessible via `GET /api/donors`.

## Common Issues & Solutions

### Issue: "Failed to connect to backend"
**Solution:**
- Ensure backend server is running
- Check `REACT_APP_API_BASE_URL` in `.env`
- Verify CORS settings on backend

### Issue: "Donor creation failed"
**Possible Causes:**
1. Missing required fields
2. Database constraints
3. Validation errors
4. Permission issues

**Solution:** Check the detailed error message in the test results

### Issue: "Session-Donor linking failed"
**Possible Causes:**
1. Session ID not found
2. Donor ID not found
3. Database foreign key constraints

**Solution:** Verify both session and donor were created successfully first

## Backend Checklist

Before deploying to production, ensure:

- [ ] `POST /api/donors` endpoint is working
- [ ] `POST /api/donor-sessions/register` creates sessions
- [ ] `POST /api/donor-sessions/google-register` creates BOTH session AND donor
- [ ] `PUT /api/donor-sessions/{id}` can link donors to sessions
- [ ] All required database migrations are run
- [ ] No NOT NULL constraints on optional donor fields
- [ ] Database user has INSERT permissions

## Files Modified

1. `src/pages/Login.js` - Fixed Google login redirect
2. `src/pages/Register.js` - Fixed Google registration redirect and auto-login
3. `src/components/RegistrationTest.js` - New test component
4. `src/App.js` - Added test route
5. `BACKEND_FIX_REGISTRATION.md` - Backend documentation

## Next Steps

1. **Run the test suite** to identify specific issues
2. **Share test results** with backend team
3. **Reference BACKEND_FIX_REGISTRATION.md** for backend fixes
4. **Re-test after backend updates**
5. **Remove test route** before production deployment

## Production Deployment Notes

**Important:** Remove or protect the `/test-registration` route before deploying to production:

```javascript
// In App.js, comment out or remove:
<Route path="/test-registration" element={<RegistrationTest />} />
```

Or add authentication check:
```javascript
<Route
  path="/test-registration"
  element={
    <ProtectedRoute requireAdmin={true}>
      <RegistrationTest />
    </ProtectedRoute>
  }
/>
```
