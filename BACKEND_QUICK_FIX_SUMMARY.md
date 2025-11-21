# Backend Google OAuth - Quick Fix Summary

## 🚨 Problem
- Error: `Class "Google_Client" not found`
- Google user data not being stored properly

## ✅ Solution Overview

### 1. Replace `GoogleAuthService.php`
- Use JWT verification (no external library needed)
- Extract: `google_id`, `email`, `name`, `surname`, `gender`, `picture`

### 2. Update `DonorSessionController.php`
- **googleRegister()**: Create donor + donor_sessions with all Google data
- **googleLogin()**: Authenticate using `google_id` in donor_sessions

### 3. Data Mapping

**Donors Table:**
- `name` ← `given_name` from Google
- `surname` ← `family_name` from Google  
- `email` ← `email` from Google
- `gender` ← `gender` from Google
- `profile_image` ← `picture` from Google

**Donor_Sessions Table:**
- `username` ← `email` from Google
- `password` ← `NULL` (no password for Google auth)
- `google_id` ← `sub` from Google token
- `google_email` ← `email` from Google
- `google_name` ← `name` (full name) from Google
- `google_picture` ← `picture` from Google
- `auth_provider` ← `'google'`

### 4. Database Migration (if needed)
```bash
php artisan make:migration add_google_fields_to_donor_sessions_table
php artisan make:migration add_gender_to_donors_table
```

**Add to donor_sessions:**
- `auth_provider` (string, nullable)
- `google_id` (string, nullable, unique)
- `google_email` (string, nullable)
- `google_name` (string, nullable)
- `google_picture` (text, nullable)

**Add to donors:**
- `gender` (string, nullable)

### 5. Routes (verify they exist)
```php
POST /api/donor-sessions/google-login
POST /api/donor-sessions/google-register
```

## 📋 Full Implementation
See `BACKEND_GOOGLE_OAUTH_FIX_PROMPT.md` for complete code.

## 🔑 Key Points
1. **No external library** - Uses PHP JWT verification
2. **Login uses `google_id`** - Not email/password
3. **All Google data stored** - Name, surname, gender, picture, etc.
4. **Email = Username** - In donor_sessions table

