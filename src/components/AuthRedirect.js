import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FaSpinner } from 'react-icons/fa';

/**
 * Component that redirects users to the appropriate auth page based on device recognition
 * - If device recognized but no donor session → Register
 * - If device recognized and has donor session → Login
 * - If not recognized → Show both options (default to register)
 */
const AuthRedirect = ({ children }) => {
  const { loading, isDeviceRecognized, hasDonorSession, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If already authenticated, redirect to home
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // If device recognized but no donor session, redirect to register
  if (isDeviceRecognized && !hasDonorSession) {
    return <Navigate to="/register" replace />;
  }

  // If device recognized and has donor session, redirect to login
  if (isDeviceRecognized && hasDonorSession) {
    return <Navigate to="/login" replace />;
  }

  // If not recognized, show children (default behavior)
  return children;
};

export default AuthRedirect;

