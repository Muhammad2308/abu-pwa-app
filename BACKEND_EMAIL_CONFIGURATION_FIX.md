# Backend Email Configuration Fix for Password Reset

## Issue
The password reset email is not being sent when users request a password reset via the `/api/donor-sessions/forgot-password` endpoint.

## Current Frontend Implementation
The frontend is correctly calling:
```javascript
POST /api/donor-sessions/forgot-password
Body: { email: "user@example.com" }
```

## Required Backend Investigation & Fix

### 1. Check Email Configuration
Verify your `.env` file has the following email settings configured:

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com  # or your SMTP host
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password  # For Gmail, use App Password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@yourdomain.com
MAIL_FROM_NAME="${APP_NAME}"
```

**For Gmail:**
- You MUST use an App Password, not your regular password
- Generate one at: https://myaccount.google.com/apppasswords
- Enable 2-Step Verification first if not already enabled

### 2. Verify the Password Reset Controller
Check your `DonorSessionController.php` (or equivalent) has the `forgotPassword` method:

```php
public function forgotPassword(Request $request)
{
    $request->validate([
        'email' => 'required|email',
    ]);

    // Find donor by email or username
    $donor = Donor::where('email', $request->email)
                  ->orWhere('username', $request->email)
                  ->first();

    if (!$donor) {
        // Security: Don't reveal if email exists
        return response()->json([
            'success' => true,
            'message' => 'If an account exists, a password reset link has been sent.'
        ]);
    }

    // Generate reset token
    $token = Str::random(64);
    
    // Store token in password_resets table
    DB::table('password_resets')->updateOrInsert(
        ['email' => $donor->email],
        [
            'email' => $donor->email,
            'token' => Hash::make($token),
            'created_at' => now()
        ]
    );

    // Send email with reset link
    $resetUrl = env('FRONTEND_URL', 'http://localhost:3000') . '/reset-password?token=' . $token;
    
    Mail::to($donor->email)->send(new PasswordResetMail($resetUrl, $donor));

    return response()->json([
        'success' => true,
        'message' => 'If an account exists, a password reset link has been sent.'
    ]);
}
```

### 3. Create Password Reset Email Template
Create `app/Mail/PasswordResetMail.php`:

```php
<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class PasswordResetMail extends Mailable
{
    use Queueable, SerializesModels;

    public $resetUrl;
    public $donor;

    public function __construct($resetUrl, $donor)
    {
        $this->resetUrl = $resetUrl;
        $this->donor = $donor;
    }

    public function build()
    {
        return $this->subject('Password Reset Request')
                    ->view('emails.password-reset');
    }
}
```

### 4. Create Email View
Create `resources/views/emails/password-reset.blade.php`:

```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #16a34a; color: white; text-decoration: none; border-radius: 5px; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <h2>Password Reset Request</h2>
        <p>Hello {{ $donor->first_name ?? 'User' }},</p>
        <p>You requested to reset your password. Click the button below to reset it:</p>
        <p>
            <a href="{{ $resetUrl }}" class="button">Reset Password</a>
        </p>
        <p>Or copy and paste this link into your browser:</p>
        <p>{{ $resetUrl }}</p>
        <p>This link will expire in 60 minutes.</p>
        <p>If you didn't request a password reset, please ignore this email.</p>
        <div class="footer">
            <p>© {{ date('Y') }} {{ config('app.name') }}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
```

### 5. Add Frontend URL to .env
Add this to your backend `.env`:

```env
FRONTEND_URL=http://localhost:3000
```

### 6. Test Email Configuration
Run this command to test if emails are working:

```bash
php artisan tinker
```

Then in tinker:
```php
Mail::raw('Test email', function($message) {
    $message->to('your-email@example.com')
            ->subject('Test Email');
});
```

If this fails, check:
- Your SMTP credentials are correct
- Your firewall allows outbound connections on port 587
- For Gmail, you're using an App Password
- The `mail` driver is set correctly in `config/mail.php`

### 7. Check Logs
If emails still don't send, check Laravel logs:
```bash
tail -f storage/logs/laravel.log
```

### 8. Alternative: Use Mailtrap for Testing
For development, consider using Mailtrap:

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=your-mailtrap-username
MAIL_PASSWORD=your-mailtrap-password
MAIL_ENCRYPTION=tls
```

Sign up at https://mailtrap.io to get credentials.

## Verification Steps
1. Make a POST request to `/api/donor-sessions/forgot-password` with a valid email
2. Check the response is `{ "success": true, "message": "..." }`
3. Check your email inbox (or spam folder)
4. Verify the reset link works when clicked
5. Check Laravel logs for any email sending errors

## Common Issues
- **Gmail blocking**: Use App Password instead of regular password
- **Port blocked**: Try port 465 with SSL instead of 587 with TLS
- **Queue not running**: If using queues, run `php artisan queue:work`
- **Missing password_resets table**: Run migrations
