import React from 'react';
import { Toaster } from 'react-hot-toast';
import BottomNavigation from './BottomNavigation';
import abuLogo from '../assets/abu_logo.png'; // Import the logo
import { useNavigate } from 'react-router-dom';
import { FaHeart, FaHandHoldingHeart } from 'react-icons/fa';

const Layout = ({ children }) => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pwa-container">
        {/* Header with logo at top-left and Donate button at top-right */}
        <header className="w-full flex items-center justify-between p-4 shadow-sm bg-white sticky top-0 z-10">
          <img src={abuLogo} alt="ABU Logo" className="h-10 w-auto" />
          <button
            onClick={() => navigate('/donations')}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-700 font-semibold shadow-sm hover:bg-blue-200 hover:text-blue-900 transition-all duration-150"
            aria-label="Donate"
          >
            <FaHandHoldingHeart className="text-lg" />
            <span>Donate</span>
          </button>
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