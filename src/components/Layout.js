import React from 'react';
import { Toaster } from 'react-hot-toast';
import BottomNavigation from './BottomNavigation';
import abuLogo from '../assets/abu_logo.png'; // Import the logo
import { useNavigate, useLocation } from 'react-router-dom';
import { FaHeart, FaHandHoldingHeart, FaArrowLeft, FaUser } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogoClick = () => {
    // If we're not on the home page, go back to home
    // If we're on the home page, do nothing (or you could add a refresh)
    if (location.pathname !== '/') {
      navigate('/');
    }
  };

  const handleBackClick = () => {
    // Go back to previous page in history
    navigate(-1);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pwa-container">
        {/* Header with logo at top-left and Donate button at top-right */}
        <header className="w-full flex items-center justify-between p-4 shadow-sm bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            {/* Back button - only show if not on home page */}
            {location.pathname !== '/' && (
              <button
                onClick={handleBackClick}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 transition-all duration-150"
                aria-label="Go back"
              >
                <FaArrowLeft className="w-4 h-4 text-gray-600" />
              </button>
            )}
            {/* Logo with click functionality and attached text */}
            <button
              onClick={handleLogoClick}
              className="flex items-center transition-transform duration-150 hover:scale-105"
              aria-label="Go to home"
            >
              <img src={abuLogo} alt="ABU Logo" className="h-10 w-auto" />
              <div className="flex flex-col justify-center ml-3 h-10 text-left">
                <span className="text-sm font-bold leading-tight text-gray-800" style={{lineHeight: '1.1'}}>ABU Endowment</span>
                <span className="text-xs font-bold text-gray-800 leading-none">& Crowd Funding</span>
              </div>
            </button>
          </div>
          
          {/* Welcome message and user info */}
          {isAuthenticated && user && (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-semibold text-blue-600">Welcome, {user.name}!</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100 hover:bg-red-200 transition-all duration-150"
                aria-label="Logout"
                title="Logout"
              >
                <FaUser className="w-4 h-4 text-red-600" />
              </button>
            </div>
          )}
          
          {/* Donate button - only show if not authenticated or on donations page */}
          {(!isAuthenticated || location.pathname !== '/donations') && (
            <button
              onClick={() => navigate('/donations')}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-700 font-semibold shadow-sm hover:bg-blue-200 hover:text-blue-900 transition-all duration-150"
              aria-label="Donate"
            >
              <FaHandHoldingHeart className="text-lg" />
              <span>Donate</span>
            </button>
          )}
        </header>
        
        {/* Main content area with bottom padding for navigation */}
        <main className="pb-20">
          {children}
        </main>
        
        {/* Bottom Navigation */}
        <BottomNavigation />
        
        {/* Toast notifications */}
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#22c55e',
                secondary: '#fff',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </div>
    </div>
  );
};

export default Layout; 