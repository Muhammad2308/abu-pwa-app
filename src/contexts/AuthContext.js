import React, { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api, { getCsrfCookie } from '../services/api';

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
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication status on app load
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await api.get('/api/session/check');
      if (response.data.authenticated) {
        setUser(response.data.user);
        setIsAuthenticated(true);
      } else {
        // Clear invalid token
        localStorage.removeItem('auth_token');
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      // Clear invalid token on error
      localStorage.removeItem('auth_token');
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  // Simple login for returning users (email or phone)
  const simpleLogin = async (emailOrPhone) => {
    try {
      const response = await api.post('/api/session/login-with-donor', {
        email_or_phone: emailOrPhone
      });

      if (response.data.success) {
        const { user: userData, token } = response.data;
        localStorage.setItem('auth_token', token);
        setUser(userData);
        setIsAuthenticated(true);
        toast.success(`Welcome back, ${userData.name}!`);
        return { success: true };
      } else {
        toast.error(response.data.message || 'Login failed');
        return { success: false, message: response.data.message };
      }
    } catch (error) {
      console.error('Simple login error:', error);
      const message = error.response?.data?.message || 'Login failed. Please try again.';
      toast.error(message);
      return { success: false, message };
    }
  };

  // Register and send verification email
  const registerAndVerify = async (donorData) => {
    try {
      // For addressable alumni, we already have the ID from the search
      if (donorData.donor_type === 'addressable_alumni' && donorData.id) {
        // Send verification email for existing alumni
        const response = await api.post('/api/verification/send-email', {
          email: donorData.email,
          donor_id: donorData.id
        });

        if (response.data.success) {
          toast.success('Verification email sent! Please check your inbox.');
          return { success: true };
        } else {
          toast.error(response.data.message || 'Failed to send verification email');
          return { success: false, message: response.data.message };
        }
      } else {
        // For non-addressable alumni, create new donor first
        const createResponse = await api.post('/api/donors', donorData);
        
        if (createResponse.data.success) {
          const donorId = createResponse.data.donor.id;
          
          // Send verification email
          const verifyResponse = await api.post('/api/verification/send-email', {
            email: donorData.email,
            donor_id: donorId
          });

          if (verifyResponse.data.success) {
            toast.success('Account created! Verification email sent. Please check your inbox.');
            return { success: true };
          } else {
            toast.error(verifyResponse.data.message || 'Failed to send verification email');
            return { success: false, message: verifyResponse.data.message };
          }
        } else {
          toast.error(createResponse.data.message || 'Failed to create account');
          return { success: false, message: createResponse.data.message };
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      const message = error.response?.data?.message || 'Registration failed. Please try again.';
      toast.error(message);
      return { success: false, message };
    }
  };

  // Complete email verification and create device session
  const completeVerification = async (code, donorData) => {
    try {
      const response = await api.post('/api/verification/verify-email', {
        email: donorData.email,
        code: code
      });

      if (response.data.success) {
        const { user: userData, token } = response.data;
        localStorage.setItem('auth_token', token);
        setUser(userData);
        setIsAuthenticated(true);
        toast.success(`Welcome, ${userData.name}! Your account has been verified.`);
        return { success: true };
      } else {
        toast.error(response.data.message || 'Verification failed');
        return { success: false, message: response.data.message };
      }
    } catch (error) {
      console.error('Verification error:', error);
      const message = error.response?.data?.message || 'Verification failed. Please try again.';
      toast.error(message);
      return { success: false, message };
    }
  };

  // Logout
  const logout = async () => {
    try {
      await api.post('/api/session/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('auth_token');
      setUser(null);
      setIsAuthenticated(false);
      toast.success('Logged out successfully');
    }
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    simpleLogin,
    registerAndVerify,
    completeVerification,
    logout,
    checkAuthStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};