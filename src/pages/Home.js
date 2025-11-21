import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { formatNaira, donationsAPI, donorsAPI } from '../services/api';
import { ArrowUpRightIcon, UserPlusIcon, ClockIcon } from '@heroicons/react/24/outline';
import { FaUser, FaUserPlus, FaEdit, FaSignOutAlt, FaCog } from 'react-icons/fa';
import api from '../services/api';
import { FaHandHoldingHeart, FaProjectDiagram, FaAddressBook, FaTimes, FaEye, FaChevronRight } from 'react-icons/fa';
import { getBaseUrl } from '../services/api';
import { useLocation, useNavigate } from 'react-router-dom';
import { getDeviceFingerprint } from '../utils/deviceFingerprint';
import toast from 'react-hot-toast';
import UserProfileModal from '../components/UserProfileModal';

const notifications = [
  { id: 1, message: 'Thank you for your recent donation!', time: '2h ago' },
  { id: 2, message: 'New project: Library Expansion', time: '1d ago' },
];

const Home = () => {
  const { user, isDeviceRecognized, checkDeviceRecognition, logout, isAuthenticated, checkSession } = useAuth();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const userDropdownRef = React.useRef(null);

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  // Add missing state declarations
  const [totalDonated, setTotalDonated] = useState(0);
  const [debugInfo, setDebugInfo] = useState({ fingerprint: '', history: null });
  // Removed animationDuration state, no auto animation
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState(null);
  // Tab state - default to My Donations tab
  const [activeTab, setActiveTab] = useState('contact');
  // Donation history state for Contact tab (changed from donors)
  const [donationHistory, setDonationHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);

  // Get location state for thank you message - must be declared early
  const location = useLocation();
  const navigate = useNavigate();
  const thankYou = location.state?.thankYou;

  // Fetch donation history when Contact tab is active or history modal opens
  useEffect(() => {
    if ((activeTab === 'contact' || showHistoryModal) && user && isDeviceRecognized) {
      setHistoryLoading(true);
      setHistoryError(null);
      donationsAPI.getHistory()
        .then(res => {
          const donations = res.data.donations || res.data || [];
          // Sort by most recent first
          const sorted = donations.sort((a, b) => {
            return new Date(b.created_at || b.createdAt || b.date) - new Date(a.created_at || a.createdAt || a.date);
          });
          setDonationHistory(sorted);
          
          // Also update total donated from history
          const sum = sorted.reduce((acc, d) => acc + Number(d.amount || 0), 0);
          setTotalDonated(sum);
          
          setHistoryLoading(false);
        })
        .catch(err => {
          setHistoryError('Failed to load donation history');
          setHistoryLoading(false);
          console.error('Donation history error:', err);
        });
    } else if ((activeTab === 'contact' || showHistoryModal) && !user) {
      setDonationHistory([]);
      setHistoryError(null);
    }
  }, [activeTab, showHistoryModal, user, isDeviceRecognized, thankYou]); // Refresh when thankYou state changes or modal opens


  // Helper to get single image for a project (icon_image, or fallback to first body_image)
  const getProjectImage = (project) => {
    const baseUrl = getBaseUrl();
    
    // First priority: icon_image (check if it exists and is not empty)
    const iconImage = project.icon_image || project.icon_image_path;
    if (iconImage && iconImage.trim() !== '') {
      const iconPath = iconImage;
      // If it's already a full URL, return as is
      if (iconPath.startsWith('http://') || iconPath.startsWith('https://')) {
        return iconPath;
      }
      // If it already starts with storage/, don't add it again
      if (iconPath.startsWith('storage/') || iconPath.startsWith('/storage/')) {
        return baseUrl + (iconPath.startsWith('/') ? iconPath.slice(1) : iconPath);
      }
      // Otherwise, add storage/ prefix
      return baseUrl + 'storage/' + iconPath;
    }
    
    // Second priority: first body_image from project_photos table
    if (project.photos && Array.isArray(project.photos) && project.photos.length > 0) {
      for (const photo of project.photos) {
        const bodyImage = photo.body_image || photo.body_image_path;
        if (bodyImage && bodyImage.trim() !== '') {
          const bodyPath = bodyImage;
          // If it's already a full URL, return as is
          if (bodyPath.startsWith('http://') || bodyPath.startsWith('https://')) {
            return bodyPath;
          }
          // If it already starts with storage/, don't add it again
          if (bodyPath.startsWith('storage/') || bodyPath.startsWith('/storage/')) {
            return baseUrl + (bodyPath.startsWith('/') ? bodyPath.slice(1) : bodyPath);
          }
          // Otherwise, add storage/ prefix
          return baseUrl + 'storage/' + bodyPath;
        }
      }
    }
    
    // Fallback: placeholder
    return 'https://via.placeholder.com/400x200?text=No+Image';
  };

  // Handle thank you message and refresh donations
  useEffect(() => {
    if (thankYou) {
      // Show success toast
      toast.success(
        `Thank you for your donation of ${formatNaira(thankYou.amount)} to ${thankYou.project}! 🎉`,
        { duration: 5000 }
      );
      
      // Refresh donations history to update total
      if (user && isDeviceRecognized) {
        const cacheKey = `abu_totalDonated_${user.id}`;
        donationsAPI.getHistory().then(res => {
          const donations = res.data.donations || [];
          const sum = donations.reduce((acc, d) => acc + Number(d.amount || 0), 0);
          setTotalDonated(sum);
          localStorage.setItem(cacheKey, sum);
        }).catch(() => {
          // Silent fail - don't show error
        });
      }
      
      // Clear location state to prevent showing message again on refresh
      window.history.replaceState({}, document.title);
    }
  }, [thankYou, user, isDeviceRecognized]);

  // On mount, try to load projects and totalDonated from localStorage
  useEffect(() => {
    // Clear cache to ensure fresh data after deletions
    localStorage.removeItem('abu_projects');
    
    setLoading(true);
    api.get('/api/projects')
      .then(res => {
        // Filter out deleted projects (only show projects where deleted_at is NULL)
        const activeProjects = res.data.filter(project => project.deleted_at === null || project.deleted_at === undefined);
        setProjects(activeProjects);
        localStorage.setItem('abu_projects', JSON.stringify(activeProjects));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // When projects update, update cache
  useEffect(() => {
    if (projects && projects.length > 0) {
      localStorage.setItem('abu_projects', JSON.stringify(projects));
    }
  }, [projects]);

  // For totalDonated, cache per user
  useEffect(() => {
    if (user && isDeviceRecognized) {
      const cacheKey = `abu_totalDonated_${user.id}`;
      const cachedTotal = localStorage.getItem(cacheKey);
      if (cachedTotal !== null) {
        setTotalDonated(Number(cachedTotal));
      }
      const fingerprint = getDeviceFingerprint();
      donationsAPI.getHistory().then(res => {
        const donations = res.data.donations || [];
        const sum = donations.reduce((acc, d) => acc + Number(d.amount || 0), 0);
        setTotalDonated(sum);
        localStorage.setItem(cacheKey, sum);
        setDebugInfo({ fingerprint, history: res.data });
      }).catch((err) => {
        setTotalDonated(0);
        setDebugInfo({ fingerprint, history: err?.response?.data || err.message });
      });
    } else {
      setTotalDonated(0);
      setDebugInfo({ fingerprint: getDeviceFingerprint(), history: null });
    }
  }, [user, isDeviceRecognized]);

  // Fetch donor messages
  useEffect(() => {
    if (user && user.id) {
      setMessagesLoading(true);
      api.get(`/api/donor/${user.id}/messages`)
        .then(res => {
          setMessages(res.data || []);
          setMessagesLoading(false);
        })
        .catch(err => {
          setMessagesError('Failed to load messages');
          setMessagesLoading(false);
        });
    }
  }, [user]);

  // Removed redirect logic to allow access to Home page


  // Handle logout
  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to logout? Another user can then login on this device.')) {
      await logout();
      toast.success('Logged out successfully. You can now login with a different account.');
      navigate('/login', { replace: true });
    }
  };

  // Handle profile update
  const handleProfileUpdate = async () => {
    // Refresh user data after update - check session to get latest user data
    if (isAuthenticated) {
      // If authenticated, check session to refresh user data
      await checkSession();
      // Force a small delay to ensure state is updated
      setTimeout(() => {
        console.log('User after profile update:', user);
      }, 100);
    } else {
      // If not authenticated, check device recognition
      checkDeviceRecognition();
    }
    
    // Refresh donation history if on donations tab
    if (activeTab === 'contact' && user && isDeviceRecognized) {
      donationsAPI.getHistory()
        .then(res => {
          const donations = res.data.donations || res.data || [];
          const sorted = donations.sort((a, b) => {
            return new Date(b.created_at || b.createdAt || b.date) - new Date(a.created_at || a.createdAt || a.date);
          });
          setDonationHistory(sorted);
          const sum = sorted.reduce((acc, d) => acc + Number(d.amount || 0), 0);
          setTotalDonated(sum);
        })
        .catch(() => {
          // Silent fail
        });
    }
  };

  // Handle Settings click
  const handleSettings = () => {
    setShowUserDropdown(false);
    // TODO: Navigate to settings page or open settings modal
    toast.info('Settings feature coming soon!');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
    };

    if (showUserDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserDropdown]);

  // --- Slider Auto Scroll Logic ---
  // Remove timer-based slider scroll useEffect

  return (
    <div className="space-y-6 pt-4 pb-20">
      {/* OPay-Style Balance Card - Always visible */}
      <div className="mx-4">
        <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 rounded-2xl shadow-2xl p-6 text-white relative overflow-hidden w-full">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-5 rounded-full -mr-20 -mt-20"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-5 rounded-full -ml-16 -mb-16"></div>
          
          <div className="relative z-10">
            {/* Top Section */}
            <div className="flex items-center justify-between mb-6">
              {/* Left: My Donations */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium opacity-90">My Donations</span>
                {user && isDeviceRecognized && <FaEye className="w-4 h-4 opacity-75" />}
              </div>
              {/* Right: Transaction History - Always visible */}
              <button
                onClick={() => {
                  if (user && isDeviceRecognized) {
                    setShowHistoryModal(true);
                  } else {
                    toast.info('Please login to view your transaction history');
                  }
                }}
                className="flex items-center gap-1 text-sm font-medium opacity-90 hover:opacity-100 transition-opacity"
              >
                <span>History</span>
                <FaChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* Balance Amount */}
            <div className="flex items-center gap-2 mb-4">
              <div className="text-3xl font-bold">{formatNaira(user && isDeviceRecognized ? totalDonated : 0)}</div>
              <FaChevronRight className="w-4 h-4 opacity-75" />
            </div>

            {/* Progress Bar - Inside Card - Always visible */}
            <div className="w-full mb-6">
              <div className="flex h-2.5 rounded-full overflow-hidden bg-white bg-opacity-20 border border-white border-opacity-30 shadow-inner">
                {/* Tier 1: 1 - 100,000 */}
                <div className={`flex-1 transition-colors duration-300 ${
                  (user && isDeviceRecognized && totalDonated >= 1) ? 'bg-white bg-opacity-40' : 'bg-white bg-opacity-10'
                }`}></div>
                {/* Tier 2: 100,000 - 999,999 */}
                <div className={`flex-1 transition-colors duration-300 ${
                  (user && isDeviceRecognized && totalDonated >= 100000) ? 'bg-orange-300 bg-opacity-80' : 'bg-white bg-opacity-10'
                }`}></div>
                {/* Tier 3: 1,000,000+ */}
                <div className={`flex-1 transition-colors duration-300 ${
                  (user && isDeviceRecognized && totalDonated >= 1000000) ? 'bg-green-300 bg-opacity-90' : 'bg-white bg-opacity-10'
                }`}></div>
              </div>
              {/* Tier labels */}
              <div className="flex justify-between text-[10px] mt-2 px-1">
                <span className="text-white opacity-80 font-semibold">Tier 1</span>
                <span className="text-white opacity-80 font-semibold">Tier 2</span>
                <span className="text-white opacity-80 font-semibold">Tier 3</span>
              </div>
            </div>

            {/* Bottom Section: Donate Button */}
            <div className="flex justify-end">
              <button
                onClick={() => {
                  if (user && isDeviceRecognized) {
                    navigate('/donations');
                  } else {
                    navigate('/register');
                  }
                }}
                className="bg-white text-blue-600 px-6 py-3 rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center gap-2"
              >
                <FaHandHoldingHeart className="text-base" />
                <span>Donate</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Rest of content with margin */}
      <div className="mx-4 space-y-6">

      {/* Projects Section - Always Visible (Advertisement) */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Featured Projects</h3>
          <a href="/projects" className="text-primary-600 text-sm font-medium hover:underline">See all</a>
        </div>
        <div 
          className="overflow-y-auto border border-gray-200 rounded-lg bg-gray-50"
          style={{ height: '400px' }}
        >
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : projects.length === 0 ? (
            <div className="text-center py-8">No projects found.</div>
          ) : (
            <div className="flex flex-col gap-6 p-4">
              {projects.map((project) => {
                const projectImage = getProjectImage(project);
                // Get raised amount - check multiple possible field names
                const raisedAmount = Number(
                  project.amount || 
                  project.current_amount || 
                  project.raised_amount || 
                  0
                );
                // Get target amount
                const targetAmount = Number(project.target_amount || 0);
                // Calculate progress percentage (0-100)
                const progressPercentage = targetAmount > 0 
                  ? Math.min((raisedAmount / targetAmount) * 100, 100) 
                  : 0;
                // Show as urgent if progress is less than 50% and has started
                const isUrgent = progressPercentage > 0 && progressPercentage < 50;
                // Show as completed if progress is 100% or more
                const isCompleted = progressPercentage >= 100;
                
                return (
                  <div
                    key={project.id}
                    className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 transform hover:-translate-y-1"
                  >
                    {/* Image Section with Overlay */}
                    <div className="relative h-48 overflow-hidden bg-gray-200">
                      <img
                        src={projectImage}
                        alt={project.project_title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        onError={(e) => {
                          console.error('Image load error for project:', project.project_title, 'URL:', e.target.src);
                          console.error('Project data:', { 
                            icon_image: project.icon_image, 
                            photos: project.photos,
                            baseUrl: getBaseUrl()
                          });
                          e.target.src = 'https://via.placeholder.com/400x200?text=No+Image';
                        }}
                      />
                      {/* Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                      
                      {/* Status Badges */}
                      {isCompleted && (
                        <div className="absolute top-3 right-3 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                          ✅ Goal Reached!
                        </div>
                      )}
                      {isUrgent && !isCompleted && (
                        <div className="absolute top-3 right-3 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg animate-pulse">
                          🔥 Needs Support
                        </div>
                      )}
                      
                      {/* Project Title on Image */}
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <h3 className="text-white font-bold text-xl mb-1 drop-shadow-lg line-clamp-2">
                          {project.project_title}
                        </h3>
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="p-5">
                      {/* Description */}
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2 min-h-[2.5rem]">
                        {project.project_description}
                      </p>

                      {/* Progress Section */}
                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                              isCompleted ? 'bg-green-500' : 
                              isUrgent ? 'bg-red-500 animate-pulse' : 
                              'bg-blue-500 animate-pulse'
                            }`}></div>
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Progress</span>
                          </div>
                          <span className={`text-xs font-bold ${
                            isCompleted ? 'text-green-600' : 'text-primary-600'
                          }`}>
                            {targetAmount > 0 
                              ? `${Math.round(progressPercentage)}%` 
                              : raisedAmount > 0 
                                ? 'Active' 
                                : 'New Project'}
                          </span>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 relative overflow-hidden shadow-sm ${
                              isCompleted 
                                ? 'bg-gradient-to-r from-green-500 via-green-600 to-emerald-600' 
                                : 'bg-gradient-to-r from-blue-500 via-blue-600 to-purple-600'
                            }`}
                            style={{ width: `${Math.max(progressPercentage, 2)}%` }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                          </div>
                        </div>
                        
                        {/* Amount Display */}
                        <div className="flex justify-between items-center mt-3">
                          <div>
                            <p className="text-xs text-gray-500 mb-0.5">Raised</p>
                            <p className="text-lg font-bold text-gray-900">{formatNaira(raisedAmount)}</p>
                          </div>
                          {targetAmount > 0 && (
                            <div className="text-right">
                              <p className="text-xs text-gray-500 mb-0.5">Goal</p>
                              <p className="text-lg font-bold text-primary-600">{formatNaira(targetAmount)}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* CTA Button */}
                      <button
                        onClick={() => window.location.href = `/donations?project=${encodeURIComponent(project.project_title)}`}
                        className="w-full bg-gradient-to-r from-blue-600 via-blue-700 to-purple-600 text-white py-3.5 px-6 rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 group/btn relative overflow-hidden"
                      >
                        <span className="relative z-10 flex items-center gap-2">
                          <FaHandHoldingHeart className="text-base group-hover/btn:scale-110 transition-transform" />
                          <span>Support This Project</span>
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-blue-700 to-blue-600 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                      </button>

                      {/* Impact Message */}
                      <p className="text-center text-xs text-gray-400 mt-3 italic">
                        Every contribution makes a difference 💙
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
        <button
          onClick={() => setActiveTab('contact')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'contact'
              ? 'bg-white text-primary-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <FaHandHoldingHeart className="text-base" />
          My Donations
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'notifications'
              ? 'bg-white text-primary-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <ClockIcon className="h-5 w-5" />
          Notifications
        </button>
        {/* User Dropdown Button */}
        <div className="relative flex-1" ref={userDropdownRef}>
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className={`w-full py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              showUserDropdown
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            aria-label="User Menu"
          >
            <FaUser className="text-base" />
          </button>
          {/* Dropdown Menu */}
          {showUserDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
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
                onClick={() => {
                  setShowUserDropdown(false);
                  handleLogout();
                }}
                className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors border-t border-gray-200"
              >
                <FaSignOutAlt className="text-base" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className="mb-24">
        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <ClockIcon className="h-5 w-5 text-primary-600" />
              <h3 className="text-lg font-semibold">Notifications</h3>
            </div>
            <ul className="divide-y divide-gray-100 bg-white rounded-lg shadow h-64 overflow-y-auto">
              {messagesLoading ? (
                <li className="px-4 py-2 text-center text-gray-500">Loading messages...</li>
              ) : messagesError ? (
                <li className="px-4 py-2 text-center text-red-500">{messagesError}</li>
              ) : messages && messages.length > 0 ? (
                messages.map((msg, idx) => (
                  <li key={msg.id || idx} className="px-4 py-2">
                    {msg.subject && (
                      <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full mb-2 mr-2 align-middle">
                        {msg.subject}
                      </span>
                    )}
                    <div className="bg-blue-50 text-blue-900 rounded-lg px-3 py-2 mb-1 mt-1" style={{marginTop: msg.subject ? '0.25rem' : 0}}>
                      {msg.body || msg.message}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">{msg.date_sent ? new Date(msg.date_sent).toLocaleString() : ''}</div>
                  </li>
                ))
              ) : (
                <li className="px-4 py-2 text-center text-gray-400">No messages</li>
              )}
            </ul>
          </div>
        )}

        {/* My Donations Tab */}
        {activeTab === 'contact' && (
          <div>
            {!user || !isDeviceRecognized ? (
              <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                  <FaHandHoldingHeart className="text-3xl text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Donation History</h3>
                <p className="text-gray-600 mb-6">Please login or make a donation to view your donation history</p>
                <button
                  onClick={() => navigate('/donations')}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all transform hover:scale-105 shadow-lg font-semibold"
                >
                  Make a Donation
                </button>
              </div>
            ) : (
              <>
                {/* Summary Card with enhanced design */}
                <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-purple-600 rounded-2xl shadow-2xl p-6 mb-6 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-10 rounded-full -ml-12 -mb-12"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold opacity-90 mb-1">Total Contributions</h3>
                        <div className="text-4xl font-bold">{formatNaira(totalDonated)}</div>
                      </div>
                      <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center backdrop-blur-sm">
                        <FaHandHoldingHeart className="text-2xl" />
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white border-opacity-20">
                      <div className="flex-1">
                        <div className="text-2xl font-bold">{donationHistory.length}</div>
                        <div className="text-xs opacity-80">Total Donations</div>
                      </div>
                      <div className="flex-1">
                        <div className="text-2xl font-bold">
                          {donationHistory.filter(d => d.status === 'success').length}
                        </div>
                        <div className="text-xs opacity-80">Successful</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Donation History */}
                {historyLoading ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
                    <p className="mt-4 text-gray-500 font-medium">Loading your donations...</p>
                  </div>
                ) : historyError ? (
                  <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 text-center">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-red-600 text-xl">⚠️</span>
                    </div>
                    <p className="text-red-600 font-semibold mb-2">Error Loading Donations</p>
                    <p className="text-red-500 text-sm">{historyError}</p>
                    <button
                      onClick={() => setActiveTab('contact')}
                      className="mt-4 text-blue-600 hover:text-blue-700 font-medium text-sm"
                    >
                      Try Again
                    </button>
                  </div>
                ) : donationHistory.length === 0 ? (
                  <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                    <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                      <FaHandHoldingHeart className="text-3xl text-blue-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No Donations Yet</h3>
                    <p className="text-gray-600 mb-6">Start making a difference today!</p>
                    <button
                      onClick={() => navigate('/donations')}
                      className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all transform hover:scale-105 shadow-lg font-semibold"
                    >
                      Make Your First Donation
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Recent Donations</h4>
                      <span className="text-xs text-gray-500">{donationHistory.length} items</span>
                    </div>
                    {donationHistory.map((donation, index) => {
                      const date = new Date(donation.created_at || donation.createdAt || donation.date);
                      const formattedDate = date.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      });
                      const formattedTime = date.toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        hour12: true
                      });
                      const projectName = donation.project?.project_title || donation.project_title || 'Endowment Fund';
                      const isProject = donation.project_id || donation.project?.id;
                      const isSuccess = donation.status === 'success' || !donation.status;
                      const statusColor = isSuccess ? 'green' : donation.status === 'pending' ? 'yellow' : 'red';
                      
                      return (
                        <div
                          key={donation.id || index}
                          className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-5 border-l-4 border-blue-500 transform hover:-translate-y-1"
                        >
                          <div className="flex items-start gap-4">
                            {/* Icon */}
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                              isProject ? 'bg-gradient-to-br from-purple-100 to-purple-200' : 'bg-gradient-to-br from-blue-100 to-blue-200'
                            }`}>
                              {isProject ? (
                                <FaProjectDiagram className="text-xl text-purple-600" />
                              ) : (
                                <FaHandHoldingHeart className="text-xl text-blue-600" />
                              )}
                            </div>
                            
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex-1">
                                  <h4 className="font-bold text-gray-900 text-base mb-1 line-clamp-1">
                                    {projectName}
                                  </h4>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <div className="flex items-center gap-1 text-xs text-gray-500">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                      <span>{formattedDate}</span>
                                    </div>
                                    <span className="text-gray-300">•</span>
                                    <div className="flex items-center gap-1 text-xs text-gray-500">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      <span>{formattedTime}</span>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Amount & Status */}
                                <div className="text-right flex-shrink-0">
                                  <div className="text-xl font-bold text-blue-600 mb-1">
                                    {formatNaira(donation.amount)}
                                  </div>
                                  <div className={`text-xs px-2.5 py-1 rounded-full font-semibold inline-block ${
                                    isSuccess
                                      ? 'bg-green-100 text-green-700' 
                                      : donation.status === 'pending'
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : 'bg-red-100 text-red-700'
                                  }`}>
                                    {isSuccess ? '✓ Success' : donation.status?.toUpperCase() || 'SUCCESS'}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Payment Reference */}
                              {donation.payment_reference && (
                                <div className="mt-3 pt-3 border-t border-gray-100">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-500 font-medium">Transaction ID:</span>
                                    <span className="text-gray-700 font-mono bg-gray-50 px-2 py-1 rounded">
                                      {donation.payment_reference}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
      </div>

      {/* User Profile Modal */}
      {isAuthenticated && user && (
        <UserProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          onUpdate={handleProfileUpdate}
        />
      )}

      {/* Transaction History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setShowHistoryModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Transaction History</h2>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
              >
                <FaTimes className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {historyLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
                  <p className="mt-4 text-gray-500 font-medium">Loading your donations...</p>
                </div>
              ) : historyError ? (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 text-center">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-red-600 text-xl">⚠️</span>
                  </div>
                  <p className="text-red-600 font-semibold mb-2">Error Loading Donations</p>
                  <p className="text-red-500 text-sm">{historyError}</p>
                </div>
              ) : donationHistory.length === 0 ? (
                <div className="bg-gray-50 rounded-xl p-8 text-center">
                  <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                    <FaHandHoldingHeart className="text-3xl text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No Donations Yet</h3>
                  <p className="text-gray-600 mb-6">Start making a difference today!</p>
                  <button
                    onClick={() => {
                      setShowHistoryModal(false);
                      navigate('/donations');
                    }}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all transform hover:scale-105 shadow-lg font-semibold"
                  >
                    Make Your First Donation
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Recent Donations</h4>
                    <span className="text-xs text-gray-500">{donationHistory.length} items</span>
                  </div>
                  {donationHistory.map((donation, index) => {
                    const date = new Date(donation.created_at || donation.createdAt || donation.date);
                    const formattedDate = date.toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    });
                    const formattedTime = date.toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      hour12: true
                    });
                    const projectName = donation.project?.project_title || donation.project_title || 'Endowment Fund';
                    const isProject = donation.project_id || donation.project?.id;
                    const isSuccess = donation.status === 'success' || !donation.status;
                    
                    return (
                      <div
                        key={donation.id || index}
                        className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-5 border-l-4 border-blue-500 transform hover:-translate-y-1"
                      >
                        <div className="flex items-start gap-4">
                          {/* Icon */}
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            isProject ? 'bg-gradient-to-br from-purple-100 to-purple-200' : 'bg-gradient-to-br from-blue-100 to-blue-200'
                          }`}>
                            {isProject ? (
                              <FaProjectDiagram className="text-xl text-purple-600" />
                            ) : (
                              <FaHandHoldingHeart className="text-xl text-blue-600" />
                            )}
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex-1">
                                <h4 className="font-bold text-gray-900 text-base mb-1 line-clamp-1">
                                  {projectName}
                                </h4>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <div className="flex items-center gap-1 text-xs text-gray-500">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span>{formattedDate}</span>
                                  </div>
                                  <span className="text-gray-300">•</span>
                                  <div className="flex items-center gap-1 text-xs text-gray-500">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>{formattedTime}</span>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Amount & Status */}
                              <div className="text-right flex-shrink-0">
                                <div className="text-xl font-bold text-blue-600 mb-1">
                                  {formatNaira(donation.amount)}
                                </div>
                                <div className={`text-xs px-2.5 py-1 rounded-full font-semibold inline-block ${
                                  isSuccess
                                    ? 'bg-green-100 text-green-700' 
                                    : donation.status === 'pending'
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-red-100 text-red-700'
                                }`}>
                                  {isSuccess ? '✓ Success' : donation.status?.toUpperCase() || 'SUCCESS'}
                                </div>
                              </div>
                            </div>
                            
                            {/* Payment Reference */}
                            {donation.payment_reference && (
                              <div className="mt-3 pt-3 border-t border-gray-100">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-gray-500 font-medium">Transaction ID:</span>
                                  <span className="text-gray-700 font-mono bg-gray-50 px-2 py-1 rounded">
                                    {donation.payment_reference}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;  