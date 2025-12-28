import React, { useState, useEffect, useRef } from 'react';
import { Toaster } from 'react-hot-toast';
import Sidebar from './BottomNavigation';
import abuLogo from '../assets/abu_logo.png'; // Import the logo
import { useNavigate, useLocation } from 'react-router-dom';
import { FaHeart, FaHandHoldingHeart, FaBars, FaChevronDown, FaUser, FaEdit, FaSignOutAlt, FaCog, FaBell, FaTimes, FaSpinner, FaEnvelope, FaPaperPlane, FaInbox } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import UserProfileModal from './UserProfileModal';
import toast from 'react-hot-toast';
import api, { getBaseUrl, messagesAPI } from '../services/api';

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
  const [unreadCount, setUnreadCount] = useState(0);

  // Messages Modal State
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [activeTab, setActiveTab] = useState('received'); // 'received' or 'sent'
  const [receivedMessages, setReceivedMessages] = useState([]);
  const [sentMessages, setSentMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);

  const userDropdownRef = useRef(null);
  const notificationsDropdownRef = useRef(null);

  const handleLogoClick = () => {
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
    toast.success('Logged out successfully.');
    setTimeout(() => {
      navigate('/', { replace: true });
    }, 300);
  };

  const handleSettings = () => {
    setShowUserDropdown(false);
    toast.info('Settings feature coming soon!');
  };

  const handleProfileUpdate = async () => {
    if (isAuthenticated) {
      await checkSession();
    } else {
      checkDeviceRecognition();
    }
  };

  const fetchNotifications = async () => {
    if (!isAuthenticated || !user) return;
    setNotificationsLoading(true);
    try {
      const response = await messagesAPI.getReceived();
      const data = Array.isArray(response.data.data) ? response.data.data : response.data || [];
      setNotifications(data.slice(0, 5)); // Show last 5

      const unreadResponse = await messagesAPI.getUnreadCount();
      setUnreadCount(unreadResponse.data.count || 0);
    } catch (error) {
      // Silently handle 404 if messaging is not yet implemented on backend
      if (error.response?.status !== 404) {
        console.error('Notification fetch error:', error);
      }
    } finally {
      setNotificationsLoading(false);
    }
  };

  const fetchAllMessages = async () => {
    if (!isAuthenticated || !user) return;
    setMessagesLoading(true);
    try {
      const [receivedRes, sentRes] = await Promise.all([
        messagesAPI.getReceived().catch(e => ({ data: [] })),
        messagesAPI.getSent().catch(e => ({ data: [] }))
      ]);
      setReceivedMessages(Array.isArray(receivedRes.data.data) ? receivedRes.data.data : receivedRes.data || []);
      setSentMessages(Array.isArray(sentRes.data.data) ? sentRes.data.data : sentRes.data || []);
    } catch (error) {
      console.error('Messages fetch error:', error);
    } finally {
      setMessagesLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 60000); // Refresh every 60s instead of 30s to reduce 404 spam
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (showMessagesModal) {
      fetchAllMessages();
    }
  }, [showMessagesModal]);

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
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserDropdown, showNotificationsDropdown]);

  const formatMessageSnippet = (text, length = 60) => {
    if (!text) return '';
    return text.length > length ? `${text.slice(0, length)}…` : text;
  };

  const markAsRead = async (messageId) => {
    try {
      await messagesAPI.markAsRead(messageId);
      fetchNotifications();
      if (showMessagesModal) fetchAllMessages();
    } catch (error) {
      console.error('Mark as read error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pwa-container">
        {/* Header with green background */}
        <header className="w-full bg-abu-green text-white sticky top-0 z-30">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              {/* Hamburger menu button */}
              <button
                onClick={toggleSidebar}
                className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/10 transition-all duration-150"
                aria-label="Open menu"
              >
                <FaBars className="w-4 h-4 text-white" />
              </button>
              {/* Logo with click functionality and attached text */}
              <button
                onClick={handleLogoClick}
                className="flex items-center transition-transform duration-150 hover:scale-105"
                aria-label="Go to home"
              >
                <div className="bg-white p-1 rounded-lg">
                  <img src={abuLogo} alt="ABU Logo" className="h-8 w-auto" />
                </div>
                <div className="flex flex-col justify-center ml-3 h-10 text-left">
                  <span className="text-xs sm:text-sm font-bold leading-tight text-white" style={{ lineHeight: '1.1' }}>ABU Endowment</span>
                  <span className="text-[10px] sm:text-xs font-bold text-white/90 leading-none">& Crowd Funding</span>
                </div>
              </button>
            </div>

            {/* Notification + User menu or Auth links */}
            <div className="flex items-center gap-3">
              {isAuthenticated && user ? (
                <>
                  <div className="relative" ref={notificationsDropdownRef}>
                    <button
                      onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
                      className="relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/10 transition-all duration-150"
                      aria-label="Notifications"
                    >
                      <FaBell className="w-4 h-4 text-white" />
                      {unreadCount > 0 && (
                        <span className="absolute top-2 right-2 w-4 h-4 flex items-center justify-center rounded-full bg-red-500 text-[8px] font-bold border border-abu-green">
                          {unreadCount}
                        </span>
                      )}
                    </button>
                    {showNotificationsDropdown && (
                      <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden text-gray-900">
                        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">Messages</p>
                            <p className="text-xs text-gray-500">{unreadCount} unread</p>
                          </div>
                          <button onClick={() => { setShowMessagesModal(true); setShowNotificationsDropdown(false); }} className="text-xs text-abu-green font-bold hover:underline">View All</button>
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                          {notifications.length === 0 ? (
                            <div className="px-4 py-8 text-sm text-gray-500 text-center flex flex-col items-center gap-2">
                              <FaEnvelope className="w-8 h-8 text-gray-200" />
                              <p>No messages yet.</p>
                            </div>
                          ) : (
                            notifications.map((msg) => (
                              <button
                                key={msg.id}
                                onClick={() => {
                                  setSelectedMessage(msg);
                                  setShowNotificationsDropdown(false);
                                  if (!msg.is_read) markAsRead(msg.id);
                                }}
                                className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 flex gap-3 ${!msg.is_read ? 'bg-abu-green-light/30' : ''}`}
                              >
                                <div className="w-10 h-10 rounded-full bg-abu-green-light flex items-center justify-center flex-shrink-0 text-abu-green">
                                  <FaUser className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-start mb-1">
                                    <p className="text-xs font-bold text-gray-900 truncate">
                                      {msg.sender ? `${msg.sender.name} ${msg.sender.surname}` : 'System'}
                                    </p>
                                    <p className="text-[8px] text-gray-400 whitespace-nowrap">
                                      {new Date(msg.created_at).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <p className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed">{msg.content}</p>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                        <div className="p-3 border-t border-gray-100 text-center">
                          <button
                            onClick={() => { setShowMessagesModal(true); setShowNotificationsDropdown(false); }}
                            className="text-xs font-bold text-gray-500 hover:text-abu-green transition-colors"
                          >
                            Open Message Center
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="relative" ref={userDropdownRef}>
                    <button
                      onClick={() => setShowUserDropdown(!showUserDropdown)}
                      className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/10 transition-all duration-150"
                    >
                      {user?.profile_image ? (
                        <img
                          src={user.profile_image.startsWith('http') ? user.profile_image : `${getBaseUrl()}storage/${user.profile_image}`}
                          className="w-8 h-8 rounded-full object-cover border border-white/20"
                          alt="Profile"
                        />
                      ) : (
                        <FaUser className="w-4 h-4 text-white" />
                      )}
                    </button>
                    {showUserDropdown && (
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden text-gray-900">
                        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                          <p className="text-xs text-gray-500 mb-1">Signed in as</p>
                          <p className="text-sm font-medium text-gray-900 truncate">{user.email}</p>
                        </div>
                        <button onClick={() => { setShowProfileModal(true); setShowUserDropdown(false); }} className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"><FaEdit className="text-abu-green" /><span>Edit Profile</span></button>
                        <button onClick={() => { setShowMessagesModal(true); setShowUserDropdown(false); }} className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"><FaEnvelope className="text-abu-green" /><span>Messages</span></button>
                        <button onClick={handleLogout} className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 border-t border-gray-100"><FaSignOutAlt /><span>Logout</span></button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={() => navigate('/login')} className="text-xs font-bold text-white hover:underline">Login</button>
                  <span className="text-white/30">|</span>
                  <button onClick={() => navigate('/register')} className="text-xs font-bold text-white hover:underline">Register</button>
                </div>
              )}
            </div>
          </div>
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
          user={user}
          isAuthenticated={isAuthenticated}
          logout={handleLogout}
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

        {/* Messages Center Modal */}
        {showMessagesModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-white w-full max-w-2xl rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-abu-green-light flex items-center justify-center text-abu-green">
                    <FaEnvelope className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Message Center</h3>
                    <p className="text-xs text-gray-500">Connect with fellow alumni</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowMessagesModal(false)}
                  className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <FaTimes />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-gray-100">
                <button
                  onClick={() => setActiveTab('received')}
                  className={`flex-1 py-4 text-sm font-bold transition-all border-b-2 flex items-center justify-center gap-2 ${activeTab === 'received' ? 'border-abu-green text-abu-green bg-abu-green-light/10' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                >
                  <FaInbox className="w-4 h-4" />
                  Received
                </button>
                <button
                  onClick={() => setActiveTab('sent')}
                  className={`flex-1 py-4 text-sm font-bold transition-all border-b-2 flex items-center justify-center gap-2 ${activeTab === 'sent' ? 'border-abu-green text-abu-green bg-abu-green-light/10' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                >
                  <FaPaperPlane className="w-4 h-4" />
                  Sent
                </button>
              </div>

              <div className="flex-grow overflow-y-auto p-6 custom-scrollbar min-h-[400px]">
                {messagesLoading ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <FaSpinner className="w-10 h-10 text-abu-green animate-spin mb-4" />
                    <p className="text-sm text-gray-500">Loading messages...</p>
                  </div>
                ) : (activeTab === 'received' ? receivedMessages : sentMessages).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                      {activeTab === 'received' ? <FaInbox className="w-8 h-8 text-gray-200" /> : <FaPaperPlane className="w-8 h-8 text-gray-200" />}
                    </div>
                    <h4 className="text-base font-bold text-gray-900 mb-1">No {activeTab} messages</h4>
                    <p className="text-xs text-gray-400">Your {activeTab} messages will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(activeTab === 'received' ? receivedMessages : sentMessages).map((msg) => (
                      <div
                        key={msg.id}
                        onClick={() => { setSelectedMessage(msg); if (activeTab === 'received' && !msg.is_read) markAsRead(msg.id); }}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer ${!msg.is_read && activeTab === 'received' ? 'bg-abu-green-light/20 border-abu-green/20' : 'bg-white border-gray-100 hover:border-abu-green/20'}`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                              <FaUser className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900">
                                {activeTab === 'received'
                                  ? (msg.sender ? `${msg.sender.name} ${msg.sender.surname}` : 'System')
                                  : (msg.receiver ? `${msg.receiver.name} ${msg.receiver.surname}` : 'Unknown')}
                              </p>
                              <p className="text-[10px] text-gray-400">{new Date(msg.created_at).toLocaleString()}</p>
                            </div>
                          </div>
                          {!msg.is_read && activeTab === 'received' && (
                            <span className="px-2 py-0.5 rounded-full bg-abu-green text-white text-[8px] font-bold uppercase">New</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100">
                <button
                  onClick={() => setShowMessagesModal(false)}
                  className="w-full py-4 rounded-2xl bg-abu-green text-white font-bold text-sm shadow-lg shadow-abu-green/20"
                >
                  Close Message Center
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Individual Message Detail Modal */}
        {selectedMessage && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-abu-green-light flex items-center justify-center text-abu-green">
                    <FaEnvelope className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Message</h3>
                    <p className="text-[10px] text-gray-500">
                      {activeTab === 'received' ? 'From: ' : 'To: '}
                      {activeTab === 'received'
                        ? (selectedMessage.sender ? `${selectedMessage.sender.name} ${selectedMessage.sender.surname}` : 'System')
                        : (selectedMessage.receiver ? `${selectedMessage.receiver.name} ${selectedMessage.receiver.surname}` : 'Unknown')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <FaTimes />
                </button>
              </div>
              <div className="p-8 max-h-[50vh] overflow-y-auto">
                <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                  {selectedMessage.content}
                </p>
              </div>
              <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3">
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="flex-1 py-3 rounded-xl bg-abu-green text-white font-bold text-sm"
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