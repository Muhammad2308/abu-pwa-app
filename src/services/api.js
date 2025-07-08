import axios from 'axios';
import { getDeviceFingerprint } from '../utils/deviceFingerprint';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
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
    const token = localStorage.getItem('auth_token');
    const deviceSession = localStorage.getItem('device_session');
    if (token) {
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
      localStorage.removeItem('auth_token');
      localStorage.removeItem('device_session');
      localStorage.removeItem('user');
      window.location.href = '/login';
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
  getHistory: () => api.get('/api/donations/history'),
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
};

// Donors API calls
export const donorsAPI = {
  searchByRegNumber: (regNumber) => api.get(`/api/donors/search/${encodeURIComponent(regNumber)}`),
  searchByPhone: (phone) => api.get(`/api/donors/search/phone/${encodeURIComponent(phone)}`),
  searchByEmail: (email) => api.get(`/api/donors/search/email/${encodeURIComponent(email)}`),
  update: (id, donorData) => api.put(`/api/donors/${id}`, donorData),
  create: (donorData) => api.post('/api/donors', donorData),
};

// Utility functions
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
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
  return API_BASE_URL.replace(/\/api$/, '/');
};

export default api; 