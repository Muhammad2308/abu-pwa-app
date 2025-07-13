# Device-Based Session Management System

## Overview

This system implements a passwordless authentication and session management solution for the ABU PWA donor registration system. Users can register and login using their phone number or email address, with device fingerprinting to create persistent sessions.

## Key Features

### 1. Passwordless Authentication
- No password required for registration or login
- Uses SMS and email verification codes
- Device fingerprinting for session persistence

### 2. Device-Based Session Management
- Creates unique device fingerprints using browser characteristics
- Stores session tokens locally with device information
- Automatic session validation on app startup

### 3. Alumni Verification Flow
- Search alumni records by registration number, phone, or email
- Pre-populate forms with existing alumni data
- Allow users to update their information before registration

### 4. Non-Alumni Registration
- Simple form for non-alumni donors
- Same verification process as alumni

## System Architecture

### Frontend Components

#### 1. Device Fingerprinting (`src/utils/deviceFingerprint.js`)
```javascript
// Generates unique device fingerprint
export const generateDeviceFingerprint = () => {
  // Collects browser characteristics
  // Returns base64 encoded fingerprint
};

// Gets device information for session management
export const getDeviceInfo = () => {
  // Returns device info object
};
```

#### 2. Verification Service (`src/services/verificationService.js`)
```javascript
export const verificationAPI = {
  sendSMSVerification: (phone) => api.post('/api/verification/send-sms', { phone }),
  sendEmailVerification: (email) => api.post('/api/verification/send-email', { email }),
  verifySMSCode: (phone, code) => api.post('/api/verification/verify-sms', { phone, code }),
  verifyEmailCode: (email, code) => api.post('/api/verification/verify-email', { email, code }),
  createDeviceSession: (sessionData) => api.post('/api/sessions/create', sessionData),
  checkDeviceSession: (deviceInfo) => api.post('/api/sessions/check', deviceInfo),
  loginWithDevice: (credentials) => api.post('/api/sessions/login', credentials),
};
```

#### 3. Updated AuthContext (`src/contexts/AuthContext.js`)
- Manages device-based authentication state
- Handles verification flow
- Stores session tokens in localStorage

#### 4. Verification Modal (`src/components/VerificationModal.js`)
- SMS and email verification interface
- Code input with validation
- Resend functionality with countdown

#### 5. Updated Donations Page (`src/pagess.js`)
- Alumni verification flow
- Pre-populated forms with alumni data
- Integration with verification system

#### 6. Updated Login Page (`src/pages/Login.js`)
- Phone/email based login
- Device-based authentication
- No password required

## User Flow

### Alumni Registration Flow

1. **Donor Type Selection**
   - User selects "Alumni" option
   - System shows verification interface

2. **Alumni Search**
   - User enters registration number, phone, or email
   - System searches alumni database
   - If found: Shows pre-populated form
   - If not found: Shows registration form

3. **Information Update**
   - User reviews and updates their information
   - Form pre-populated with alumni data
   - User can modify any field

4. **Verification Process**
   - System sends SMS verification code
   - User enters 6-digit code
   - Option to switch to email verification

5. **Session Creation**
   - After successful verification
   - System creates device session
   - User is automatically logged in

### Non-Alumni Registration Flow

1. **Donor Type Selection**
   - User selects "Non-Alumni" option
   - System shows registration form

2. **Information Collection**
   - User fills out basic information
   - Email, phone, country, state, city

3. **Verification Process**
   - Same SMS/email verification as alumni
   - Creates device session after verification

### Login Flow

1. **Login Method Selection**
   - User chooses phone or email login
   - No password required

2. **Device Recognition**
   - System checks if device is recognized
   - If recognized: Automatic login
   - If not recognized: Requires verification

3. **Verification (if needed)**
   - Send verification code
   - User enters code
   - Create new device session

## Backend API Requirements

### Verification Endpoints

```php
// Send SMS verification
POST /api/verification/send-sms
{
  "phone": "string"
}

// Send email verification
POST /api/verification/send-email
{
  "email": "string"
}

// Verify SMS code
POST /api/verification/verify-sms
{
  "phone": "string",
  "code": "string"
}

// Verify email code
POST /api/verification/verify-email
{
  "email": "string",
  "code": "string"
}
```

