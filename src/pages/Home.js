import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../services/api';
import { ArrowUpRightIcon, UserPlusIcon, ClockIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import { FaArrowLeft, FaArrowRight, FaHandHoldingHeart } from 'react-icons/fa';

const BASE_URL = 'http://127.0.0.1:8000/';
const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/400x200?text=No+Image';

const notifications = [
  { id: 1, message: 'Thank you for your recent donation!', time: '2h ago' },
  { id: 2, message: 'New project: Library Expansion', time: '1d ago' },
];

const Home = () => {
  const { user, getUserTier, getNextTierProgress } = useAuth();
  const tier = getUserTier();
  const progress = getNextTierProgress();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const sliderRef = React.useRef(null);
  const [isPaused, setIsPaused] = useState(false);
  const [animationDuration, setAnimationDuration] = useState(12); // default duration

  useEffect(() => {
    api.get('/api/projects')
      .then(res => {
        setProjects(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

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

  return (
    <div className="mx-4 space-y-6 pt-4 pb-20">
      {/* Donation Summary Card */}
      <div className="bg-white rounded-xl shadow p-5 flex flex-col items-center text-center">
        <div className="text-xs uppercase text-gray-400 mb-1">Total Donated</div>
        <div className="text-3xl font-bold text-primary-700">{formatCurrency(user?.total_donations || 0)}</div>
        <div className="mt-2 flex items-center gap-2">
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
            tier === 'Gold' ? 'bg-yellow-400 text-yellow-900' :
            tier === 'Silver' ? 'bg-gray-300 text-gray-800' :
            tier === 'Bronze' ? 'bg-amber-400 text-amber-900' :
            'bg-gray-100 text-gray-500'
          }`}>
            {tier || 'New'} Tier
          </span>
          <span className="text-xs text-gray-500">Next: {formatCurrency(progress.next)}</span>
        </div>
        <div className="w-full mt-3">
          <div className="h-2 bg-gray-200 rounded-full">
            <div
              className="h-2 rounded-full bg-primary-600 transition-all"
              style={{ width: `${progress.progress}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{formatCurrency(progress.current)}</span>
            <span>{formatCurrency(progress.next)}</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-4">
        <button className="flex flex-col items-center bg-primary-50 rounded-lg p-3 hover:bg-primary-100 transition">
          <ArrowUpRightIcon className="h-6 w-6 text-primary-600" />
          <span className="text-xs mt-1 font-medium text-primary-700">Donate</span>
        </button>
        <button className="flex flex-col items-center bg-primary-50 rounded-lg p-3 hover:bg-primary-100 transition">
          <UserPlusIcon className="h-6 w-6 text-primary-600" />
          <span className="text-xs mt-1 font-medium text-primary-700">Invite</span>
        </button>
        <button className="flex flex-col items-center bg-primary-50 rounded-lg p-3 hover:bg-primary-100 transition">
          <ClockIcon className="h-6 w-6 text-primary-600" />
          <span className="text-xs mt-1 font-medium text-primary-700">History</span>
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
            className="flex items-center gap-6 animate-slide"
            style={{
              animation: projects.length > 0 && !isPaused ? `slide ${animationDuration}s linear infinite` : 'none',
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
              [...projects, ...projects].map((project, idx) => (
                <div
                  key={project.id + '-' + idx}
                  className="bg-white rounded-lg shadow-md hover:shadow-lg p-4 flex flex-col items-center min-w-[240px] max-w-[240px] mx-2 transition-shadow duration-200"
                  onMouseEnter={() => setIsPaused(true)}
                  onMouseLeave={() => setIsPaused(false)}
                >
                  <img
                    src={project.icon_image ? BASE_URL + 'storage/' + project.icon_image : PLACEHOLDER_IMAGE}
                    alt={project.project_title}
                    className="h-28 w-40 object-cover rounded-md mb-3 border"
                    style={{ margin: '0 auto' }}
                  />
                  <div className="font-semibold text-base text-center mb-1 line-clamp-2">{project.project_title}</div>
                  <div className="text-gray-600 text-xs text-center mb-2 line-clamp-2" style={{display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'}}>{project.project_description}</div>
                  <div className="text-xs text-gray-500 mb-2">Raised: {formatCurrency(project.amount || 0)}</div>
                  <button
                    className="mt-2 bg-blue-100 text-blue-700 py-0.5 px-2 rounded flex items-center gap-1 text-xs font-semibold shadow-sm hover:bg-blue-200 hover:text-blue-900 transition-all duration-150"
                    style={{ fontSize: '0.75rem' }}
                    onClick={() => window.location.href = `/donations?project=${encodeURIComponent(project.project_title)}`}
                  >
                    <FaHandHoldingHeart className="text-xs" />
                    Contribute
                  </button>
                </div>
              ))
            )}
          </div>
          {/* Slider animation style */}
          <style>{`
            @keyframes slide {
              0% { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
            .animate-slide:hover {
              animation-play-state: paused !important;
            }
          `}</style>
        </div>
      </div>

      {/* Notifications */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <ClockIcon className="h-5 w-5 text-primary-600" />
          <h3 className="text-lg font-semibold">Notifications</h3>
        </div>
        <ul className="divide-y divide-gray-100 bg-white rounded-lg shadow">
          {notifications.map((note) => (
            <li key={note.id} className="px-4 py-2 flex justify-between items-center">
              <span className="text-sm text-gray-700">{note.message}</span>
              <span className="text-xs text-gray-400">{note.time}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Home; 