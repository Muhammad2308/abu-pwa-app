
import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { donorSessionsAPI } from '../services/api';
import toast from 'react-hot-toast';
import { getDeviceFingerprint } from '../utils/deviceFingerprint';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDeviceRecognized, setIsDeviceRecognized] = useState(false);

  // Donor session authentication state
  const [sessionId, setSessionId] = useState(null);
  const [username, setUsername] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [deviceSessionId, setDeviceSessionId] = useState(null);
  const [hasDonorSession, setHasDonorSession] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  // Check session on app load (priority: donor session > device recognition)
  useEffect(() => {
    checkSession();
  }, []);

  // Cache user data for optimistic restoration on refresh
  const cacheUserData = (donorData, username) => {
    try {
      localStorage.setItem('cached_user_data', JSON.stringify({
        user: donorData,
        username: username,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Error caching user data:', error);
    }
  };

  // Get cached user data (for optimistic restoration)
  const getCachedUserData = () => {
    try {
      const cached = localStorage.getItem('cached_user_data');
      if (cached) {
        const data = JSON.parse(cached);
        // Only use cache if it's less than 24 hours old
        const cacheAge = Date.now() - data.timestamp;
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        if (cacheAge < maxAge) {
          return data;
        } else {
          // Cache expired, remove it
          localStorage.removeItem('cached_user_data');
        }
      }
    } catch (error) {
      console.error('Error reading cached user data:', error);
      localStorage.removeItem('cached_user_data');
    }
    return null;
  };

  // Check donor session from localStorage and verify with backend
  const checkSession = async () => {
    try {
      const storedSessionId = localStorage.getItem('donor_session_id');
      const storedUsername = localStorage.getItem('donor_username');

      if (storedSessionId) {
        // OPTIMISTIC RESTORATION: Restore from cache immediately for better UX
        // This prevents users from appearing logged out during network delays
        const cachedData = getCachedUserData();
        if (cachedData && cachedData.user) {
          console.log('Restoring user from cache (optimistic restoration)');
          setSessionId(storedSessionId);
          setUsername(cachedData.username || storedUsername);
          setUser(cachedData.user);
          setIsAuthenticated(true);
          setIsDeviceRecognized(true);
          setHasDonorSession(true);
          setLoading(false); // Set loading to false immediately so UI can render
        } else {
          // No cache but we have session ID - optimistically keep user logged in
          // This prevents logout during refresh even if cache is missing
          console.log('No cache found, but session ID exists - keeping optimistic auth state');
          setSessionId(storedSessionId);
          setUsername(storedUsername);
          setIsAuthenticated(true);
          setIsDeviceRecognized(true);
          setHasDonorSession(true);
          setLoading(false); // Set loading to false so UI can render
          // User will be set when API call completes
        }

        // Now verify session with backend in the background
        try {
          const response = await donorSessionsAPI.getCurrentSession(parseInt(storedSessionId));

          if (response.data?.success && response.data?.data) {
            const sessionData = response.data.data;
            // Handle different response structures for donor data
            const donorData = sessionData.donor || sessionData.data?.donor || response.data.data?.donor;

            console.log('checkSession - Full response:', response.data);
            console.log('checkSession - Session data:', sessionData);
            console.log('checkSession - Donor data:', donorData);
            console.log('checkSession - Profile image:', donorData?.profile_image);

            // Update with fresh data from backend
            setSessionId(storedSessionId);
            setUsername(sessionData.username || storedUsername);
            setUser(donorData);
            setIsAuthenticated(true);
            setIsDeviceRecognized(true);
            setHasDonorSession(true);

            // Update cache with fresh data
            cacheUserData(donorData, sessionData.username || storedUsername);

            if (sessionData.device_session_id) {
              setDeviceSessionId(sessionData.device_session_id);
            }
            setLoading(false);
          } else {
            // Session invalid, clear storage and cache
            console.log('Session verification failed - clearing session');
            clearDonorSession();
            localStorage.removeItem('cached_user_data');
            // Check device recognition after clearing session
            await checkDeviceAndDonorSession();
          }
        } catch (verifyError) {
          console.error('Session verification error:', verifyError);

          // Only clear session if it's a 401 (unauthorized), not for other errors
          if (verifyError.response?.status === 401) {
            // Session invalid or expired, clear storage and cache
            console.log('Session expired (401) - clearing session');
            clearDonorSession();
            localStorage.removeItem('cached_user_data');
            await checkDeviceAndDonorSession();
          } else {
            // Network error or other issue - keep user logged in optimistically
            // The optimistic restoration above already set the auth state
            console.log('Network error during session verification, keeping optimistic session');
            // If we don't have user data yet (no cache), keep auth state but user will be null
            // This prevents logout on network errors
            // Loading is already set to false by optimistic restoration
            // User will remain logged in until next successful verification
            // If we have cached data, it was already restored above
          }
        }
      } else {
        // No session, check device recognition and donor session status
        localStorage.removeItem('cached_user_data'); // Clear any stale cache
        await checkDeviceAndDonorSession();
      }
    } catch (error) {
      console.error('Session check error:', error);
      // Fallback: if we have a session ID, keep user logged in optimistically
      const storedSessionId = localStorage.getItem('donor_session_id');
      const storedUsername = localStorage.getItem('donor_username');

      if (storedSessionId) {
        // Try to use cached data if available
        const cachedData = getCachedUserData();
        if (cachedData && cachedData.user) {
          console.log('Using cached data as fallback');
          setSessionId(storedSessionId);
          setUsername(cachedData.username || storedUsername);
          setUser(cachedData.user);
          setIsAuthenticated(true);
          setIsDeviceRecognized(true);
          setHasDonorSession(true);
        } else {
          // No cache but we have session ID - keep optimistic auth state
          console.log('No cache but session ID exists - keeping optimistic auth state');
          setSessionId(storedSessionId);
          setUsername(storedUsername);
          setIsAuthenticated(true);
          setIsDeviceRecognized(true);
          setHasDonorSession(true);
          // User will be null but isAuthenticated will be true
          // This prevents logout on errors
        }
      }
      setLoading(false);
    }
  };

  // Check device recognition and donor session status
  const checkDeviceAndDonorSession = async () => {
    try {
      // Use the new check-device endpoint that returns both device and donor session status
      const response = await donorSessionsAPI.checkDevice();

      if (response.data?.success && response.data?.recognized) {
        // Device is recognized - but user is NOT authenticated yet
        setIsDeviceRecognized(true);

        // Only set user if they have an active donor session (authenticated)
        // Otherwise, just store donor info for display purposes but don't set as authenticated
        if (response.data.has_donor_session && response.data.donor_session) {
          // Donor has a session - they should login (not authenticated yet)
          setHasDonorSession(true);
          // Don't set user here - wait for actual login
          setUser(null);
        } else {
          // Device recognized but no donor session - they should register
          setHasDonorSession(false);
          // Don't set user here - they need to register/login first
          setUser(null);
        }

        if (response.data.device_session?.id) {
          setDeviceSessionId(response.data.device_session.id);
        }
      } else {
        // Device not recognized
        setUser(null);
        setIsDeviceRecognized(false);
        setHasDonorSession(false);
        setDeviceSessionId(null);
      }
      setLoading(false); // Always set loading to false after check
    } catch (error) {
      console.error('Device and session check error:', error);
      // Fallback to old device check endpoint
      try {
        await checkDeviceRecognition();
      } catch (fallbackError) {
        console.error('Fallback device check also failed:', fallbackError);
        setLoading(false); // Ensure loading is set to false even if fallback fails
      }
    }
  };

  // Check device recognition (fallback - old endpoint)
  const checkDeviceRecognition = async () => {
    try {
      const response = await api.get('/api/device/check');

      if (response.data.recognized) {
        // Device is recognized but user is NOT authenticated yet
        // Don't set user - they need to login/register first
        setUser(null);
        setIsDeviceRecognized(true);
        // We don't know if they have a donor session, so check it
        // This is a fallback, so we'll assume they need to register/login
        setHasDonorSession(false);
      } else {
        setUser(null);
        setIsDeviceRecognized(false);
        setHasDonorSession(false);
      }
      setLoading(false); // Always set loading to false after check
    } catch (error) {
      console.error('Device recognition error:', error);
      setUser(null);
      setIsDeviceRecognized(false);
      setHasDonorSession(false);
      setLoading(false); // Set loading to false even on error
    }
  };

  // Register new donor session
  const register = async (registerData) => {
    try {
      // Include device_session_id if available
      const dataToSend = {
        ...registerData,
        device_session_id: deviceSessionId || registerData.device_session_id || null,
      }
    } catch (error) {
      console.error('Registration error:', error);
      console.error('Registration error response:', error.response?.data);

      // Handle specific error codes
      if (error.response?.status === 422) {
        const validationErrors = error.response.data?.errors;
        if (validationErrors) {
          const errorMessages = Object.values(validationErrors).flat().join(', ');
          return {
            success: false,
            message: errorMessages,
            errors: validationErrors // Include errors object for field-level display
          };
        }
        return {
          success: false,
          message: error.response.data?.message || 'Validation failed',
          errors: error.response.data?.errors || {}
        };
      }

      if (error.response?.status === 409) {
        return { success: false, message: error.response.data?.message || 'Donor already registered' };
      }

      if (error.code === 'ERR_NETWORK') {
        return { success: false, message: 'Network error - please check your connection' };
      }

      return { success: false, message: error.response?.data?.message || 'Registration failed' };
    }
  };

  // Login with username and password
  const login = async (credentials) => {
    try {
      // Include device_session_id if available
      const dataToSend = {
        ...credentials,
        device_session_id: deviceSessionId || credentials.device_session_id || null,
      };

      const response = await donorSessionsAPI.login(dataToSend);

      if (response.data?.success && response.data?.data) {
        const { session_id: newSessionId, username: newUsername, donor, device_session_id } = response.data.data;

        // Store session in localStorage
        localStorage.setItem('donor_session_id', newSessionId.toString());
        localStorage.setItem('donor_username', newUsername);

        // Cache user data for optimistic restoration on refresh
        cacheUserData(donor, newUsername);

        // Update state
        setSessionId(newSessionId.toString());
        setUsername(newUsername);
        setUser(donor);
        setIsAuthenticated(true);
        setIsDeviceRecognized(true);
        setHasDonorSession(true);
        if (device_session_id) {
          setDeviceSessionId(device_session_id);
        }

        return { success: true, message: response.data.message || 'Login successful' };
      } else {
        return { success: false, message: response.data?.message || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);

      // Handle specific error codes
      if (error.response?.status === 401) {
        // Check if it's a Google account trying to use email/password
        const errorMessage = error.response.data?.message || '';
        if (errorMessage.includes('Google') || errorMessage.includes('google')) {
          return {
            success: false,
            message: errorMessage || 'This account is registered with Google. Please use "Login with Google" instead.',
            error: error
          };
        }
        return {
          success: false,
          message: error.response.data?.message || 'Invalid credentials',
          error: error
        };
      }

      if (error.response?.status === 422) {
        const validationErrors = error.response.data?.errors;
        if (validationErrors) {
          const errorMessages = Object.values(validationErrors).flat().join(', ');
          return { success: false, message: errorMessages };
        }
        return { success: false, message: error.response.data?.message || 'Validation failed' };
      }

      if (error.response?.status === 401) {
        return { success: false, message: error.response.data?.message || 'Invalid credentials' };
      }

      if (error.code === 'ERR_NETWORK') {
        return { success: false, message: 'Network error - please check your connection' };
      }

      return { success: false, message: error.response?.data?.message || 'Login failed' };
    }
  };

  // Logout from donor session
  const logout = async () => {
    setLogoutLoading(true);
    try {
      // Add a small delay for better UX
      await new Promise(resolve => setTimeout(resolve, 500));

      // Call logout API if session exists
      if (sessionId) {
        await donorSessionsAPI.logout();
      }
    } catch (error) {
      console.error('Logout API error:', error);
      // Continue with logout even if API call fails
    } finally {
      // Clear session regardless of API response
      clearDonorSession();
      // Also clear user and device recognition to allow new user login
      setUser(null);
      setIsDeviceRecognized(false);
      setDeviceSessionId(null);
      setHasDonorSession(false);

      // Clear all cached donation totals on logout
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('abu_totalDonated_')) {
          localStorage.removeItem(key);
        }
      });

      setLogoutLoading(false);
    }
  };

  // Clear donor session from state and localStorage
  const clearDonorSession = () => {
    localStorage.removeItem('donor_session_id');
    localStorage.removeItem('donor_username');
    localStorage.removeItem('cached_user_data'); // Clear cached user data
    setSessionId(null);
    setUsername(null);
    setIsAuthenticated(false);
    // Also clear user to ensure no stale data
    setUser(null);
    // Clear all cached donation totals
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('abu_totalDonated_')) {
        localStorage.removeItem(key);
      }
    });
    // Note: We now also clear user/device recognition in logout() to allow new user login
  };

  // Google OAuth Login
  const googleLogin = async (credential) => {
    try {
      const dataToSend = {
        token: credential,
        device_session_id: deviceSessionId || null,
      };

      console.log('Google Login - Sending data:', { token: credential?.substring(0, 20) + '...', device_session_id: dataToSend.device_session_id });

      const response = await donorSessionsAPI.googleLogin(dataToSend);

      console.log('Google Login - Response:', response.data);

      if (response.data?.success && response.data?.data) {
        const { session_id: newSessionId, username: newUsername, donor, device_session_id } = response.data.data;

        // Store session in localStorage
        localStorage.setItem('donor_session_id', newSessionId.toString());
        localStorage.setItem('donor_username', newUsername);

        // Cache user data for optimistic restoration on refresh
        cacheUserData(donor, newUsername);

        // Update state
        setSessionId(newSessionId.toString());
        setUsername(newUsername);
        setUser(donor);
        setIsAuthenticated(true);
        setIsDeviceRecognized(true);
        setHasDonorSession(true);
        if (device_session_id) {
          setDeviceSessionId(device_session_id);
        }

        return { success: true, message: response.data.message || 'Google login successful' };
      } else {
        const errorMessage = response.data?.message || 'Google login failed';
        console.error('Google Login - Failed:', errorMessage, response.data);
        return { success: false, message: errorMessage };
      }
    } catch (error) {
      console.error('Google login error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);

      // Extract detailed error message
      let errorMessage = 'Google login failed. Please try again.';

      if (error.response?.status === 500) {
        errorMessage = error.response?.data?.message || 'Server error occurred. Please contact support or try again later.';
      } else if (error.response?.status === 401) {
        errorMessage = error.response?.data?.message || 'Invalid or expired Google token. Please try again.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      return { success: false, message: errorMessage, error: error };
    }
  };

  // Google OAuth Register
  const googleRegister = async (credential) => {
    try {
      // Validate token format
      if (!credential || typeof credential !== 'string') {
        console.error('Google Register - Invalid token format:', typeof credential);
        return { success: false, message: 'Invalid Google token format' };
      }

      // Decode token to verify it's valid (for debugging)
      try {
        const parts = credential.split('.');
        if (parts.length !== 3) {
          console.error('Google Register - Invalid JWT format (not 3 parts)');
          return { success: false, message: 'Invalid Google token format' };
        }

        // Decode payload (base64url decode)
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        console.log('Google Register - Token payload:', {
          iss: payload.iss,
          aud: payload.aud,
          email: payload.email,
          email_verified: payload.email_verified,
          exp: payload.exp,
          exp_date: new Date(payload.exp * 1000).toISOString(),
          now: new Date().toISOString(),
          expired: payload.exp < Date.now() / 1000
        });

        // Check if token is expired
        if (payload.exp && payload.exp < Date.now() / 1000) {
          console.error('Google Register - Token expired');
          return { success: false, message: 'Google token has expired. Please try again.' };
        }

        // Check if email is verified
        if (!payload.email_verified) {
          console.error('Google Register - Email not verified');
          return { success: false, message: 'Google email is not verified. Please verify your email with Google first.' };
        }

        // Check audience (client ID)
        const expectedClientId = '470253699627-a50centdev8a3ahhq0e01oiakatu3qh4.apps.googleusercontent.com';
        if (payload.aud && payload.aud !== expectedClientId) {
          console.error('Google Register - Client ID mismatch:', { expected: expectedClientId, got: payload.aud });
          return { success: false, message: 'Google token client ID mismatch. Please contact support.' };
        }
      } catch (decodeError) {
        console.error('Google Register - Token decode error:', decodeError);
        // Continue anyway - backend will verify
      }

      const dataToSend = {
        token: credential,
        device_session_id: deviceSessionId || null,
      };

      console.log('Google Register - Sending data:', {
        token_length: credential.length,
        token_preview: credential.substring(0, 30) + '...',
        device_session_id: dataToSend.device_session_id
      });

      const response = await donorSessionsAPI.googleRegister(dataToSend);

      console.log('Google Register - Response:', response.data);

      if (response.data?.success && response.data?.data) {
        const { session_id: newSessionId, username: newUsername, donor, device_session_id } = response.data.data;

        // Store session in localStorage
        localStorage.setItem('donor_session_id', newSessionId.toString());
        localStorage.setItem('donor_username', newUsername);

        // Cache user data for optimistic restoration on refresh
        cacheUserData(donor, newUsername);

        // Update state - ensure all state is set synchronously
        setSessionId(newSessionId.toString());
        setUsername(newUsername);
        setUser(donor);
        setIsAuthenticated(true);
        setIsDeviceRecognized(true);
        setHasDonorSession(true);
        if (device_session_id) {
          setDeviceSessionId(device_session_id);
        }

        console.log('Google Register - State updated:', {
          sessionId: newSessionId,
          username: newUsername,
          isAuthenticated: true,
          user: donor
        });

        // Force a state update by triggering a re-render
        // This ensures the useEffect in Register.js picks up the authentication change
        setTimeout(() => {
          console.log('Google Register - Triggering state refresh...');
          // The state is already set, but we'll log to confirm
        }, 100);

        return { success: true, message: response.data.message || 'Google registration successful' };
      } else {
        const errorMessage = response.data?.message || 'Google registration failed';
        console.error('Google Register - Failed:', errorMessage, response.data);
        return { success: false, message: errorMessage };
      }
    } catch (error) {
      console.error('Google register error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);

      // Extract detailed error message
      let errorMessage = 'Google registration failed. Please try again.';

      if (error.response?.status === 500) {
        // Check if it's a backend implementation issue
        const backendError = error.response?.data?.message || error.response?.data?.exception || '';
        if (backendError.includes('Google_Client') || backendError.includes('not found')) {
          errorMessage = 'Google OAuth is not properly configured on the server. Please contact support.';
        } else {
          errorMessage = backendError || 'Server error occurred. Please contact support or try again later.';
        }
      } else if (error.response?.status === 401) {
        const backendMsg = error.response?.data?.message || '';
        if (backendMsg.includes('email') && backendMsg.includes('verified')) {
          errorMessage = 'Your Google email is not verified. Please verify your email with Google first, then try again.';
        } else if (backendMsg.includes('expired')) {
          errorMessage = 'Google token has expired. Please try signing in with Google again.';
        } else {
          errorMessage = backendMsg || 'Invalid or expired Google token. Please try signing in with Google again.';
        }

        console.error('Google Register - 401 Error Details:', {
          message: backendMsg,
          full_response: error.response?.data,
          token_length: credential?.length,
        });
      } else if (error.response?.status === 409) {
        errorMessage = error.response?.data?.message || 'This Google account is already registered. Please login instead.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      return { success: false, message: errorMessage, error: error };
    }
  };

  // Create donor record
  const createDonor = async (donorData) => {
    try {
      const response = await api.post('/api/donors', donorData);

      if (response.data.success) {
        const donor = response.data.donor;
        setUser(donor);
        setIsDeviceRecognized(true);

        // Create device session
        await api.post('/api/device/session', {
          device_fingerprint: getDeviceFingerprint(),
          donor_id: donor.id
        });

        return { success: true, donor };
      } else {
        const message = response.data.message || 'Failed to create account';
        return { success: false, message };
      }
    } catch (error) {
      console.error('Create donor error:', error);
      const message = error.response?.data?.message || 'Failed to create account';
      return { success: false, message };
    }
  };

  // Update donor record
  // NOTE: This function sends donorData AS-IS to the backend
  // The backend should receive name, surname, and other_name as SEPARATE fields
  // and save them to their respective database columns
  const updateDonor = async (donorId, donorData) => {
    try {
      // Log what we're sending to verify structure
      console.log('AuthContext: Updating donor with ID:', donorId);
      console.log('AuthContext: Sending data to backend:', JSON.stringify(donorData, null, 2));

      if (donorData.name || donorData.surname || donorData.other_name) {
        console.log('AuthContext: Name fields being sent:');
        console.log('- name:', donorData.name);
        console.log('- surname:', donorData.surname);
        console.log('- other_name:', donorData.other_name);
      }

      const response = await api.put(`/api/donors/${donorId}`, donorData);

      if (response.data.success) {
        const donor = response.data.donor || response.data.data || response.data.data?.donor;
        if (donor) {
          setUser(donor);
          setIsDeviceRecognized(true);
        }

        // Create device session (handle different response structures)
        const donorIdForSession = donor?.id || donorId;
        if (donorIdForSession) {
          try {
            await api.post('/api/device/session', {
              device_fingerprint: getDeviceFingerprint(),
              donor_id: donorIdForSession
            });
          } catch (sessionError) {
            // Silent fail for device session creation
            console.log('Device session creation skipped:', sessionError);
          }
        }

        return { success: true, donor: donor || user };
      } else {
        const message = response.data.message || 'Failed to update profile';
        return { success: false, message };
      }
    } catch (error) {
      console.error('Update donor error:', error);
      console.error('Error response:', error.response?.data);

      // Handle validation errors (422)
      if (error.response?.status === 422) {
        const validationErrors = error.response.data.errors;
        if (validationErrors) {
          console.error('Validation errors:', validationErrors);
          // Format validation errors more clearly
          const errorMessages = Object.entries(validationErrors).map(([field, messages]) => {
            const messageArray = Array.isArray(messages) ? messages : [messages];
            return `${field}: ${messageArray.join(', ')}`;
          }).join('; ');

          return {
            success: false,
            message: errorMessages || 'Validation failed',
            errors: validationErrors // Return errors object for field-specific display
          };
        }
        return {
          success: false,
          message: error.response.data.message || 'Validation failed'
        };
      }

      const message = error.response?.data?.message || 'Failed to update profile';
      return { success: false, message };
    }
  };

  // Search addressable alumni by reg number, email, or phone
  const searchAlumni = async (input) => {
    // Accept either a string (legacy: reg number) or an object with optional fields
    const criteria = typeof input === 'string'
      ? { regNumber: input }
      : (input || {});

    const { regNumber, email, phone } = criteria;

    const trySearch = async (type, value) => {
      try {
        let url = '';
        if (type === 'reg') url = `/api/donors/search/${encodeURIComponent(value)}`;
        if (type === 'email') url = `/api/donors/search/email/${encodeURIComponent(value)}`;
        if (type === 'phone') url = `/api/donors/search/phone/${encodeURIComponent(value)}`;

        console.log('Making API call to search alumni:', value);
        const response = await api.get(url);
        console.log('API response:', response.data);

        if (response.data && response.data.data) {
          return { success: true, donor: response.data.data };
        }
        if (response.data && response.data.success && response.data.donor) {
          return { success: true, donor: response.data.donor };
        }
        return { success: false, message: response.data?.message || 'Alumni not found' };
      } catch (error) {
        console.error('Search alumni error:', error);
        console.error('Error response:', error.response?.data);

        if (error.response?.status === 404) {
          return { success: false, message: 'Alumni record not found' };
        }
        if (error.code === 'ERR_NETWORK') {
          return { success: false, message: 'Network error - please check your connection' };
        }
        return { success: false, message: error.response?.data?.message || 'Search failed' };
      }
    };

    // Try only provided fields, in this priority: regNumber -> email -> phone
    const attempts = [];
    if (regNumber) attempts.push(['reg', regNumber]);
    if (email) attempts.push(['email', email]);
    if (phone) attempts.push(['phone', phone]);

    if (attempts.length === 0) {
      return { success: false, message: 'Provide reg number, email or phone to search' };
    }

    for (const [type, value] of attempts) {
      const result = await trySearch(type, value);
      if (result.success) return result;
    }

    return { success: false, message: 'Alumni record not found' };
  };

  // Clear device session (for testing)
  const clearSession = () => {
    setUser(null);
    setIsDeviceRecognized(false);
    localStorage.removeItem('device_fingerprint');
  };

  // Forgot Password - Request Reset Link
  const requestPasswordReset = async (email) => {
    try {
      const response = await donorSessionsAPI.requestPasswordReset(email);

      // Backend always returns generic success; treat any 2xx as success
      if (response.status >= 200 && response.status < 300) {
        return { success: true, message: response.data?.message || 'If an account exists, a reset link has been sent.' };
      }
      return { success: false, message: response.data?.message || 'Failed to send reset link' };
    } catch (error) {
      console.error('Request password reset error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to send reset link';
      return { success: false, message: errorMessage, error: error };
    }
  };

  // Forgot Password - Validate Reset Token
  const validateResetToken = async (token) => {
    try {
      const response = await donorSessionsAPI.validateResetToken(token);

      if (response.data?.success) {
        return { success: true, data: response.data.data, message: response.data.message || 'Token valid' };
      }
      return { success: false, message: response.data?.message || 'Invalid or expired link' };
    } catch (error) {
      console.error('Validate reset token error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to validate reset link';
      return { success: false, message: errorMessage, error: error };
    }
  };

  // Forgot Password - Reset Password via Token
  const resetPasswordWithToken = async (token, password, passwordConfirmation) => {
    try {
      const response = await donorSessionsAPI.resetPasswordWithToken(token, password, passwordConfirmation);

      if (response.data?.success) {
        return { success: true, message: response.data.message || 'Password reset successful' };
      }
      return { success: false, message: response.data?.message || 'Failed to reset password' };
    } catch (error) {
      console.error('Reset password error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to reset password';
      return { success: false, message: errorMessage, error: error };
    }
  };

  const value = {
    // State
    user,
    isDeviceRecognized,
    loading,
    // Donor session authentication
    sessionId,
    username,
    isAuthenticated,
    deviceSessionId,
    hasDonorSession, // Whether the current donor has a donor_session record
    // Methods
    createDonor,
    updateDonor,
    searchAlumni,
    checkDeviceRecognition,
    clearSession,
    // Donor session methods
    register,
    login,
    logout,
    logoutLoading,
    checkSession,
    checkDeviceAndDonorSession,
    // Google OAuth methods
    googleLogin,
    googleRegister,
    // Forgot Password methods
    requestPasswordReset,
    validateResetToken,
    resetPasswordWithToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};