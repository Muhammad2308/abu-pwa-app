user: () => api.get('/api/user'),
};

// Verification API calls
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
  createDeviceSession: (sessionData) => api.post('/api/session/create', sessionData),

  // Check if device is recognized
  checkDeviceSession: (deviceInfo) => api.post('/api/session/check', deviceInfo),

  // Login with device session
  loginWithDevice: (credentials) => api.post('/api/session/login', credentials),

  // Logout device session
  logout: () => api.post('/api/session/logout'),
};

// Projects API calls
export const projectsAPI = {
  getAll: () => api.get('/api/projects'),
  getById: (id) => api.get(`/api/projects/${id}`),
  getByFaculty: (facultyId) => api.get(`/api/projects?faculty_id=${facultyId}`),
};

// Donations API calls
export const donationsAPI = {
  create: (donationData) => api.post('/api/donations', donationData),
  getHistory: () => api.get('/api/donations/history', {
    headers: {
      'X-Device-Fingerprint': getDeviceFingerprint(),
    },
  }),
  getSummary: () => api.get('/api/donations/summary'),
};

// Payments API calls
export const paymentsAPI = {
  initialize: (paymentData) => api.post('/api/payments/initialize', paymentData),
  verify: (reference) => api.get(`/api/payments/verify/${reference}`),
  webhook: (webhookData) => api.post('/api/payments/webhook', webhookData),
};

// Rankings API calls
export const rankingsAPI = {
  getAll: () => api.get('/api/rankings'),
  getTopDonors: () => api.get('/api/rankings/top-donors'),
};

// Faculties and Departments API calls
export const facultiesAPI = {
  getAll: () => api.get('/api/faculties'),
  getDepartments: (facultyId) => api.get(`/api/faculties/${facultyId}/departments`),
  getByEntryYear: (entryYear) => api.get(`/api/faculties/by-entry-year/${entryYear}`),
  getDepartmentsByEntryYear: (facultyId, entryYear) => api.get(`/api/faculties/${facultyId}/departments/by-entry-year/${entryYear}`),
};

// Donors API calls
export const donorsAPI = {
  searchByRegNumber: (regNumber) => api.get(`/api/donors/search/${encodeURIComponent(regNumber)}`),
  searchByPhone: (phone) => api.get(`/api/donors/search/phone/${encodeURIComponent(phone)}`),
  searchByEmail: (email) => api.get(`/api/donors/search/email/${encodeURIComponent(email)}`),
  update: (id, donorData) => api.put(`/api/donors/${id}`, donorData),
  create: (donorData) => api.post('/api/donors', donorData),
  getWithoutRanking: () => api.get('/api/donors/without-ranking'),
  uploadProfileImage: (id, imageFile) => {
    const formData = new FormData();
    formData.append('profile_image', imageFile);
    return api.post(`/api/donors/${id}/profile-image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

// Donor Sessions API calls (Authentication)
export const donorSessionsAPI = {
  register: (data) => api.post('/api/donor-sessions/register', data),
  login: (credentials) => api.post('/api/donor-sessions/login', credentials),
  logout: () => api.post('/api/donor-sessions/logout'),
  getCurrentSession: (sessionId) => api.post('/api/donor-sessions/me', { session_id: sessionId }),
  checkDevice: () => api.get('/api/donor-sessions/check-device'),
  updateUsername: (sessionId, username) => api.put(`/api/donor-sessions/${sessionId}/username`, { username }),
  updatePassword: (sessionId, passwordData) => api.put(`/api/donor-sessions/${sessionId}/password`, passwordData),
  googleLogin: (data) => api.post('/api/donor-sessions/google-login', data),
  googleRegister: (data) => api.post('/api/donor-sessions/google-register', data),
  // Forgot Password endpoints
  requestPasswordReset: (email) => api.post('/api/donor-sessions/forgot-password', {
    email,
    callback_url: `${window.location.origin}/reset-password`
  }),
  validateResetToken: (token) => api.get(`/api/donor-sessions/reset/${token}`),
  resetPasswordWithToken: (token, password, password_confirmation) =>
    api.post(`/api/donor-sessions/reset/${token}`, { password, password_confirmation }),
};

// Utility functions
export const formatNaira = (amount) => {
  if (amount == null) amount = 0;
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// Utility to get the base URL for images (strip trailing /api if present)
export const getBaseUrl = () => {
  // Normalize without trailing slash
  const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  // If base ends with /api, strip it to get the app root
  const root = base.endsWith('/api') ? base.slice(0, -4) : base;
  return root.endsWith('/') ? root : root + '/';
};

export default api;