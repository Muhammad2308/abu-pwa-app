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
        toast.success(`Welcome back, ${response.data.donor.name}!`);
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
        
        toast.success('Account created successfully!');
        return { success: true, donor };
      } else {
        toast.error(response.data.message || 'Failed to create account');
        return { success: false, message: response.data.message };
      }
    } catch (error) {
      console.error('Create donor error:', error);
      const message = error.response?.data?.message || 'Failed to create account';
      toast.error(message);
      return { success: false, message };
    }
  };

  // Update donor record
  const updateDonor = async (donorId, donorData) => {
    try {
      const response = await api.put(`/api/donors/${donorId}`, donorData);
      
      if (response.data.success) {
        const donor = response.data.donor;
        setUser(donor);
        setIsDeviceRecognized(true);
        
        // Create device session
        await api.post('/api/device/session', {
          device_fingerprint: getDeviceFingerprint(),
          donor_id: donor.id
        });
        
        toast.success('Profile updated successfully!');
        return { success: true, donor };
      } else {
        toast.error(response.data.message || 'Failed to update profile');
        return { success: false, message: response.data.message };
      }
    } catch (error) {
      console.error('Update donor error:', error);
      const message = error.response?.data?.message || 'Failed to update profile';
      toast.error(message);
      return { success: false, message };
    }
  };

  // Search addressable alumni
  const searchAlumni = async (regNumber) => {
    try {
      const response = await api.get(`/api/donors/search/${regNumber}`);
      
      if (response.data.success) {
        return { success: true, donor: response.data.donor };
      } else {
        return { success: false, message: 'Alumni not found' };
      }
    } catch (error) {
      console.error('Search alumni error:', error);
      return { success: false, message: 'Alumni not found' };
    }
  };

  // Clear device session (for testing)
  const clearSession = () => {
    setUser(null);
    setIsDeviceRecognized(false);
    localStorage.removeItem('device_fingerprint');
    toast.success('Session cleared');
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