import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
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

  // Check device recognition on app load
  useEffect(() => {
    checkDeviceRecognition();
  }, []);

  const checkDeviceRecognition = async () => {
    try {
      const response = await api.get('/api/device/check');
      
      if (response.data.recognized) {
        setUser(response.data.donor);
        setIsDeviceRecognized(true);
      } else {
        setUser(null);
        setIsDeviceRecognized(false);
      }
    } catch (error) {
      console.error('Device recognition error:', error);
      setUser(null);
      setIsDeviceRecognized(false);
    } finally {
      setLoading(false);
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
  const updateDonor = async (donorId, donorData) => {
    try {
      const response = await api.put(`/api/donors/${donorId}`, donorData);
      
      if (response.data.success) {
        const donor = response.data.donor || response.data.data;
        setUser(donor);
        setIsDeviceRecognized(true);
        
        // Create device session (handle different response structures)
        const donorIdForSession = donor?.id || donorId;
        if (donorIdForSession) {
          await api.post('/api/device/session', {
            device_fingerprint: getDeviceFingerprint(),
            donor_id: donorIdForSession
          });
        }
        
        return { success: true, donor };
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
          const errorMessages = Object.values(validationErrors).flat().join(', ');
          return { success: false, message: errorMessages };
        }
      }
      
      const message = error.response?.data?.message || 'Failed to update profile';
      return { success: false, message };
    }
  };

  // Search addressable alumni
  const searchAlumni = async (regNumber) => {
    try {
      console.log('Making API call to search alumni:', regNumber);
      const response = await api.get(`/api/donors/search/${regNumber}`);
      console.log('API response:', response.data);
      
      // Check if we have data in the response
      if (response.data && response.data.data) {
        return { success: true, donor: response.data.data };
      } else if (response.data && response.data.success) {
        return { success: true, donor: response.data.donor };
      } else {
        return { success: false, message: response.data.message || 'Alumni not found' };
      }
    } catch (error) {
      console.error('Search alumni error:', error);
      console.error('Error response:', error.response?.data);
      
      if (error.response?.status === 404) {
        return { success: false, message: 'Alumni record not found' };
      } else if (error.code === 'ERR_NETWORK') {
        return { success: false, message: 'Network error - please check your connection' };
      } else {
        return { success: false, message: error.response?.data?.message || 'Search failed' };
      }
    }
  };

  // Clear device session (for testing)
  const clearSession = () => {
    setUser(null);
    setIsDeviceRecognized(false);
    localStorage.removeItem('device_fingerprint');
  };

  const value = {
    user,
    isDeviceRecognized,
    loading,
    createDonor,
    updateDonor,
    searchAlumni,
    checkDeviceRecognition,
    clearSession
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};