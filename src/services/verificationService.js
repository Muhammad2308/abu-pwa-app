import api from './api';

export const verificationAPI = {
  // Send SMS verification code
  sendSMSVerification: (phone) => api.post('/api/verification/send-sms', { phone }),
  
  // Send email verification code
  sendEmailVerification: (email) => api.post('/api/verification/send-email', { email }),
  
  // Verify SMS code
  verifySMSCode: (phone, code) => api.post('/api/verification/verify-sms', { phone, code }),
  
  // Verify email code
  verifyEmailCode: (email, code) => api.post('/api/verification/verify-email', { email, code }),
  
  // Create device session after verification (for new registrations)
  createDeviceSession: (sessionData) => api.post('/api/session/create', sessionData),
  
  // Login with existing donor (for existing users) - Now properly separated from user authentication
  loginWithDonor: (email, deviceInfo) => api.post('/api/session/login-with-donor', { 
    email, 
    deviceInfo 
  }),
  
  // Check if device is recognized
  checkDeviceSession: (deviceInfo) => api.post('/api/session/check', deviceInfo),
  
  // Logout device session
  logout: () => api.post('/api/session/logout'),
};

export const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const validateVerificationCode = (code) => {
  return /^\d{6}$/.test(code);
}; 