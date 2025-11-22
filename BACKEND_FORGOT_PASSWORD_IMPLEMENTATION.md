# Backend Forgot Password Implementation Guide

## 📋 Overview

This document provides the backend implementation guide for the forgot password functionality with email verification using a 6-digit code.

## 🔄 Flow

1. User requests password reset → Backend sends 6-digit code to email
2. Backend creates a 20-minute session for code verification
3. User enters code → Backend verifies code
4. User sets new password → Backend resets password
5. User redirected to login/home

---

## 🛠️ Backend Implementation

### 1. Database Migration - Password Reset Tokens Table

Create a migration for storing password reset codes:

```bash
php artisan make:migration create_password_reset_tokens_table
```

**Migration File:**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->id();
            $table->string('email')->index();
            $table->string('code', 6); // 6-digit code
            $table->timestamp('expires_at'); // 20 minutes from creation
            $table->boolean('used')->default(false); // Track if code has been used
            $table->timestamps();
            
            $table->index(['email', 'code', 'used']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('password_reset_tokens');
    }
};
```

---

### 2. Model - PasswordResetToken

**File: `app/Models/PasswordResetToken.php`**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class PasswordResetToken extends Model
{
    protected $fillable = [
        'email',
        'code',
        'expires_at',
        'used',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'used' => 'boolean',
    ];

    /**
     * Check if token is valid (not expired and not used)
     */
    public function isValid(): bool
    {
        return !$this->used && $this->expires_at->isFuture();
    }

    /**
     * Mark token as used
     */
    public function markAsUsed(): void
    {
        $this->update(['used' => true]);
    }

    /**
     * Generate a random 6-digit code
     */
    public static function generateCode(): string
    {
        return str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    }

    /**
     * Find valid token by email and code
     */
    public static function findValidToken(string $email, string $code): ?self
    {
        return self::where('email', $email)
            ->where('code', $code)
            ->where('used', false)
            ->where('expires_at', '>', now())
            ->first();
    }
}
```

---

### 3. Controller Methods - DonorSessionController

**File: `app/Http/Controllers/DonorSessionController.php`**

Add these three methods:

#### Method 1: Request Password Reset

```php
/**
 * Request password reset - Send 6-digit code to email
 * 
 * POST /api/donor-sessions/forgot-password
 * Body: { "email": "user@example.com" }
 */
public function forgotPassword(Request $request)
{
    $validated = $request->validate([
        'email' => 'required|email',
    ]);

    $email = $validated['email'];

    // Check if donor exists with this email
    $donor = Donor::where('email', $email)->first();
    if (!$donor) {
        // Don't reveal if email exists for security
        return response()->json([
            'success' => true,
            'message' => 'If the email exists, a reset code has been sent.',
        ], 200);
    }

    // Check if donor has a session (can reset password)
    $donorSession = DonorSession::where('username', $email)
        ->where('auth_provider', 'email') // Only allow reset for email/password accounts
        ->first();

    if (!$donorSession) {
        // Don't reveal if account exists
        return response()->json([
            'success' => true,
            'message' => 'If the email exists, a reset code has been sent.',
        ], 200);
    }

    // Invalidate any existing tokens for this email
    PasswordResetToken::where('email', $email)
        ->where('used', false)
        ->update(['used' => true]);

    // Generate 6-digit code
    $code = PasswordResetToken::generateCode();

    // Create new token (expires in 20 minutes)
    $token = PasswordResetToken::create([
        'email' => $email,
        'code' => $code,
        'expires_at' => now()->addMinutes(20),
        'used' => false,
    ]);

    // Send email with code
    try {
        Mail::to($email)->send(new PasswordResetCodeMail($code, $donor->name ?? 'User'));
        
        return response()->json([
            'success' => true,
            'message' => 'Password reset code sent to your email. Code expires in 20 minutes.',
        ], 200);
    } catch (\Exception $e) {
        \Log::error('Password reset email error: ' . $e->getMessage());
        
        // Still return success to prevent email enumeration
        return response()->json([
            'success' => true,
            'message' => 'If the email exists, a reset code has been sent.',
        ], 200);
    }
}
```

#### Method 2: Verify Reset Code

```php
/**
 * Verify password reset code
 * 
 * POST /api/donor-sessions/verify-reset-code
 * Body: { "email": "user@example.com", "code": "123456" }
 */
public function verifyResetCode(Request $request)
{
    $validated = $request->validate([
        'email' => 'required|email',
        'code' => 'required|string|size:6',
    ]);

    $email = $validated['email'];
    $code = $validated['code'];

    // Find valid token
    $token = PasswordResetToken::findValidToken($email, $code);

    if (!$token) {
        return response()->json([
            'success' => false,
            'message' => 'Invalid or expired reset code. Please request a new code.',
        ], 400);
    }

    return response()->json([
        'success' => true,
        'message' => 'Code verified successfully. You can now set your new password.',
    ], 200);
}
```

#### Method 3: Reset Password

