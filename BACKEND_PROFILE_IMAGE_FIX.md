# Backend: Fix Profile Image Upload Endpoint

## Issue
The profile image upload endpoint `POST /api/donors/{id}/profile-image` is not updating the `profile_image` column in the `donors` table.

## Current Frontend Call
The frontend is making a POST request to:
```
POST /api/donors/{id}/profile-image
Content-Type: multipart/form-data
Body: profile_image (file)
```

## Required Backend Implementation

### Endpoint: `POST /api/donors/{id}/profile-image`

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body parameter: `profile_image` (file/image)
- URL parameter: `{id}` (donor ID)

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Profile image updated successfully",
  "data": {
    "donor": {
      "id": 18,
      "name": "John",
      "surname": "Doe",
      "other_name": "Smith",
      "email": "john@example.com",
      "phone": "+2348012345678",
      "address": "123 Main St",
      "state": "Kaduna",
      "city": "Kaduna",
      "profile_image": "profile_images/abc123.jpg",
      "created_at": "2024-01-01T00:00:00.000000Z",
      "updated_at": "2024-01-01T00:00:00.000000Z"
    }
  }
}
```

**Response (Error - 422):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "profile_image": ["The profile image field is required."]
  }
}
```

## Laravel Implementation Example

```php
// In DonorController.php

public function uploadProfileImage(Request $request, $id)
{
    // Validate the request
    $request->validate([
        'profile_image' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:5120', // 5MB max
    ]);

    try {
        // Find the donor
        $donor = Donor::findOrFail($id);
        
        // Delete old image if exists
        if ($donor->profile_image) {
            $oldPath = storage_path('app/public/' . $donor->profile_image);
            if (file_exists($oldPath)) {
                unlink($oldPath);
            }
            // Or using Storage facade:
            // Storage::disk('public')->delete($donor->profile_image);
        }
        
        // Store new image
        $image = $request->file('profile_image');
        $imageName = time() . '_' . uniqid() . '.' . $image->getClientOriginalExtension();
        $imagePath = $image->storeAs('profile_images', $imageName, 'public');
        
        // Update donor's profile_image column
        $donor->profile_image = $imagePath;
        $donor->save(); // Make sure to save!
        
        // Refresh the model to get latest data
        $donor->refresh();
        
        return response()->json([
            'success' => true,
            'message' => 'Profile image updated successfully',
            'data' => [
                'donor' => $donor
            ]
        ], 200);
        
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Failed to upload profile image: ' . $e->getMessage()
        ], 500);
    }
}
```

## Important Points

1. **CRITICAL**: Make sure you are actually calling `$donor->save()` after setting `$donor->profile_image = $imagePath;`
2. **CRITICAL**: The `profile_image` column must exist in the `donors` table migration
3. **Storage Path**: Store images in `storage/app/public/profile_images/` and make sure the storage link is created (`php artisan storage:link`)
4. **Return Updated Donor**: Return the updated donor object so the frontend can refresh the user data
5. **File Validation**: Validate that the uploaded file is actually an image
6. **File Size**: Limit file size to 5MB (5120 KB)
7. **Delete Old Image**: Delete the old profile image before saving the new one to save storage space

## Route Definition

Make sure the route is defined in `routes/api.php`:

```php
Route::middleware(['auth:sanctum'])->group(function () {
    Route::post('/api/donors/{id}/profile-image', [DonorController::class, 'uploadProfileImage']);
});
```

Or if using a different authentication method:

```php
Route::post('/api/donors/{id}/profile-image', [DonorController::class, 'uploadProfileImage'])
    ->middleware('auth:sanctum'); // or your authentication middleware
```

## Database Migration Check

Make sure the `donors` table has a `profile_image` column:

```php
Schema::table('donors', function (Blueprint $table) {
    $table->string('profile_image')->nullable()->after('city');
});
```

## Testing

After implementing, test with:
1. Upload a valid image file (JPEG, PNG, JPG, GIF, WEBP)
2. Check the database - the `profile_image` column should be updated
3. Check the response - it should return the updated donor object with the `profile_image` path
4. Verify the image file is stored in `storage/app/public/profile_images/`

## Common Issues

1. **Not saving to database**: Make sure `$donor->save()` is called
2. **Storage link not created**: Run `php artisan storage:link`
3. **Permission issues**: Make sure `storage/app/public/profile_images/` directory is writable
4. **Column doesn't exist**: Run migration to add `profile_image` column
5. **Wrong file path**: Make sure the path stored in database matches where the file is actually stored

