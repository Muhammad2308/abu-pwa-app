# Migration Plan: Remove Device Fingerprint, Use Only Donor Sessions

## Overview
This migration removes all device_fingerprint-based authentication and uses **only** the `donor_sessions` table for authentication. This simplifies the system and eliminates the donor_id mismatch issue.

## Benefits
1. ✅ **Simplified Authentication**: Single source of truth (donor_sessions)
2. ✅ **No Donor ID Confusion**: Always use authenticated donor from session
3. ✅ **More Secure**: Users must explicitly login
4. ✅ **Cleaner Code**: Remove complex device recognition logic
5. ✅ **Better UX**: Clear login/register flow

## Migration Steps

### Phase 1: Frontend Changes ✅

#### 1.1 AuthContext.js
- ❌ Remove `isDeviceRecognized` state
- ❌ Remove `deviceSessionId` state
- ❌ Remove `checkDeviceRecognition()` function
- ❌ Remove `checkDeviceAndDonorSession()` function
- ✅ Keep only `checkSession()` - verify donor_sessions
- ✅ Simplify: If no session → user is not authenticated

#### 1.2 Donations.js
- ❌ Remove `device_fingerprint` from payment metadata
- ❌ Remove `getDeviceFingerprint()` import
- ✅ Always use `user.id` (from authenticated session) for `donor_id`
- ✅ If not authenticated → show login/register modal

#### 1.3 Home.js
- ❌ Remove `isDeviceRecognized` checks
- ❌ Remove `checkDeviceRecognition()` calls
- ✅ Use only `isAuthenticated` from AuthContext

#### 1.4 Other Components
- ❌ Remove all `isDeviceRecognized` references
- ❌ Remove `device_fingerprint` usage
- ✅ Use only `isAuthenticated` and `user`

### Phase 2: Backend Changes

#### 2.1 Payment Initialization
- ❌ Remove `device_fingerprint` parameter
- ❌ Remove device session lookup
- ✅ **REQUIRE** authentication (donor_sessions)
- ✅ Use `metadata.donor_id` (from authenticated session)
- ✅ If no `donor_id` → return 401 (require login)

#### 2.2 API Endpoints
- ❌ Remove `/api/check-device` endpoint (or make it optional)
- ✅ Keep only `/api/donor-sessions/*` endpoints
- ✅ All protected endpoints require valid donor_session

#### 2.3 Database
- ⚠️ Keep `device_sessions` table (for future use if needed)
- ✅ Donations always use `donor_id` from authenticated session

## Authentication Flow (After Migration)

### Login Flow
1. User enters email/password or uses Google OAuth
2. Backend validates credentials
3. Backend creates/updates `donor_sessions` record
4. Frontend stores `donor_session_id` in localStorage
5. Frontend sets `isAuthenticated = true` and `user = donor_data`

### Session Check (On App Load)
1. Frontend reads `donor_session_id` from localStorage
2. Frontend calls `/api/donor-sessions/me` with session_id
3. Backend validates session and returns donor data
4. If valid → user is authenticated
5. If invalid → clear localStorage, user must login

### Payment Flow
1. User must be authenticated (have valid donor_session)
2. Frontend sends `metadata.donor_id = user.id`
3. Backend uses `metadata.donor_id` for donation
4. No device_fingerprint needed

### Unauthenticated Users
- Can view home page (read-only)
- Must login/register to:
  - Make donations
  - View donation history
  - Update profile
  - Access protected features

## Breaking Changes

### Frontend
- ❌ `isDeviceRecognized` no longer exists
- ❌ `checkDeviceRecognition()` removed
- ✅ Use `isAuthenticated` instead

### Backend
- ❌ `device_fingerprint` no longer accepted in payment initialization
- ❌ Device session lookup removed
- ✅ All payments require authenticated donor_session

## Rollback Plan
If issues arise, we can temporarily:
1. Keep device_fingerprint as optional fallback
2. Use device session if no authenticated session
3. Gradually migrate users to login-based flow

## Testing Checklist
- [ ] User can login with email/password
- [ ] User can login with Google OAuth
- [ ] Session persists on page refresh
- [ ] Session expires after logout
- [ ] Payment uses correct donor_id
- [ ] Unauthenticated users see login prompt
- [ ] No device_fingerprint errors in console
- [ ] All protected routes require authentication

