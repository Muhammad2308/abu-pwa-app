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

  // Check donor session from localStorage and verify with backend
  const checkSession = async () => {
    try {
      const storedSessionId = localStorage.getItem('donor_session_id');
      const storedUsername = localStorage.getItem('donor_username');

      if (storedSessionId) {
        // Verify session with backend
        const response = await donorSessionsAPI.getCurrentSession(parseInt(storedSessionId));
        
        if (response.data?.success && response.data?.data) {
          const sessionData = response.data.data;
          // Handle different response structures for donor data
          const donorData = sessionData.donor || sessionData.data?.donor || response.data.data?.donor;
          
          console.log('checkSession - Full response:', response.data);
          console.log('checkSession - Session data:', sessionData);
          console.log('checkSession - Donor data:', donorData);
          console.log('checkSession - Profile image:', donorData?.profile_image);
          
          setSessionId(storedSessionId);
          setUsername(sessionData.username || storedUsername);
          setUser(donorData); // Set user with the donor data
          setIsAuthenticated(true);
          setIsDeviceRecognized(true);
          setHasDonorSession(true);
          if (sessionData.device_session_id) {
            setDeviceSessionId(sessionData.device_session_id);
          }
          setLoading(false); // Set loading to false on success
        } else {
          // Session invalid, clear storage
          clearDonorSession();
          // Check device recognition after clearing session
          await checkDeviceAndDonorSession();
        }
      } else {
        // No session, check device recognition and donor session status
        await checkDeviceAndDonorSession();
      }
    } catch (error) {
      console.error('Session check error:', error);
      // Only clear session if it's a 401 (unauthorized), not for other errors
      if (error.response?.status === 401) {
        // Session invalid or expired, clear storage and check device
        clearDonorSession();
        await checkDeviceAndDonorSession();
      } else {
        // For other errors (network, etc.), don't clear session - might be temporary
        // Just set loading to false and keep current state
        setLoading(false);
      }
    }
  };

  // Check device recognition and donor session status
  const checkDeviceAndDonorSession = async () => {
    try {
      // Use the new check-device endpoint that returns both device and donor session status
      const response = await donorSessionsAPI.checkDevice();
      
      if (response.data?.success && response.data?.recognized) {
        // Device is recognized
        setIsDeviceRecognized(true);
        setUser(response.data.donor);
        
        if (response.data.device_session?.id) {
          setDeviceSessionId(response.data.device_session.id);
        }
        
        // Check if donor has a session
        if (response.data.has_donor_session && response.data.donor_session) {
          // Donor has a session - they should login
          setHasDonorSession(true);
        } else {
          // Device recognized but no donor session - they should register
          setHasDonorSession(false);
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
        setUser(response.data.donor);
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
      };
      
      const response = await donorSessionsAPI.register(dataToSend);
      
      if (response.data?.success && response.data?.data) {
        const { id: newSessionId, username: newUsername, donor, device_session_id } = response.data.data;
        
        // Store session in localStorage
        localStorage.setItem('donor_session_id', newSessionId.toString());
        localStorage.setItem('donor_username', newUsername);
        
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
        
        return { success: true, message: response.data.message || 'Registration successful' };
      } else {
        return { success: false, message: response.data?.message || 'Registration failed' };
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
      setLogoutLoading(false);
    }
  };

  // Clear donor session from state and localStorage
  const clearDonorSession = () => {
    localStorage.removeItem('donor_session_id');
    localStorage.removeItem('donor_username');
    setSessionId(null);
    setUsername(null);
    setIsAuthenticated(false);
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

  // Forgot Password - Request Reset Code
  const requestPasswordReset = async (email) => {
    try {
      const response = await donorSessionsAPI.requestPasswordReset(email);
      
      if (response.data?.success) {
        return { success: true, message: response.data.message || 'Reset code sent to your email' };
      } else {
        return { success: false, message: response.data?.message || 'Failed to send reset code' };
      }
    } catch (error) {
      console.error('Request password reset error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to send reset code';
      return { success: false, message: errorMessage, error: error };
    }
  };

  // Forgot Password - Verify Reset Code
  const verifyResetCode = async (email, code) => {
    try {
      const response = await donorSessionsAPI.verifyResetCode(email, code);
      
      if (response.data?.success) {
        return { success: true, message: response.data.message || 'Code verified successfully' };
      } else {
        return { success: false, message: response.data?.message || 'Invalid or expired code' };
      }
    } catch (error) {
      console.error('Verify reset code error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to verify code';
      return { success: false, message: errorMessage, error: error };
    }
  };

  // Forgot Password - Reset Password
  const resetPassword = async (email, code, newPassword) => {
    try {
      const response = await donorSessionsAPI.resetPassword(email, code, newPassword);
      
      if (response.data?.success) {
        return { success: true, message: response.data.message || 'Password reset successful' };
      } else {
        return { success: false, message: response.data?.message || 'Failed to reset password' };
      }
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
    verifyResetCode,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};