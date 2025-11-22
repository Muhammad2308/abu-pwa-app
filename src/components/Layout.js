import React, { useState, useEffect, useRef } from 'react';
import { Toaster } from 'react-hot-toast';
import Sidebar from './BottomNavigation';
import abuLogo from '../assets/abu_logo.png'; // Import the logo
import { useNavigate, useLocation } from 'react-router-dom';
import { FaHeart, FaHandHoldingHeart, FaBars, FaChevronDown, FaUser, FaEdit, FaSignOutAlt, FaCog, FaBell, FaTimes, FaSpinner } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import UserProfileModal from './UserProfileModal';
import toast from 'react-hot-toast';
import api, { getBaseUrl } from '../services/api';

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout, logoutLoading, checkSession, checkDeviceRecognition } = useAuth();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const userDropdownRef = useRef(null);
  const notificationsDropdownRef = useRef(null);

  const handleLogoClick = () => {
    // If we're not on the home page, go back to home
    // If we're on the home page, do nothing (or you could add a refresh)
    if (location.pathname !== '/') {
      navigate('/');
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleLogout = async () => {
    setShowUserDropdown(false);
    await logout();
    toast.success('Logged out successfully. You can now login with a different account.');
    // Small delay before navigation to ensure state is cleared
    setTimeout(() => {
      navigate('/login', { replace: true });
    }, 300);
  };

  const handleSettings = () => {
    setShowUserDropdown(false);
    // TODO: Navigate to settings page or open settings modal
    toast.info('Settings feature coming soon!');
  };

  const handleProfileUpdate = async () => {
    // Refresh user data after update
    if (isAuthenticated) {
      await checkSession();
    } else {
      checkDeviceRecognition();
    }
  };

  const fetchNotifications = async (abortController) => {
    if (!isAuthenticated || !user) return;
    setNotificationsLoading(true);
    setNotificationsError(null);
    try {
      const response = await api.get(`/api/donor/${user.id}/messages`, {
        signal: abortController?.signal
      });
      const data = Array.isArray(response.data) ? response.data : response.data?.messages || [];
      setNotifications(data);
    } catch (error) {
      // Ignore aborted requests (component unmounted or navigation)
      if (error.code === 'ECONNABORTED' || error.name === 'AbortError' || error.message === 'Request aborted') {
        return; // Silently ignore aborted requests
      }
      // Ignore 401 errors - user might not be fully authenticated yet, don't trigger redirect
      if (error.response?.status === 401) {
        console.log('Notification fetch: User not authenticated yet, skipping...');
        setNotifications([]);
        return;
      }
      console.error('Notification fetch error:', error);
      setNotificationsError('Unable to load messages right now.');
    } finally {
      setNotificationsLoading(false);
    }
  };

  useEffect(() => {
    // Add a small delay to ensure session is fully established
    let abortController = new AbortController();
    let timeoutId;
    
    if (isAuthenticated && user) {
      // Wait a bit for session to be fully established before fetching
      timeoutId = setTimeout(() => {
        fetchNotifications(abortController);
      }, 500);
    } else {
      setNotifications([]);
    }
    
    // Cleanup: abort request if component unmounts or dependencies change
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      abortController.abort();
    };
  }, [isAuthenticated, user]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
      if (notificationsDropdownRef.current && !notificationsDropdownRef.current.contains(event.target)) {
        setShowNotificationsDropdown(false);
      }
    };

    if (showUserDropdown || showNotificationsDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserDropdown, showNotificationsDropdown]);

  const formatMessageSnippet = (text, length = 60) => {
    if (!text) return '';
    return text.length > length ? `${text.slice(0, length)}…` : text;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pwa-container">
        {/* Header with logo at top-left and Donate button at top-right */}
        <header className="w-full flex items-center justify-between p-4 shadow-sm bg-white sticky top-0 z-30">
          <div className="flex items-center gap-3">
            {/* Hamburger menu button */}
            <button
              onClick={toggleSidebar}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 transition-all duration-150"
              aria-label="Open menu"
            >
              <FaBars className="w-4 h-4 text-gray-600" />
            </button>
            {/* Logo with click functionality and attached text */}
            <button
              onClick={handleLogoClick}
              className="flex items-center transition-transform duration-150 hover:scale-105"
              aria-label="Go to home"
            >
              <img src={abuLogo} alt="ABU Logo" className="h-10 w-auto" />
              <div className="flex flex-col justify-center ml-3 h-10 text-left">
                <span className="text-xs sm:text-sm font-bold leading-tight text-gray-800" style={{lineHeight: '1.1'}}>ABU Endowment</span>
                <span className="text-[10px] sm:text-xs font-bold text-gray-800 leading-none">& Crowd Funding</span>
              </div>
            </button>
          </div>
          
          {/* Notification + User menu or Auth links */}
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              <div className="relative" ref={notificationsDropdownRef}>
                <button
                  onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
                  className="relative flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 transition-all duration-150"
                  aria-label="Notifications"
                  title="Notifications"
                >
                  <FaBell className="w-4 h-4 text-gray-600" />
                  {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold bg-red-500 text-white flex items-center justify-center">
                      {notifications.length > 9 ? '9+' : notifications.length}
                    </span>
                  )}
                </button>
                {showNotificationsDropdown && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Notifications</p>
                        <p className="text-xs text-gray-500">{notifications.length} messages</p>
                      </div>
                      <button
                        onClick={fetchNotifications}
                        className="text-xs text-gray-600 hover:text-gray-700 font-semibold"
                      >
                        Refresh
                      </button>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notificationsLoading ? (
                        <div className="flex items-center justify-center py-6 text-sm text-gray-500">
                          Loading messages...
                        </div>
                      ) : notificationsError ? (
                        <div className="px-4 py-6 text-sm text-red-500">
                          {notificationsError}
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="px-4 py-6 text-sm text-gray-500">
                          No notifications yet.
                        </div>
                      ) : (
                        notifications.map((message) => (
                          <button
                            key={message.id}
                            onClick={() => {
                              setSelectedMessage(message);
                              setShowNotificationsDropdown(false);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                          >
                            <p className="text-sm font-semibold text-gray-900 mb-1 line-clamp-1">
                              {message.subject || 'New Notification'}
                            </p>
                            <p className="text-xs text-gray-500 line-clamp-2">
                              {formatMessageSnippet(message.body || message.message)}
                            </p>
                            <span className="text-[11px] text-gray-400 mt-1 block">
                              {message.date_sent ? new Date(message.date_sent).toLocaleString() : ''}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="relative" ref={userDropdownRef}>
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-3 hover:opacity-80 transition-all duration-150 cursor-pointer"
                aria-label="User Menu"
                title="User Menu"
              >
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-gray-200 bg-white shadow-sm transition-all duration-150 hover:border-gray-300">
                  {/* User Profile Image or Icon */}
                  {user?.profile_image ? (
                    <div className="flex items-center justify-center w-8 h-8 rounded-full overflow-hidden border border-gray-200 bg-blue-50 relative">
                      <img 
                        src={user.profile_image.startsWith('http') ? user.profile_image : `${getBaseUrl()}storage/${user.profile_image}`}
                        alt={user.email || 'User'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback to icon if image fails to load
                          e.target.style.display = 'none';
                          const fallback = e.target.parentElement.querySelector('.fallback-icon');
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                      <div className="hidden fallback-icon absolute inset-0 items-center justify-center bg-blue-50 text-blue-600">
                        <FaUser className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-600">
                      <FaUser className="w-3.5 h-3.5" />
                    </div>
                  )}
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                    <FaChevronDown className="w-3 h-3" />
                  </div>
                </div>
              </button>
              {/* Dropdown Menu */}
              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
                  <>
                    {/* User Email */}
                    {user?.email && (
                      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                        <p className="text-xs text-gray-500 mb-1">Signed in as</p>
                        <p className="text-sm font-medium text-gray-900 truncate">{user.email}</p>
                      </div>
                    )}
                    <button
                      onClick={() => {
                        setShowProfileModal(true);
                        setShowUserDropdown(false);
                      }}
                      className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3 transition-colors"
                    >
                      <FaEdit className="text-base text-blue-600" />
                      <span>Edit Profile</span>
                    </button>
                    <button
                      onClick={handleSettings}
                      className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3 transition-colors"
                    >
                      <FaCog className="text-base text-gray-600" />
                      <span>Settings</span>
                    </button>
                    <button
                      onClick={handleLogout}
                      disabled={logoutLoading}
                      className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors border-t border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {logoutLoading ? (
                        <>
                          <FaSpinner className="text-base animate-spin" />
                          <span>Logging out...</span>
                        </>
                      ) : (
                        <>
                          <FaSignOutAlt className="text-base" />
                          <span>Logout</span>
                        </>
                      )}
                    </button>
                  </>
                </div>
              )}
            </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/login')}
                className="px-4 py-2 rounded-full border border-blue-200 bg-white text-sm font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
              >
                Login
              </button>
              <button
                onClick={() => navigate('/register')}
                className="px-4 py-2 rounded-full bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors shadow"
              >
                Register
              </button>
            </div>
          )}
        </header>
        
        {/* Main content area */}
        <main>
          {children}
        </main>
        
        {/* Sidebar */}
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)}
          onEditProfile={() => setShowProfileModal(true)}
          onSettings={handleSettings}
        />
        
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

        {/* User Profile Modal */}
        {isAuthenticated && user && (
          <UserProfileModal
            isOpen={showProfileModal}
            onClose={() => setShowProfileModal(false)}
            onUpdate={handleProfileUpdate}
          />
        )}

        {/* Message Modal */}
        {selectedMessage && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Message</p>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedMessage.subject || 'Notification'}</h3>
                  {selectedMessage.date_sent && (
                    <p className="text-xs text-gray-500">
                      {new Date(selectedMessage.date_sent).toLocaleString()}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500"
                  aria-label="Close message"
                >
                  <FaTimes className="w-4 h-4" />
                </button>
              </div>
              <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
                <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                  {selectedMessage.body || selectedMessage.message || 'No message content.'}
                </p>
              </div>
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="px-4 py-2 rounded-full text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Layout; 