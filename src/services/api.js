import axios from 'axios';
import { getDeviceFingerprint } from '../utils/deviceFingerprint';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // This is correct!
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Device-Fingerprint': getDeviceFingerprint(),
  },
});

// New function to get the CSRF cookie from Sanctum
export const getCsrfCookie = () => api.get('/sanctum/csrf-cookie');

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Priority: session_id > auth_token > device_session
    const sessionId = localStorage.getItem('donor_session_id');
    const token = localStorage.getItem('auth_token');
    const deviceSession = localStorage.getItem('device_session');

    if (sessionId) {
      // Donor session authentication - session_id is sent in request body for /me endpoint
      // For other endpoints, we might need to add it as a header if backend requires it
      // For now, /me endpoint expects it in body, other endpoints may use it differently
    } else if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else if (deviceSession) {
      config.headers['X-Device-Session'] = deviceSession;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      // Don't redirect if already on auth pages or if it's a session check endpoint
      const isAuthPage = currentPath.includes('/login') || currentPath.includes('/register') || currentPath.includes('/forgot-password') || currentPath.includes('/reset-password');
      const isSessionCheck = error.config?.url?.includes('/donor-sessions/me') || error.config?.url?.includes('/check-device');
      // Don't redirect for notification or alumni list fetches - these are non-critical
      const isNonCriticalFetch = error.config?.url?.includes('/messages') || error.config?.url?.includes('/donors');

      // CRITICAL: Don't clear session storage for session check endpoints - they're checking validity
      // Only clear if it's NOT a session check endpoint (session check might return 401 if expired, but we handle that in checkSession)
      if (!isSessionCheck) {
        // Clear all auth-related storage
        localStorage.removeItem('auth_token');
        localStorage.removeItem('device_session');
        localStorage.removeItem('donor_session_id');
        localStorage.removeItem('donor_username');
        localStorage.removeItem('user');
        localStorage.removeItem('cached_user_data'); // Also clear cached user data

        // Clear all cached donation totals
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('abu_totalDonated_')) {
            localStorage.removeItem(key);
          }
        });
      }

      // Only redirect if not already on auth pages, not a session check, and not a non-critical fetch
      // Also don't redirect if on home page (/) - allow unauthenticated access
      if (!isAuthPage && !isSessionCheck && !isNonCriticalFetch && currentPath !== '/') {
        // Use a small delay to prevent redirect loops
        setTimeout(() => {
          if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
            window.location.href = '/login';
          }
        }, 100);
      }
    }
    return Promise.reject(error);
  }
);

// Authentication API calls
export const authAPI = {
  login: (credentials) => api.post('/api/login', credentials),
  register: (userData) => api.post('/api/register', userData),
  logout: () => api.post('/api/logout'),
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