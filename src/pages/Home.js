import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { formatNaira, donationsAPI, donorsAPI } from '../services/api';
import { ArrowUpRightIcon, UserPlusIcon, ClockIcon } from '@heroicons/react/24/outline';
import { FaUser, FaUserPlus, FaEdit, FaSignOutAlt, FaCog } from 'react-icons/fa';
import api from '../services/api';
import { FaHandHoldingHeart, FaProjectDiagram, FaAddressBook, FaTimes, FaEye, FaChevronRight, FaChevronLeft, FaSearch, FaEnvelope, FaUserFriends, FaPaperPlane, FaSpinner } from 'react-icons/fa';
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
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
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
  // Alumni list state
  const [alumniList, setAlumniList] = useState([]);
  const [filteredAlumni, setFilteredAlumni] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [alumniLoading, setAlumniLoading] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [selectedAlumni, setSelectedAlumni] = useState(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  // Donation history state (for history modal)
  const [donationHistory, setDonationHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);

  // Get location state for thank you message - must be declared early
  const location = useLocation();
  const navigate = useNavigate();
  // Get thankYou from location state OR sessionStorage (for Paystack redirect)
  const [thankYou, setThankYou] = useState(() => {
    // First check location state
    if (location.state?.thankYou) {
      return location.state.thankYou;
    }
    // Then check sessionStorage (for Paystack redirect)
    const stored = sessionStorage.getItem('donationThankYou');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        sessionStorage.removeItem('donationThankYou'); // Clear after reading
        return parsed;
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  // Fetch donation history when history modal opens
  useEffect(() => {
    if (showHistoryModal && isAuthenticated && user) {
      setHistoryLoading(true);
      setHistoryError(null);
      donationsAPI.getHistory()
        .then(res => {
          const allDonations = res.data.donations || res.data || [];
          
          // Filter donations to only show the authenticated user's donations
          const userDonations = allDonations.filter(donation => {
            // Check if donation belongs to the authenticated user
            return donation.donor_id === user.id || donation.donor?.id === user.id;
          });
          
          // Sort by most recent first
          const sorted = userDonations.sort((a, b) => {
            return new Date(b.created_at || b.createdAt || b.date) - new Date(a.created_at || a.createdAt || a.date);
          });
          setDonationHistory(sorted);
          
          // Also update total donated from history (only user's donations)
          // Check both 'amount' and 'type' fields as the database might have them swapped
          const sum = sorted.reduce((acc, d) => {
            const amount = d.amount || d.type || 0;
            return acc + Number(amount || 0);
          }, 0);
          setTotalDonated(sum);
          
          setHistoryLoading(false);
        })
        .catch(err => {
          setHistoryError('Failed to load donation history');
          setHistoryLoading(false);
          console.error('Donation history error:', err);
        });
    }
  }, [showHistoryModal, isAuthenticated, user, thankYou]);

  // Fetch alumni list (only if authenticated)
  useEffect(() => {
    let abortController = new AbortController();
    let timeoutId;
    
    if (isAuthenticated) {
      // Add a small delay to ensure session is fully established
      timeoutId = setTimeout(() => {
        fetchAlumniList(abortController);
      }, 500);
    } else {
      setAlumniList([]);
      setFilteredAlumni([]);
    }
    
    // Cleanup: abort request if component unmounts or dependencies change
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      abortController.abort();
    };
  }, [isAuthenticated]);

  // Filter alumni based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredAlumni(alumniList);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = alumniList.filter(alumni => {
        const fullName = `${alumni.name || ''} ${alumni.surname || ''} ${alumni.other_name || ''}`.toLowerCase();
        const email = (alumni.email || '').toLowerCase();
        return fullName.includes(query) || email.includes(query);
      });
      setFilteredAlumni(filtered);
    }
  }, [searchQuery, alumniList]);

  const fetchAlumniList = async (abortController) => {
    setAlumniLoading(true);
    try {
      const response = await api.get('/api/donors', {
        signal: abortController?.signal
      });
      const alumni = Array.isArray(response.data) ? response.data : response.data?.data || response.data?.donors || [];
      // Filter to show only alumni with email
      const alumniWithEmail = alumni.filter(a => a.email && a.email.trim() !== '');
      setAlumniList(alumniWithEmail);
      setFilteredAlumni(alumniWithEmail);
    } catch (error) {
      // Ignore aborted requests (component unmounted or navigation)
      if (error.code === 'ECONNABORTED' || error.name === 'AbortError' || error.message === 'Request aborted') {
        return; // Silently ignore aborted requests
      }
      
      console.error('Error fetching alumni list:', error);
      
      // Handle 401 (Unauthorized) - user needs to login
      if (error.response?.status === 401) {
        // Don't show error toast, just set empty list
        // The UI will show appropriate message
        setAlumniList([]);
        setFilteredAlumni([]);
      } else {
        // For other errors, show toast only if user is authenticated
        if (isAuthenticated) {
          toast.error('Failed to load alumni list. Please try again later.');
        }
        setAlumniList([]);
        setFilteredAlumni([]);
      }
    } finally {
      setAlumniLoading(false);
    }
  };

  // Helper to normalize image path
  const normalizeImagePath = (imagePath) => {
    const baseUrl = getBaseUrl();
    if (!imagePath || imagePath.trim() === '') return null;
    
    const path = imagePath.trim();
    // If it's already a full URL, return as is
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    // Normalize path - remove leading slash if present
    const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
    
    // Check if path already includes 'storage'
    if (normalizedPath.startsWith('storage/')) {
      return baseUrl + normalizedPath;
    }
    // Otherwise, add storage/ prefix
    return baseUrl + 'storage/' + normalizedPath;
  };

  // Helper to get single image for a project (icon_image, or fallback to first body_image)
  const getProjectImage = (project) => {
    // First priority: icon_image
    const iconImage = project.icon_image || project.icon_image_path;
    if (iconImage && iconImage.trim() !== '') {
      return normalizeImagePath(iconImage);
    }
    
    // Second priority: first body_image from project_photos table
    if (project.photos && Array.isArray(project.photos) && project.photos.length > 0) {
      for (const photo of project.photos) {
        const bodyImage = photo.body_image || photo.body_image_path;
        if (bodyImage && bodyImage.trim() !== '') {
          return normalizeImagePath(bodyImage);
        }
      }
    }
    
    // Fallback: Use a data URI for a simple gray placeholder
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';
  };

  // Helper to get all images for a project (icon_image + all body_images)
  const getAllProjectImages = (project) => {
    const images = [];
    const baseUrl = getBaseUrl();
    
    // Add icon_image first if it exists
    const iconImage = project.icon_image || project.icon_image_path;
    if (iconImage && iconImage.trim() !== '') {
      images.push(normalizeImagePath(iconImage));
    }
    
    // Add all body_images from project_photos
    if (project.photos && Array.isArray(project.photos) && project.photos.length > 0) {
      project.photos.forEach((photo) => {
        const bodyImage = photo.body_image || photo.body_image_path;
        if (bodyImage && bodyImage.trim() !== '') {
          const normalized = normalizeImagePath(bodyImage);
          // Avoid duplicates (in case icon_image is same as a body_image)
          if (normalized && !images.includes(normalized)) {
            images.push(normalized);
          }
        }
      });
    }
    
    // If no images found, return placeholder
    if (images.length === 0) {
      return ['data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='];
    }
    
    return images;
  };

  // Open image gallery modal
  const openImageGallery = (project, imageIndex = 0) => {
    setSelectedProject(project);
    setSelectedImageIndex(imageIndex);
    setShowImageGallery(true);
  };

  // Close image gallery modal
  const closeImageGallery = () => {
    setShowImageGallery(false);
    setSelectedProject(null);
    setSelectedImageIndex(0);
  };

  // Navigate to previous image
  const previousImage = () => {
    if (!selectedProject) return;
    const images = getAllProjectImages(selectedProject);
    setSelectedImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  // Navigate to next image
  const nextImage = () => {
    if (!selectedProject) return;
    const images = getAllProjectImages(selectedProject);
    setSelectedImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  // Get full name for alumni
  const getAlumniFullName = (alumni) => {
    const parts = [alumni.name, alumni.surname, alumni.other_name].filter(Boolean);
    return parts.join(' ') || 'Unknown';
  };

  // Open email composition modal
  const openEmailModal = (alumni, isInvite = false) => {
    setSelectedAlumni(alumni);
    if (isInvite) {
      // Auto-construct invitation email
      const inviteSubject = 'Invitation to Join ABU Endowment & Crowd Funding';
      const inviteBody = `Dear ${getAlumniFullName(alumni)},\n\n` +
        `I hope this message finds you well. I am reaching out to invite you to join the ABU Endowment & Crowd Funding platform.\n\n` +
        `As a fellow ABU alumnus, your participation would be invaluable in supporting our alma mater's development initiatives.\n\n` +
        `The platform allows you to:\n` +
        `• Make donations to various projects\n` +
        `• Track your contributions\n` +
        `• Stay updated on ongoing initiatives\n` +
        `• Connect with other alumni\n\n` +
        `You can register and get started by visiting our platform.\n\n` +
        `Thank you for considering this invitation.\n\n` +
        `Best regards,\n` +
        `${user?.name || 'ABU Endowment Team'}`;
      setEmailSubject(inviteSubject);
      setEmailBody(inviteBody);
    } else {
      setEmailSubject('');
      setEmailBody('');
    }
    setShowEmailModal(true);
  };

  // Send email
  const handleSendEmail = async () => {
    if (!selectedAlumni || !emailSubject.trim() || !emailBody.trim()) {
      toast.error('Please fill in both subject and message');
      return;
    }

    setSendingEmail(true);
    try {
      // TODO: Replace with actual email API endpoint
      // For now, we'll use mailto link as fallback
      const mailtoLink = `mailto:${selectedAlumni.email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
      window.location.href = mailtoLink;
      
      toast.success('Email client opened. Please send the email manually.');
      setShowEmailModal(false);
      setSelectedAlumni(null);
      setEmailSubject('');
      setEmailBody('');
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Failed to send email');
    } finally {
      setSendingEmail(false);
    }
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
      if (isAuthenticated && user) {
        const cacheKey = `abu_totalDonated_${user.id}`;
        donationsAPI.getHistory().then(res => {
          const allDonations = res.data.donations || [];
          
          // Filter donations to only show the authenticated user's donations
          // Include ALL donations (endowment and projects) for this user
          const userDonations = allDonations.filter(donation => {
            const donorId = donation.donor_id || donation.donor?.id || donation.donor_id;
            return donorId === user.id;
          });
          
          // Calculate sum from user's donations only
          // Check both 'amount' and 'type' fields as the database might have them swapped
          const sum = userDonations.reduce((acc, d) => {
            const amount = d.amount || d.type || 0;
            return acc + Number(amount || 0);
          }, 0);
          
          console.log('Thank you - Total updated:', { sum, userDonations: userDonations.length });
          setTotalDonated(sum);
          localStorage.setItem(cacheKey, sum);
        }).catch(() => {
          // Silent fail - don't show error
        });
      }
      
      // Refresh projects list to show updated raised amounts
      // Clear cache and refetch projects after a short delay to allow backend to update
      setTimeout(() => {
        localStorage.removeItem('abu_projects');
        api.get('/api/projects')
          .then(res => {
            const activeProjects = res.data.filter(project => project.deleted_at === null || project.deleted_at === undefined);
            setProjects(activeProjects);
            localStorage.setItem('abu_projects', JSON.stringify(activeProjects));
          })
          .catch(() => {
            // Silent fail - don't show error
          });
      }, 2000); // 2 second delay to allow backend webhook to process
      
      // Clear location state to prevent showing message again on refresh
      window.history.replaceState({}, document.title);
    }
  }, [thankYou, isAuthenticated, user]);

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

  // For totalDonated, cache per user - ONLY when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const cacheKey = `abu_totalDonated_${user.id}`;
      const cachedTotal = localStorage.getItem(cacheKey);
      if (cachedTotal !== null) {
        setTotalDonated(Number(cachedTotal));
      }
      const fingerprint = getDeviceFingerprint();
      donationsAPI.getHistory().then(res => {
        const allDonations = res.data.donations || [];
        
        // Filter donations to only show the authenticated user's donations
        // Include ALL donations (endowment and projects) for this user
        const userDonations = allDonations.filter(donation => {
          const donorId = donation.donor_id || donation.donor?.id || donation.donor_id;
          return donorId === user.id;
        });
        
        console.log('Total donations calculation:', {
          allDonations: allDonations.length,
          userDonations: userDonations.length,
          userId: user.id,
          donations: userDonations.map(d => ({
            id: d.id,
            donor_id: d.donor_id,
            amount: d.amount,
            type: d.type,
            project_id: d.project_id
          }))
        });
        
        // Calculate sum from user's donations only
        // Check both 'amount' and 'type' fields as the database might have them swapped
        const sum = userDonations.reduce((acc, d) => {
          const amount = d.amount || d.type || 0;
          return acc + Number(amount || 0);
        }, 0);
        
        setTotalDonated(sum);
        localStorage.setItem(cacheKey, sum);
        setDebugInfo({ fingerprint, history: res.data });
      }).catch((err) => {
        setTotalDonated(0);
        setDebugInfo({ fingerprint, history: err?.response?.data || err.message });
      });
    } else {
      // User is not authenticated - clear total and cache
      setTotalDonated(0);
      setDebugInfo({ fingerprint: getDeviceFingerprint(), history: null });
      // Clear all cached totals when logged out
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('abu_totalDonated_')) {
          localStorage.removeItem(key);
        }
      });
    }
  }, [isAuthenticated, user]);

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
      navigate('/', { replace: true });
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
    
    // Refresh donation history if modal is open
    if (showHistoryModal && isAuthenticated && user) {
      donationsAPI.getHistory()
        .then(res => {
          const allDonations = res.data.donations || res.data || [];
          
          // Filter donations to only show the authenticated user's donations
          // Include ALL donations (endowment and projects) for this user
          const userDonations = allDonations.filter(donation => {
            const donorId = donation.donor_id || donation.donor?.id || donation.donor_id;
            return donorId === user.id;
          });
          
          const sorted = userDonations.sort((a, b) => {
            return new Date(b.created_at || b.createdAt || b.date) - new Date(a.created_at || a.createdAt || a.date);
          });
          setDonationHistory(sorted);
          
          // Calculate sum from user's donations only
          // Check both 'amount' and 'type' fields as the database might have them swapped
          const sum = sorted.reduce((acc, d) => {
            const amount = d.amount || d.type || 0;
            return acc + Number(amount || 0);
          }, 0);
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
        <div className="bg-gradient-to-br from-gray-600 via-gray-700 to-gray-800 rounded-2xl shadow-2xl p-5 text-white relative overflow-hidden w-full">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-5 rounded-full -mr-20 -mt-20"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-5 rounded-full -ml-16 -mb-16"></div>
          
          <div className="relative z-10">
            {/* Top Section */}
            <div className="flex items-center justify-between mb-4">
              {/* Left: My Donations */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium opacity-90">My Donations</span>
                {isAuthenticated && user && <FaEye className="w-4 h-4 opacity-75" />}
              </div>
              {/* Right: User Name and Transaction History */}
              <div className="flex items-center gap-3">
                {/* User Name */}
                {isAuthenticated && user && (user.name || user.surname) && (
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white opacity-95">
                      {[user.name, user.surname].filter(Boolean).join(' ') || user.email}
                    </p>
                  </div>
                )}
                {/* Transaction History - Always visible */}
                <button
                  onClick={() => {
                    if (isAuthenticated && user) {
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
            </div>

            {/* Balance Amount */}
            <div className="flex items-center gap-2 mb-3">
              <div className="text-3xl font-bold">{formatNaira(isAuthenticated && user ? totalDonated : 0)}</div>
              <FaChevronRight className="w-4 h-4 opacity-75" />
            </div>

            {/* Progress Bar - Inside Card - Always visible */}
            <div className="w-full mb-4">
              <div className="flex h-2.5 rounded-full overflow-hidden bg-white bg-opacity-20 border border-white border-opacity-30 shadow-inner">
                {/* Tier 1: 1 - 100,000 */}
                <div className={`flex-1 transition-colors duration-300 ${
                  (isAuthenticated && user && totalDonated >= 1) ? 'bg-white bg-opacity-40' : 'bg-white bg-opacity-10'
                }`}></div>
                {/* Tier 2: 100,000 - 999,999 */}
                <div className={`flex-1 transition-colors duration-300 ${
                  (isAuthenticated && user && totalDonated >= 100000) ? 'bg-orange-300 bg-opacity-80' : 'bg-white bg-opacity-10'
                }`}></div>
                {/* Tier 3: 1,000,000+ */}
                <div className={`flex-1 transition-colors duration-300 ${
                  (isAuthenticated && user && totalDonated >= 1000000) ? 'bg-green-300 bg-opacity-90' : 'bg-white bg-opacity-10'
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
                  if (isAuthenticated && user) {
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
                // Get raised amount - use 'raised' field from API (primary source)
                // Fallback to other field names for backward compatibility
                const raisedAmount = Number(
                  project.raised || 
                  project.amount || 
                  project.current_amount || 
                  project.raised_amount || 
                  0
                );
                // Get target amount - use 'target' field from API (primary source)
                // Fallback to 'target_amount' for backward compatibility
                const targetAmount = Number(project.target || project.target_amount || 0);
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
                    {/* Image Section with Overlay - Clickable */}
                    <div 
                      className="relative h-48 overflow-hidden bg-gray-200 cursor-pointer"
                      onClick={() => openImageGallery(project, 0)}
                    >
                      <img
                        src={projectImage}
                        alt={project.project_title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        onError={(e) => {
                          // Only log error once per project to avoid spam
                          if (!e.target.dataset.errorLogged) {
                            console.warn('Image load error for project:', project.project_title, 'URL:', e.target.src);
                            console.warn('Project data:', { 
                              icon_image: project.icon_image, 
                              photos: project.photos,
                              baseUrl: getBaseUrl()
                            });
                            e.target.dataset.errorLogged = 'true';
                          }
                          // Use data URI fallback instead of external placeholder
                          if (!e.target.src.includes('data:image')) {
                            e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';
                          }
                        }}
                      />
                      {/* Click indicator overlay */}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300 flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white bg-opacity-90 rounded-full p-2">
                          <FaEye className="w-5 h-5 text-gray-700" />
                        </div>
                      </div>
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
                              'bg-gray-500 animate-pulse'
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
                                : 'bg-gradient-to-r from-gray-500 via-gray-600 to-gray-700'
                            }`}
                            style={{ width: `${Math.max(progressPercentage, 2)}%` }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                          </div>
                        </div>
                        
                        {/* Amount Display */}
                        <div className="flex justify-between items-center mt-3">
                          <div>
                            <p className="text-[9px] text-gray-500 mb-0.5 uppercase tracking-wide">Raised</p>
                            <p className="text-sm font-semibold text-gray-900">{formatNaira(raisedAmount)}</p>
                          </div>
                          {targetAmount > 0 && (
                            <div className="text-right">
                              <p className="text-[9px] text-gray-500 mb-0.5 uppercase tracking-wide">Target</p>
                              <p className="text-sm font-semibold text-primary-600">{formatNaira(targetAmount)}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* CTA Button */}
                      <button
                        onClick={() => navigate(`/donations?project=${encodeURIComponent(project.project_title)}`)}
                        className="w-full bg-gradient-to-r from-gray-600 via-gray-700 to-gray-800 text-white py-3.5 px-6 rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 group/btn relative overflow-hidden"
                      >
                        <span className="relative z-10 flex items-center gap-2">
                          <FaHandHoldingHeart className="text-base group-hover/btn:scale-110 transition-transform" />
                          <span>Support This Project</span>
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-gray-700 via-gray-800 to-gray-900 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
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

      {/* Alumni List Section */}
      <div className="mb-24">
        {/* Header with Search and Compose Button */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <FaUserFriends className="text-white text-xl" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Alumni Directory</h2>
                <p className="text-sm text-gray-500">Connect and invite fellow alumni</p>
              </div>
            </div>
            <button
              onClick={() => openEmailModal(null, false)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg"
            >
              <FaEnvelope className="text-base" />
              <span>Compose</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <FaSearch className="text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Alumni List */}
        {alumniLoading ? (
          <div className="text-center py-12">
            <FaSpinner className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Loading alumni...</p>
          </div>
        ) : !isAuthenticated ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
              <FaUserFriends className="text-3xl text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Login Required</h3>
            <p className="text-gray-600 mb-6">Please login to view and connect with alumni</p>
            <button
              onClick={() => navigate('/login')}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg font-semibold"
            >
              Login Now
            </button>
          </div>
        ) : filteredAlumni.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <FaUserFriends className="text-3xl text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {searchQuery ? 'No alumni found' : 'No alumni available'}
            </h3>
            <p className="text-gray-600">
              {searchQuery ? 'Try a different search term' : 'Alumni list will appear here once available'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAlumni.map((alumni) => (
              <div
                key={alumni.id}
                className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-5 border border-gray-100 transform hover:-translate-y-1"
              >
                {/* Alumni Info */}
                <div className="mb-4">
                  <div className="flex items-start gap-3 mb-2">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 font-bold text-lg">
                        {getAlumniFullName(alumni).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 text-base mb-1 line-clamp-2">
                        {getAlumniFullName(alumni)}
                      </h3>
                      <p className="text-sm text-gray-500 truncate">{alumni.email}</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => openEmailModal(alumni, false)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-600 rounded-lg font-semibold hover:bg-blue-100 transition-all transform hover:scale-105"
                  >
                    <FaEnvelope className="text-sm" />
                    <span>Message</span>
                  </button>
                  <button
                    onClick={() => openEmailModal(alumni, true)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-md"
                  >
                    <FaPaperPlane className="text-sm" />
                    <span>Invite</span>
                  </button>
                </div>
              </div>
            ))}
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

      {/* Image Gallery Modal */}
      {showImageGallery && selectedProject && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={closeImageGallery}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              <div className="flex-1">
                <h2 className="text-2xl font-bold">{selectedProject.project_title}</h2>
                <p className="text-sm opacity-90 mt-1">
                  Image {selectedImageIndex + 1} of {getAllProjectImages(selectedProject).length}
                </p>
              </div>
              <button
                onClick={closeImageGallery}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white hover:bg-opacity-20 transition-colors"
                aria-label="Close gallery"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>

            {/* Main Image View */}
            <div className="flex-1 relative bg-black flex items-center justify-center p-4 min-h-[400px]">
              {getAllProjectImages(selectedProject).length > 1 && (
                <>
                  {/* Previous Button */}
                  <button
                    onClick={previousImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full flex items-center justify-center shadow-lg transition-all z-10"
                    aria-label="Previous image"
                  >
                    <FaChevronLeft className="w-5 h-5 text-gray-800" />
                  </button>
                  
                  {/* Next Button */}
                  <button
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full flex items-center justify-center shadow-lg transition-all z-10"
                    aria-label="Next image"
                  >
                    <FaChevronRight className="w-5 h-5 text-gray-800" />
                  </button>
                </>
              )}
              
              {/* Large Image */}
              <img
                src={getAllProjectImages(selectedProject)[selectedImageIndex]}
                alt={`${selectedProject.project_title} - Image ${selectedImageIndex + 1}`}
                className="max-w-full max-h-[60vh] object-contain rounded-lg"
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';
                }}
              />
            </div>

            {/* Thumbnail Gallery */}
            <div className="p-4 bg-gray-50 border-t border-gray-200">
              <div className="flex gap-3 overflow-x-auto pb-2">
                {getAllProjectImages(selectedProject).map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImageIndex === index
                        ? 'border-blue-600 ring-2 ring-blue-300 ring-offset-2'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <img
                      src={image}
                      alt={`Thumbnail ${index + 1}`}
                      className={`w-full h-full object-cover transition-opacity ${
                        selectedImageIndex === index ? 'opacity-100' : 'opacity-70 hover:opacity-100'
                      }`}
                      onError={(e) => {
                        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';
                      }}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Composition Modal */}
      {showEmailModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowEmailModal(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              <div>
                <h2 className="text-2xl font-bold">Compose Email</h2>
                {selectedAlumni && (
                  <p className="text-sm opacity-90 mt-1">To: {selectedAlumni.email}</p>
                )}
              </div>
              <button
                onClick={() => {
                  setShowEmailModal(false);
                  setSelectedAlumni(null);
                  setEmailSubject('');
                  setEmailBody('');
                }}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white hover:bg-opacity-20 transition-colors"
                aria-label="Close modal"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Recipient (if not selected, show input) */}
              {!selectedAlumni && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    To (Email Address)
                  </label>
                  <input
                    type="email"
                    placeholder="Enter recipient email"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              {/* Subject */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Email subject"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Message Body */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="Type your message here..."
                  rows={10}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowEmailModal(false);
                  setSelectedAlumni(null);
                  setEmailSubject('');
                  setEmailBody('');
                }}
                className="px-6 py-2.5 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-100 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSendEmail}
                disabled={sendingEmail || !emailSubject.trim() || !emailBody.trim()}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
              >
                {sendingEmail ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <FaPaperPlane className="text-sm" />
                    <span>Send Email</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;  