### Session Management Endpoints

```php
// Create device session
POST /api/sessions/create
{
  "donorData": "object",
  "deviceInfo": "object",
  "verificationData": "object"
}

// Check device session
POST /api/sessions/check
{
  "deviceInfo": "object"
}

// Login with device
POST /api/sessions/login
{
  "phone": "string" | "email": "string",
  "deviceInfo": "object"
}

// Logout device session
POST /api/sessions/logout
```

### Alumni Search Endpoints

```php
// Search by registration number
GET /api/donors/search/{regNumber}

// Search by phone
GET /api/donors/search/phone/{phone}

// Search by email
GET /api/donors/search/email/{email}
```

## Security Considerations

### Device Fingerprinting
- Uses multiple browser characteristics
- Canvas fingerprinting
- WebGL fingerprinting
- Font detection
- Plugin list
- Screen resolution and color depth

### Session Security
- Device-specific session tokens
- Automatic session validation
- Secure token storage in localStorage
- CSRF protection with Sanctum

### Verification Security
- 6-digit numeric codes
- Rate limiting on verification attempts
- Time-limited verification codes
- Secure SMS/email delivery

## Implementation Notes

### Frontend Dependencies
- `react-hook-form` for form management
- `react-hot-toast` for notifications
- `react-icons` for UI icons
- `axios` for API calls

### Browser Compatibility
- Requires modern browser with canvas support
- WebGL support for enhanced fingerprinting
- LocalStorage for session storage

### Error Handling
- Graceful fallback for unsupported features
- Clear error messages for users
- Automatic retry mechanisms

## Testing

### Manual Testing Checklist

1. **Alumni Registration**
   - [ ] Search with registration number
   - [ ] Search with phone number
   - [ ] Search with email
   - [ ] Form pre-population
   - [ ] SMS verification
   - [ ] Email verification
   - [ ] Session creation

2. **Non-Alumni Registration**
   - [ ] Form validation
   - [ ] Verification process
   - [ ] Session creation

3. **Login Flow**
   - [ ] Recognized device login
   - [ ] New device verification
   - [ ] Phone login
   - [ ] Email login

4. **Session Management**
   - [ ] Session persistence
   - [ ] Automatic logout
   - [ ] Device recognition

### Automated Testing
- Unit tests for device fingerprinting
- Integration tests for verification flow
- E2E tests for complete user journeys

## Deployment Considerations

### Environment Variables
```env
# SMS Service Configuration
SMS_PROVIDER=twilio
SMS_ACCOUNT_SID=your_account_sid
SMS_AUTH_TOKEN=your_auth_token

# Email Service Configuration
MAIL_MAILER=smtp
MAIL_HOST=your_smtp_host
MAIL_PORT=587
MAIL_USERNAME=your_email
MAIL_PASSWORD=your_password

# Session Configuration
SESSION_DRIVER=redis
SESSION_LIFETIME=43200 # 12 hours
```

### Performance Optimization
- Cache device fingerprints
- Optimize verification code generation
- Implement rate limiting
- Use Redis for session storage

## Future Enhancements

1. **Biometric Authentication**
   - Fingerprint/face recognition
   - Integration with device biometrics

2. **Multi-Factor Authentication**
   - Additional security layers
   - Backup verification methods

3. **Session Analytics**
   - Track session patterns
   - Security monitoring
   - User behavior analysis

4. **Advanced Device Recognition**
   - Machine learning for device classification
   - Behavioral fingerprinting
   - Risk assessment

## Support and Maintenance

### Monitoring
- Session creation/deletion logs
- Verification success/failure rates
- Device recognition accuracy
- API response times

### Troubleshooting
- Device fingerprint generation issues
- SMS/email delivery problems
- Session validation failures
- Browser compatibility issues

### Updates
- Regular security updates
- Browser compatibility maintenance
- Performance optimizations
- Feature enhancements 