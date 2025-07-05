import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, getCsrfCookie } from '../services/api';
import { verificationAPI } from '../services/verificationService';
import { getDeviceInfo } from '../utils/deviceFingerprint';
import toast from 'react-hot-toast';

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
  const [verificationStep, setVerificationStep] = useState(null); // 'sms', 'email', 'complete'
  const [verificationData, setVerificationData] = useState(null);

  // Check if user is logged in on app start
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const deviceSession = localStorage.getItem('device_session');
      
      if (token) {
        // Verify token with backend
        const response = await authAPI.user();
        const userData = response.data;
        setUser(userData);
        setIsAuthenticated(true);
      } else if (deviceSession) {
        // Check device session
        const deviceInfo = getDeviceInfo();
        const response = await verificationAPI.checkDeviceSession(deviceInfo);
        if (response.data.valid) {
          setUser(response.data.user);
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem('device_session');
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // Clear invalid session
      localStorage.removeItem('auth_token');
      localStorage.removeItem('device_session');
      localStorage.removeItem('user');
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  // Device-based login (no password required)
  const loginWithDevice = async (credentials) => {
    try {
      setLoading(true);
      await getCsrfCookie();
      
      const deviceInfo = getDeviceInfo();
      const response = await verificationAPI.loginWithDevice({
        ...credentials,
        deviceInfo
      });
      
      const { user: userData, session_token } = response.data;
      
      localStorage.setItem('device_session', session_token);
      localStorage.setItem('user', JSON.stringify(userData));
      
      setUser(userData);
      setIsAuthenticated(true);
      
      toast.success('Login successful!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  // Send verification codes
  const sendVerification = async (type, contact) => {
    try {
      setLoading(true);
      await getCsrfCookie();
      
      let response;
      if (type === 'sms') {
        response = await verificationAPI.sendSMSVerification(contact);
      } else if (type === 'email') {
        response = await verificationAPI.sendEmailVerification(contact);
      }
      
      setVerificationStep(type);
      setVerificationData({ type, contact, ...response.data });
      
      toast.success(`${type.toUpperCase()} verification code sent!`);
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || `Failed to send ${type} verification`;
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  // Verify codes and create session
  const verifyAndCreateSession = async (code, donorData) => {
    try {
      setLoading(true);
      await getCsrfCookie();
      
      const { type, contact } = verificationData;
      let response;
      
      if (type === 'sms') {
        response = await verificationAPI.verifySMSCode(contact, code);
      } else if (type === 'email') {
        response = await verificationAPI.verifyEmailCode(contact, code);
      }
      
      if (response.data.verified) {
        // Create device session
        const deviceInfo = getDeviceInfo();
        const sessionResponse = await verificationAPI.createDeviceSession({
          donorData,
          deviceInfo,
          verificationData: response.data
        });
        
        const { user: userData, session_token } = sessionResponse.data;
        
        localStorage.setItem('device_session', session_token);
        localStorage.setItem('user', JSON.stringify(userData));
        
        setUser(userData);
        setIsAuthenticated(true);
        setVerificationStep('complete');
        setVerificationData(null);
        
        toast.success('Verification successful! Session created.');
        return { success: true };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Verification failed';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  // Register function for donors (updated for device sessions)
  const register = async (userData) => {
    try {
      setLoading(true);
      await getCsrfCookie();
      
      // Prepare registration data based on donor type
      const registrationData = {
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        donor_type: userData.donor_type,
        // Additional data for different donor types
        ...(userData.donor_type === 'addressable_alumni' && {
          registration_number: userData.registration_number,
          alumni_data: userData.alumni_data
        }),
        ...(userData.donor_type === 'non_addressable_alumni' && {
          faculty: userData.faculty,
          department: userData.department,
          graduation_year: userData.graduation_year
        }),
        ...(userData.donor_type === 'friends' && {
          organization: userData.organization,
          source: userData.source
        })
      };

      // Start verification process
      const verificationResult = await sendVerification('sms', userData.phone);
      if (verificationResult.success) {
        setVerificationData(prev => ({ ...prev, donorData: registrationData }));
        return { success: true, requiresVerification: true };
      }
      
      return { success: false };
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const deviceSession = localStorage.getItem('device_session');
      
      if (token) {
        await authAPI.logout();
      } else if (deviceSession) {
        // Clear device session
        await verificationAPI.logout();
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('device_session');
      localStorage.removeItem('user');
      setUser(null);
      setIsAuthenticated(false);
      setVerificationStep(null);
      setVerificationData(null);
      toast.success('Logged out successfully');
    }
  };

  // Update user data
  const updateUser = (newUserData) => {
    setUser(newUserData);
    localStorage.setItem('user', JSON.stringify(newUserData));
  };

  // Get user tier based on total donations
  const getUserTier = () => {
    if (!user) return null;
    
    const totalDonations = user.total_donations || 0;
    
    if (totalDonations >= 500000) return 'Gold';
    if (totalDonations >= 100000) return 'Silver';
    if (totalDonations >= 1000) return 'Bronze';
    return 'New';
  };

  // Get next tier progress
  const getNextTierProgress = () => {
    if (!user) return { current: 0, next: 0, progress: 0 };
    
    const totalDonations = user.total_donations || 0;
    
    if (totalDonations >= 500000) {
      return { current: totalDonations, next: 1000000, progress: 100 };
    }
    if (totalDonations >= 100000) {
      const progress = ((totalDonations - 100000) / (500000 - 100000)) * 100;
      return { current: totalDonations, next: 500000, progress: Math.min(progress, 100) };
    }
    if (totalDonations >= 1000) {
      const progress = ((totalDonations - 1000) / (100000 - 1000)) * 100;
      return { current: totalDonations, next: 100000, progress: Math.min(progress, 100) };
    }
    
    const progress = (totalDonations / 1000) * 100;
    return { current: totalDonations, next: 1000, progress: Math.min(progress, 100) };
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    verificationStep,
    verificationData,
    login: loginWithDevice, // Updated to use device-based login
    register,
    logout,
    updateUser,
    getUserTier,
    getNextTierProgress,
    checkAuthStatus,
    sendVerification,
    verifyAndCreateSession,
    setVerificationStep,
    setVerificationData,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};