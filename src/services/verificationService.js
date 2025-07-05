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
  
  // Create device session after verification
  createDeviceSession: (sessionData) => api.post('/api/sessions/create', sessionData),
  
  // Check if device is recognized
  checkDeviceSession: (deviceInfo) => api.post('/api/sessions/check', deviceInfo),
  
  // Login with device session
  loginWithDevice: (credentials) => api.post('/api/sessions/login', credentials),
};

export const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const validateVerificationCode = (code) => {
  return /^\d{6}$/.test(code);
}; 