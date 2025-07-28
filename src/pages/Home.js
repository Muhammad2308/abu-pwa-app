import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { formatNaira, donationsAPI } from '../services/api';
import { ArrowUpRightIcon, UserPlusIcon, ClockIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import { FaArrowLeft, FaArrowRight, FaHandHoldingHeart } from 'react-icons/fa';
import { getBaseUrl } from '../services/api';
import { useLocation, useNavigate } from 'react-router-dom';
import { getDeviceFingerprint } from '../utils/deviceFingerprint';

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
  const [animationDuration, setAnimationDuration] = useState(12); // default duration
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState(null);

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

  const location = useLocation();
  const navigate = useNavigate();
  const thankYou = location.state?.thankYou;

  // On mount, try to load projects and totalDonated from localStorage
  useEffect(() => {
    const cachedProjects = localStorage.getItem('abu_projects');
    if (cachedProjects) {
      setProjects(JSON.parse(cachedProjects));
      setLoading(false);
    } else {
      setLoading(true);
      api.get('/api/projects')
        .then(res => {
          setProjects(res.data);
          localStorage.setItem('abu_projects', JSON.stringify(res.data));
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
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

  useEffect(() => {
    if (!loading && !user && !isDeviceRecognized) {
      navigate('/donations');
    }
  }, [loading, user, isDeviceRecognized, navigate]);

  // Arrow click handlers
  const handleArrow = (dir) => {
    if (!sliderRef.current) return;
    const slider = sliderRef.current;
    const scrollAmount = 240 * 2; // 2 cards
    if (dir === 'left') {
      slider.scrollLeft -= scrollAmount;
    } else {
      slider.scrollLeft += scrollAmount;
    }
    // Speed up animation for a short burst
    setAnimationDuration(6);
    setTimeout(() => setAnimationDuration(12), 800);
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

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-4">
        <button 
          onClick={() => window.location.href = '/donations'}
          className="flex flex-col items-center bg-primary-50 rounded-lg p-3 hover:bg-primary-100 transition"
        >
          <ArrowUpRightIcon className="h-6 w-6 text-primary-600" />
          <span className="text-xs mt-1 font-medium text-primary-700">Donate</span>
        </button>
        <button 
          onClick={() => window.location.href = '/projects'}
          className="flex flex-col items-center bg-primary-50 rounded-lg p-3 hover:bg-primary-100 transition"
        >
          <UserPlusIcon className="h-6 w-6 text-primary-600" />
          <span className="text-xs mt-1 font-medium text-primary-700">Projects</span>
        </button>
        <button 
          onClick={() => window.location.href = '/contacts'}
          className="flex flex-col items-center bg-primary-50 rounded-lg p-3 hover:bg-primary-100 transition"
        >
          <ClockIcon className="h-6 w-6 text-primary-600" />
          <span className="text-xs mt-1 font-medium text-primary-700">Contact</span>
        </button>
      </div>

      {/* Recent Projects Slider */}
      <div className="mt-10 mb-24">
        <div className="flex justify-between items-center mb-2">
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
            className="flex items-center gap-6"
            style={{
              width: projects.length > 0 ? `${projects.length * 260}px` : '100%',
              overflowX: 'auto',
              scrollBehavior: 'smooth',
            }}
          >
            {loading ? (
              <div className="text-center w-full">Loading...</div>
            ) : projects.length === 0 ? (
              <div className="text-center w-full">No projects found.</div>
            ) : (
              [...projects, ...projects].map((project, idx) => {
                const images = getProjectImages(project);
                const cardKey = project.id + '-' + idx;
                const activeIdx = activeImages[cardKey] ?? 0;
                return (
                  <div
                    key={cardKey}
                    className="bg-white rounded-lg shadow-md hover:shadow-lg p-4 flex flex-col items-center min-w-[240px] max-w-[240px] mx-2 transition-shadow duration-200"
                    onMouseEnter={() => setIsPaused(true)}
                    onMouseLeave={() => setIsPaused(false)}
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

      {/* Notifications */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <ClockIcon className="h-5 w-5 text-primary-600" />
          <h3 className="text-lg font-semibold">Notifications</h3>
        </div>
        <ul className="divide-y divide-gray-100 bg-white rounded-lg shadow">
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