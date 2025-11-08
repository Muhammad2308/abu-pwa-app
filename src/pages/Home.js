import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { formatNaira, donationsAPI, donorsAPI } from '../services/api';
import { ArrowUpRightIcon, UserPlusIcon, ClockIcon } from '@heroicons/react/24/outline';
import { FaUser, FaUserPlus } from 'react-icons/fa';
import api from '../services/api';
import { FaArrowLeft, FaArrowRight, FaHandHoldingHeart, FaProjectDiagram, FaDonate, FaAddressBook } from 'react-icons/fa';
import { getBaseUrl } from '../services/api';
import { useLocation, useNavigate } from 'react-router-dom';
import { getDeviceFingerprint } from '../utils/deviceFingerprint';
import toast from 'react-hot-toast';

const notifications = [
  { id: 1, message: 'Thank you for your recent donation!', time: '2h ago' },
  { id: 2, message: 'New project: Library Expansion', time: '1d ago' },
];

const Home = () => {
  const { user, isDeviceRecognized, checkDeviceRecognition } = useAuth();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const sliderRef = React.useRef(null);
  const [isPaused, setIsPaused] = useState(false);
  // Add state to track active image index for each project card
  const [activeImages, setActiveImages] = useState({});
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

  // Fetch donation history when Contact tab is active
  useEffect(() => {
    if (activeTab === 'contact' && user && isDeviceRecognized) {
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
    } else if (activeTab === 'contact' && !user) {
      setDonationHistory([]);
      setHistoryError(null);
    }
  }, [activeTab, user, isDeviceRecognized, thankYou]); // Refresh when thankYou state changes


  // Helper to get all images for a project (icon_image + photos)
  const getProjectImages = (project) => {
    const images = [];
    if (project.icon_image) {
      images.push({
        url: getBaseUrl() + 'storage/' + project.icon_image,
        key: 'icon_image',
      });
    }
    if (project.photos && Array.isArray(project.photos)) {
      project.photos.forEach((photo, idx) => {
        if (photo.body_image) {
          images.push({
            url: getBaseUrl() + 'storage/' + photo.body_image,
            key: 'photo_' + idx,
          });
        }
      });
    }
    return images.length > 0 ? images : [{ url: 'https://via.placeholder.com/400x200?text=No+Image', key: 'placeholder' }];
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

  // Arrow click handlers
  const handleArrow = (dir) => {
    if (!sliderRef.current) return;
    const slider = sliderRef.current;
    const scrollAmount = 240 * 2; // 2 cards
    const newScrollLeft = dir === 'left'
      ? slider.scrollLeft - scrollAmount
      : slider.scrollLeft + scrollAmount;
    slider.scrollTo({ left: newScrollLeft, behavior: 'smooth' });
  };

  // --- Slider Auto Scroll Logic ---
  // Remove timer-based slider scroll useEffect

  return (
    <div className="mx-4 space-y-6 pt-4 pb-20">
      {/* Welcome Card */}
      <div className="bg-white rounded-xl shadow p-5 flex flex-col items-center text-center">
        {user && isDeviceRecognized ? (
          <>
            <div className="text-2xl font-bold text-gray-900 mb-2">
              Welcome back, {user.name}! 👋
            </div>
            <div className="text-sm text-gray-600 mb-3">
              Thank you for your continued support
            </div>
            <div className="text-xs uppercase text-gray-400 mb-1">Total Donated</div>
            <div className="text-3xl font-bold text-primary-700 mb-2">{formatNaira(totalDonated)}</div>

            {/* Progress Bar for Donation Tiers */}
            <div className="w-full max-w-md mx-auto mb-6">
              {/* Bar container */}
              <div className="flex h-3 rounded-lg overflow-hidden border border-gray-300">
                {/* Tier 1: 1 - 100,000 */}
                <div className={`flex-1 ${totalDonated >= 1 ? 'bg-gray-300' : 'bg-gray-300'}`}></div>
                {/* Tier 2: 100,000 - 999,999 */}
                <div className={`flex-1 ${totalDonated >= 100000 ? 'bg-orange-300' : 'bg-gray-300'}`}></div>
                {/* Tier 3: 1,000,000+ */}
                <div className={`flex-1 ${totalDonated >= 1000000 ? 'bg-green-500' : 'bg-gray-200'}`}></div>
              </div>
              {/* Tier labels */}
              <div className="flex justify-between text-xs mt-1 px-1">
                <span className="text-gray-700 font-semibold">Tier 1</span>
                <span className="text-orange-500 font-semibold">Tier 2</span>
                <span className="text-green-600 font-semibold">Tier 3</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="text-2xl font-bold text-gray-900 mb-2">
              Welcome to ABU Endowment
            </div>
            <div className="text-sm text-gray-600 mb-3">
              Support our university through your generous donations
            </div>
            <div className="text-xs uppercase text-gray-400 mb-1">Make a Difference</div>
            <div className="text-3xl font-bold text-primary-700">₦0</div>
          </>
        )}
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
          onClick={() => setActiveTab('projects')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'projects'
              ? 'bg-white text-primary-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <FaProjectDiagram className="text-base" />
          Projects
        </button>
        <button
          onClick={() => setActiveTab('donate')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'donate'
              ? 'bg-white text-primary-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <FaDonate className="text-base" />
          Donate
        </button>
      </div>

      {/* Tab Content */}
      <div className="mb-24">
        {/* Projects Tab */}
        {activeTab === 'projects' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Recent Projects</h3>
              <a href="/projects" className="text-primary-600 text-sm font-medium hover:underline">See all</a>
            </div>
            <div className="relative overflow-hidden w-full" style={{ height: '300px' }}>
              {/* Arrows */}
              <button
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white bg-opacity-80 rounded-full p-2 shadow hover:bg-blue-100 transition"
                onClick={() => handleArrow('left')}
                style={{ display: projects.length > 0 ? 'block' : 'none' }}
                aria-label="Scroll left"
              >
                <FaArrowLeft />
              </button>
              <button
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white bg-opacity-80 rounded-full p-2 shadow hover:bg-blue-100 transition"
                onClick={() => handleArrow('right')}
                style={{ display: projects.length > 0 ? 'block' : 'none' }}
                aria-label="Scroll right"
              >
                <FaArrowRight />
              </button>
                <div
                  ref={sliderRef}
                  className="flex items-center gap-3 overflow-x-auto scrollbar-hide"
                  style={{
                    width: '100%',
                    willChange: 'transform'
                  }}
                >
                {loading ? (
                  <div className="text-center w-full">Loading...</div>
                ) : projects.length === 0 ? (
                  <div className="text-center w-full">No projects found.</div>
                ) : (
                  [...projects, ...projects, ...projects].map((project, idx) => {
                    const images = getProjectImages(project);
                    const cardKey = project.id + '-' + idx;
                    const activeIdx = activeImages[cardKey] ?? 0;
                    return (
                      <div
                        key={cardKey}
                        className="bg-white rounded-lg shadow-md hover:shadow-lg p-4 flex flex-col items-center min-w-[240px] max-w-[240px] mx-2 transition-shadow duration-200"
                        // Removed pause on hover for slider animation
                      >
                        <img
                          src={images[activeIdx]?.url}
                          alt={project.project_title}
                          className="h-28 w-40 object-cover rounded-md mb-3 border"
                          style={{ margin: '0 auto' }}
                        />
                        {/* Thumbnails */}
                        <div className="flex gap-1 mb-2">
                          {images.map((img, thumbIdx) => (
                            <img
                              key={img.key}
                              src={img.url}
                              alt={`Thumbnail ${thumbIdx + 1}`}
                              className={`h-8 w-12 object-cover rounded border cursor-pointer ${activeIdx === thumbIdx ? 'ring-2 ring-primary-500' : 'opacity-70 hover:opacity-100'}`}
                              onClick={() => setActiveImages((prev) => ({ ...prev, [cardKey]: thumbIdx }))}
                              style={{ transition: 'box-shadow 0.2s, opacity 0.2s' }}
                            />
                          ))}
                        </div>
                        <div className="font-semibold text-base text-center mb-1 line-clamp-2">{project.project_title}</div>
                        <div className="text-gray-600 text-xs text-center mb-2 line-clamp-2" style={{display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'}}>{project.project_description}</div>
                        <div className="text-xs text-gray-500 mb-2">Raised: {formatNaira(project.amount || 0)}</div>
                        <button
                          className="mt-2 bg-blue-100 text-blue-700 py-0.5 px-2 rounded flex items-center gap-1 text-xs font-semibold shadow-sm hover:bg-blue-200 hover:text-blue-900 transition-all duration-150"
                          style={{ fontSize: '0.75rem' }}
                          onClick={() => window.location.href = `/donations?project=${encodeURIComponent(project.project_title)}`}
                        >
                          <FaHandHoldingHeart className="text-xs" />
                          Contribute
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Donate Tab */}
        {activeTab === 'donate' && (
          <div className="max-w-md mx-auto">
            <h3 className="text-lg font-semibold mb-4 text-center">Make a Donation</h3>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Donation Amount
                </label>
                <input
                  type="number"
                  placeholder="Enter amount"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={() => window.location.href = '/donations'}
                className="w-full bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 transition-colors font-medium"
              >
                Proceed to Payment
              </button>
            </div>
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

      {/* Notifications */}
      <div>
        <div className="flex items-center gap-2 mb-2">
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
    </div>
  );
};

export default Home;