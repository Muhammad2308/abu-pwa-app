# Backend: Profile Update Endpoints

## Overview
The frontend needs API endpoints to update both `donors` and `donor_sessions` tables when a user updates their profile.

---

## Required Endpoints

### 1. Update Donor Profile Image
**Endpoint**: `POST /api/donors/{id}/profile-image`

**Request**:
- Method: POST
- Content-Type: multipart/form-data
- Body: `profile_image` (file)

**Response** (Success - 200):
```json
{
  "success": true,
  "message": "Profile image updated successfully",
  "data": {
    "donor": {
      "id": 18,
      "name": "John",
      "surname": "Doe",
      "profile_image": "path/to/image.jpg",
      ...
    }
  }
}
```

**Implementation**:
- Accept multipart/form-data
- Validate file is an image
- Store in `storage/app/public` or similar
- Update `donors.profile_image` column
- Return updated donor object

---

### 2. Update Donor Session Username
**Endpoint**: `PUT /api/donor-sessions/{session_id}/username` or `POST /api/donor-sessions/update-username`

**Request**:
```json
{
  "username": "new_username"
}
```

**Response** (Success - 200):
```json
{
  "success": true,
  "message": "Username updated successfully",
  "data": {
    "id": 5,
    "username": "new_username",
    "donor_id": 18
  }
}
```

**Validation**:
- Username must be unique
- Username min 3 characters
- Check if username already exists (except current user)

---

### 3. Update Donor Session Password
**Endpoint**: `PUT /api/donor-sessions/{session_id}/password` or `POST /api/donor-sessions/update-password`

**Request**:
```json
{
  "current_password": "old_password",
  "new_password": "new_password",
  "new_password_confirmation": "new_password"
}
```

**Response** (Success - 200):
```json
{
  "success": true,
  "message": "Password updated successfully"
}
```

**Validation**:
- Verify current password matches
- New password min 6 characters
- New password confirmation must match
- Hash new password before saving

---

## Alternative: Combined Update Endpoint

Instead of separate endpoints, you could create a single endpoint:

**Endpoint**: `PUT /api/donor-sessions/{session_id}`

**Request**:
```json
{
  "username": "new_username",  // Optional
  "current_password": "old_password",  // Required if updating password
  "new_password": "new_password",  // Optional
  "new_password_confirmation": "new_password"  // Required if new_password provided
}
```

**Response** (Success - 200):
```json
{
  "success": true,
  "message": "Session updated successfully",
  "data": {
    "id": 5,
    "username": "new_username",
    "donor_id": 18
  }
}
```

---

## Frontend Integration

The frontend `UserProfileModal` component will:
1. Update donor fields (name, surname, other_name, email) via `PUT /api/donors/{id}`
2. Upload profile image via `POST /api/donors/{id}/profile-image`
3. Update username via `PUT /api/donor-sessions/{session_id}/username` (if changed)
4. Update password via `PUT /api/donor-sessions/{session_id}/password` (if provided)

---

## Security Considerations

1. **Authentication**: All endpoints must verify the user is authenticated
2. **Authorization**: Verify the session_id belongs to the authenticated user
3. **Password Update**: Always verify current password before allowing change
4. **Username Update**: Check uniqueness, but allow same username for same user
5. **Rate Limiting**: Consider rate limiting for password updates

---

## Example Laravel Implementation

### Profile Image Upload
```php
public function uploadProfileImage(Request $request, $id)
{
    $request->validate([
        'profile_image' => 'required|image|mimes:jpeg,png,jpg,gif|max:5120', // 5MB max
    ]);

    $donor = Donor::findOrFail($id);
    
    // Delete old image if exists
    if ($donor->profile_image) {
        Storage::disk('public')->delete($donor->profile_image);
    }
    
    // Store new image
    $path = $request->file('profile_image')->store('profile_images', 'public');
    $donor->profile_image = $path;
    $donor->save();
    
    return response()->json([
        'success' => true,
        'message' => 'Profile image updated successfully',
        'data' => ['donor' => $donor]
    ]);
}
```

### Update Username
```php
public function updateUsername(Request $request, $sessionId)
{
    $request->validate([
        'username' => 'required|string|min:3|unique:donor_sessions,username,' . $sessionId,
    ]);

    $session = DonorSession::findOrFail($sessionId);
    $session->username = $request->username;
    $session->save();
    
    return response()->json([
        'success' => true,
        'message' => 'Username updated successfully',
        'data' => $session
    ]);
}
```

### Update Password
```php
public function updatePassword(Request $request, $sessionId)
{
    $request->validate([
        'current_password' => 'required',
        'new_password' => 'required|string|min:6|confirmed',
    ]);

    $session = DonorSession::findOrFail($sessionId);
    
    // Verify current password
    if (!Hash::check($request->current_password, $session->password)) {
        return response()->json([
            'success' => false,
            'message' => 'Current password is incorrect'
        ], 401);
    }
    
    // Update password
    $session->password = Hash::make($request->new_password);
    $session->save();
    
    return response()->json([
        'success' => true,
        'message' => 'Password updated successfully'
    ]);
}
```

---

## Routes

```php
// In routes/api.php
Route::middleware('auth:sanctum')->group(function () {
    // Profile image upload
    Route::post('/api/donors/{id}/profile-image', [DonorController::class, 'uploadProfileImage']);
    
    // Donor session updates
    Route::put('/api/donor-sessions/{session_id}/username', [DonorSessionController::class, 'updateUsername']);
    Route::put('/api/donor-sessions/{session_id}/password', [DonorSessionController::class, 'updatePassword']);
});
```

---

## Notes

- The frontend will call these endpoints when user updates their profile
- All endpoints require authentication
- Profile image should be stored in `storage/app/public/profile_images/`
- Password updates should always verify current password
- Username updates should check uniqueness