```php
/**
 * Reset password using verified code
 * 
 * POST /api/donor-sessions/reset-password
 * Body: { "email": "user@example.com", "code": "123456", "password": "newpassword" }
 */
public function resetPassword(Request $request)
{
    $validated = $request->validate([
        'email' => 'required|email',
        'code' => 'required|string|size:6',
        'password' => 'required|string|min:6',
    ]);

    $email = $validated['email'];
    $code = $validated['code'];
    $newPassword = $validated['password'];

    // Find valid token
    $token = PasswordResetToken::findValidToken($email, $code);

    if (!$token) {
        return response()->json([
            'success' => false,
            'message' => 'Invalid or expired reset code. Please request a new code.',
        ], 400);
    }

    // Find donor session
    $donorSession = DonorSession::where('username', $email)
        ->where('auth_provider', 'email')
        ->first();

    if (!$donorSession) {
        return response()->json([
            'success' => false,
            'message' => 'Account not found.',
        ], 404);
    }

    // Update password
    $donorSession->update([
        'password' => Hash::make($newPassword),
    ]);

    // Mark token as used
    $token->markAsUsed();

    // Invalidate all other tokens for this email
    PasswordResetToken::where('email', $email)
        ->where('used', false)
        ->where('id', '!=', $token->id)
        ->update(['used' => true]);

    return response()->json([
        'success' => true,
        'message' => 'Password reset successful. Please login with your new password.',
    ], 200);
}
```

---

### 4. Mail Class - PasswordResetCodeMail

**File: `app/Mail/PasswordResetCodeMail.php`**

```bash
php artisan make:mail PasswordResetCodeMail
```

**Mail Class:**

```php
<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class PasswordResetCodeMail extends Mailable
{
    use Queueable, SerializesModels;

    public $code;
    public $name;

    public function __construct(string $code, string $name = 'User')
    {
        $this->code = $code;
        $this->name = $name;
    }

    public function build()
    {
        return $this->subject('ABU Endowment - Password Reset Code')
            ->view('emails.password-reset-code')
            ->with([
                'code' => $this->code,
                'name' => $this->name,
            ]);
    }
}
```

---

### 5. Email Template

**File: `resources/views/emails/password-reset-code.blade.php`**

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Password Reset Code</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb;">ABU Endowment</h1>
            <h2 style="color: #2563eb;">& Crowd Funding</h2>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 10px;">
            <h2 style="color: #2563eb;">Password Reset Request</h2>
            
            <p>Hello {{ $name }},</p>
            
            <p>You have requested to reset your password. Use the code below to verify your identity:</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <div style="display: inline-block; background: #2563eb; color: white; padding: 15px 30px; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 5px;">
                    {{ $code }}
                </div>
            </div>
            
            <p><strong>This code will expire in 20 minutes.</strong></p>
            
            <p>If you did not request this password reset, please ignore this email.</p>
            
            <p style="margin-top: 30px;">
                Best regards,<br>
                <strong>ABU Endowment Team</strong>
            </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
            <p>This is an automated message. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
```

---

### 6. Routes

**File: `routes/api.php`**

Add these routes:

```php
// Password Reset Routes
Route::post('/donor-sessions/forgot-password', [DonorSessionController::class, 'forgotPassword']);
Route::post('/donor-sessions/verify-reset-code', [DonorSessionController::class, 'verifyResetCode']);
Route::post('/donor-sessions/reset-password', [DonorSessionController::class, 'resetPassword']);
```

---

## ✅ Security Considerations

1. **Email Enumeration Prevention**: Always return success message even if email doesn't exist
2. **Code Expiration**: Codes expire after 20 minutes
3. **One-Time Use**: Codes are marked as used after successful password reset
4. **Rate Limiting**: Consider adding rate limiting to prevent abuse
5. **Email Validation**: Only allow password reset for email/password accounts (not Google accounts)

---

## 🧪 Testing

### Test Cases:

1. **Request Reset Code**
   - Valid email → Should send code
   - Invalid email → Should return success (security)
   - Google account email → Should return success (security)

2. **Verify Code**
   - Valid code → Should verify
   - Expired code → Should reject
   - Invalid code → Should reject
   - Used code → Should reject

3. **Reset Password**
   - Valid code + new password → Should reset
   - Expired code → Should reject
   - Invalid code → Should reject

---

## 📝 Notes

- The frontend expects these exact endpoint paths
- The frontend sends `email`, `code`, and `password` in the request body
- The backend should return `{ success: true/false, message: "..." }` format
- Email sending requires proper mail configuration in `.env`

---

## 🔧 Environment Variables

Ensure these are set in `.env`:

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=your_username
MAIL_PASSWORD=your_password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@abu-endowment.com
MAIL_FROM_NAME="${APP_NAME}"
```

---

## ✅ Implementation Checklist

- [ ] Create `password_reset_tokens` table migration
- [ ] Create `PasswordResetToken` model
- [ ] Add `forgotPassword()` method to `DonorSessionController`
- [ ] Add `verifyResetCode()` method to `DonorSessionController`
- [ ] Add `resetPassword()` method to `DonorSessionController`
- [ ] Create `PasswordResetCodeMail` mailable
- [ ] Create email template
- [ ] Add routes to `api.php`
- [ ] Configure mail settings in `.env`
- [ ] Test all three endpoints
- [ ] Test email delivery

---

**Ready for backend implementation!** 🚀

