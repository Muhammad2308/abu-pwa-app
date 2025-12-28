import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { formatNaira, donationsAPI, getBaseUrl, donorsAPI, messagesAPI } from '../services/api';
import { ArrowUpRightIcon, ClockIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { FaHeart, FaChevronRight, FaSpinner, FaUserFriends, FaTimes, FaChevronLeft, FaEye, FaPaperPlane, FaUser } from 'react-icons/fa';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const Home = () => {
  const { user, isAuthenticated } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalDonated, setTotalDonated] = useState(0);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [donationHistory, setDonationHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Alumni Directory State
  const [donors, setDonors] = useState([]);
  const [donorsLoading, setDonorsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [selectedDonor, setSelectedDonor] = useState(null);
  const [messageContent, setMessageContent] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const navigate = useNavigate();

  // Helper to normalize image path
  const normalizeImagePath = (imagePath) => {
    const baseUrl = getBaseUrl();
    if (!imagePath || imagePath.trim() === '') return null;

    const path = imagePath.trim();
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
    if (normalizedPath.startsWith('storage/')) {
      return baseUrl + normalizedPath;
    }
    return baseUrl + 'storage/' + normalizedPath;
  };

  // Helper to get single image for a project
  const getProjectImage = (project) => {
    const iconImage = project.icon_image || project.icon_image_path || project.icon_image_url;
    if (iconImage && iconImage.trim() !== '') {
      return normalizeImagePath(iconImage);
    }

    if (project.photos && Array.isArray(project.photos) && project.photos.length > 0) {
      for (const photo of project.photos) {
        const bodyImage = photo.body_image || photo.body_image_path;
        if (bodyImage && bodyImage.trim() !== '') {
          return normalizeImagePath(bodyImage);
        }
      }
    }

    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';
  };

  // Helper to get all images for a project
  const getAllProjectImages = (project) => {
    const images = [];
    const iconImage = project.icon_image || project.icon_image_path || project.icon_image_url;
    if (iconImage && iconImage.trim() !== '') {
      images.push({
        url: normalizeImagePath(iconImage),
        title: project.project_title,
        description: project.project_description
      });
    }

    if (project.photos && Array.isArray(project.photos) && project.photos.length > 0) {
      project.photos.forEach((photo) => {
        const bodyImage = photo.body_image || photo.body_image_path;
        if (bodyImage && bodyImage.trim() !== '') {
          const normalized = normalizeImagePath(bodyImage);
          if (normalized && !images.some(img => img.url === normalized)) {
            images.push({
              url: normalized,
              title: photo.title || project.project_title,
              description: photo.description || project.project_description
            });
          }
        }
      });
    }

    if (images.length === 0) {
      return [{
        url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==',
        title: 'No Image',
        description: ''
      }];
    }
    return images;
  };

  const openImageGallery = (project, imageIndex = 0) => {
    setSelectedProject(project);
    setSelectedImageIndex(imageIndex);
    setShowImageGallery(true);
  };

  const closeImageGallery = () => {
    setShowImageGallery(false);
    setSelectedProject(null);
    setSelectedImageIndex(0);
  };

  const previousImage = () => {
    if (!selectedProject) return;
    const images = getAllProjectImages(selectedProject);
    setSelectedImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const nextImage = () => {
    if (!selectedProject) return;
    const images = getAllProjectImages(selectedProject);
    setSelectedImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  // Fetch projects
  const fetchProjects = () => {
    setLoading(true);
    api.get('/api/projects-with-photos')
      .then(res => {
        const activeProjects = (res.data.data || res.data).filter(project => project.status === 'active' || !project.deleted_at);
        setProjects(activeProjects);
        setLoading(false);
      })
      .catch(() => {
        api.get('/api/projects')
          .then(res => {
            const activeProjects = (res.data.data || res.data).filter(project => !project.deleted_at);
            setProjects(activeProjects);
            setLoading(false);
          })
          .catch(() => setLoading(false));
      });
  };

  // Fetch donors
  const fetchDonors = (query = '') => {
    setDonorsLoading(true);
    donorsAPI.getAll(query)
      .then(res => {
        const data = res.data.data || res.data || [];
        setDonors(data);
        setDonorsLoading(false);
      })
      .catch(() => {
        setDonors([]);
        setDonorsLoading(false);
      });
  };

  useEffect(() => {
    fetchProjects();
    fetchDonors();
  }, []);

  // Debounced search for donors
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDonors(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch donation total and history
  useEffect(() => {
    if (isAuthenticated && user) {
      setHistoryLoading(true);
      donationsAPI.getHistory().then(res => {
        const allDonations = res.data.donations || res.data || [];
        const userDonations = allDonations.filter(d => (d.donor_id || d.donor?.id) === user.id);
        const sum = userDonations.reduce((acc, d) => acc + Number(d.amount || d.type || 0), 0);
        setTotalDonated(sum);
        setDonationHistory(userDonations);
        setHistoryLoading(false);
      }).catch(() => {
        setTotalDonated(0);
        setDonationHistory([]);
        setHistoryLoading(false);
      });
    }
  }, [isAuthenticated, user]);

  const handleSendMessage = async () => {
    if (!messageContent.trim()) {
      toast.error('Please enter a message.');
      return;
    }

    if (!isAuthenticated) {
      toast.error('Please login to send messages.');
      return;
    }

    setSendingMessage(true);
    try {
      await messagesAPI.send({
        receiver_id: selectedDonor.id,
        content: messageContent
      });
      toast.success(`Message sent to ${selectedDonor.name}!`);
      setShowComposeModal(false);
      setMessageContent('');
      setSelectedDonor(null);
    } catch (error) {
      toast.error('Failed to send message. Please try again.');
    } finally {
      setSendingMessage(false);
    }
  };

  return (
    <div className="pb-20">
      {/* Green Header Extension */}
      <div className="bg-abu-green pt-2 pb-16 px-4 rounded-b-[40px] relative">
        {/* Dashboard Card */}
        <div className="dashboard-card p-6 mt-2">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">My Total Donations</p>
              <h2 className="text-3xl font-bold text-gray-900">
                {formatNaira(isAuthenticated && user ? totalDonated : 0)}
              </h2>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Contributor</p>
              <p className="text-sm font-bold text-abu-green">
                {isAuthenticated && user ? ([user.name, user.surname].filter(Boolean).join(' ') || user.email) : 'Guest'}
              </p>
            </div>
          </div>

          {/* Tier Progress - Segmented Style */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-500 font-medium">Tier Progress</span>
              <span className="text-xs font-bold text-abu-green">
                {totalDonated >= 1000000 ? '100%' :
                  totalDonated >= 100000 ? '65%' :
                    totalDonated >= 1 ? '30%' : '0%'}
              </span>
            </div>
            {/* Segmented Progress Bar */}
            <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-100 border border-gray-200 shadow-inner mb-3">
              {/* Tier 1: 1 - 100,000 */}
              <div className={`flex-1 transition-colors duration-300 ${totalDonated >= 1 ? 'bg-gray-900' : 'bg-gray-200'}`}></div>
              {/* Tier 2: 100,000 - 999,999 */}
              <div className={`flex-1 transition-colors duration-300 ${totalDonated >= 100000 ? 'bg-orange-400' : 'bg-gray-200'}`}></div>
              {/* Tier 3: 1,000,000+ */}
              <div className={`flex-1 transition-colors duration-300 ${totalDonated >= 1000000 ? 'bg-green-500' : 'bg-gray-200'}`}></div>
            </div>
            <div className="flex justify-between gap-2">
              <span className={`flex-1 text-center py-1 rounded-lg text-[10px] font-bold border ${totalDonated >= 1 ? 'bg-abu-green-light text-abu-green border-abu-green/20' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>Tier 1</span>
              <span className={`flex-1 text-center py-1 rounded-lg text-[10px] font-bold border ${totalDonated >= 100000 ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>Tier 2</span>
              <span className={`flex-1 text-center py-1 rounded-lg text-[10px] font-bold border ${totalDonated >= 1000000 ? 'bg-green-50 text-green-600 border-green-200' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>Tier 3</span>
            </div>
          </div>

          {/* Dashboard Actions */}
          <div className="flex items-center gap-4">
            <button
              className="flex-1 py-3 rounded-2xl text-sm font-bold bg-orange-50 text-orange-600 border border-orange-100 flex items-center justify-center gap-2 transition-all hover:bg-orange-100 active:scale-95 group"
              onClick={() => {
                if (isAuthenticated && user) {
                  setShowHistoryModal(true);
                } else {
                  toast.info('Please login to view your transaction history');
                }
              }}
            >
              <ClockIcon className="w-5 h-5 text-orange-500 group-hover:rotate-12 transition-transform" />
              History
            </button>
            <button
              className="flex-[1.2] py-3 rounded-2xl text-sm font-bold bg-abu-green text-white shadow-lg shadow-abu-green/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
              onClick={() => navigate('/donations')}
            >
              <ArrowUpRightIcon className="w-4 h-4" />
              Donate
            </button>
          </div>
        </div>
      </div>

      {/* Featured Projects Section */}
      <div className="px-4 mt-8">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-900">Featured Projects</h3>
          <p className="text-sm text-gray-500">Make an impact today</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <FaSpinner className="w-8 h-8 text-abu-green animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <FaSpinner className="w-10 h-10 text-gray-300" />
            </div>
            <h4 className="text-base font-bold text-gray-900 mb-1">No active projects</h4>
            <p className="text-xs text-gray-400">Check back later for new initiatives</p>
          </div>
        ) : (
          <div className="space-y-8 h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {projects.map((project) => {
              const projectImage = getProjectImage(project);
              const raisedAmount = Number(project.raised || project.amount || project.current_amount || 0);
              const targetAmount = Number(project.target || project.target_amount || 0);
              const progressPercentage = targetAmount > 0 ? Math.min((raisedAmount / targetAmount) * 100, 100) : 0;

              return (
                <div key={project.id} className="project-card">
                  {/* Image Section */}
                  <div
                    className="relative h-64 overflow-hidden cursor-pointer group"
                    onClick={() => openImageGallery(project, 0)}
                  >
                    <img
                      src={projectImage}
                      alt={project.project_title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <FaEye className="text-white opacity-0 group-hover:opacity-100 w-8 h-8 drop-shadow-lg" />
                    </div>
                    <div className="absolute top-4 left-4">
                      <span className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-lg text-[10px] font-bold text-gray-900 uppercase tracking-wider shadow-sm">
                        {project.category || 'Infrastructure'}
                      </span>
                    </div>
                    <button className="absolute top-4 right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg text-gray-300 hover:text-red-500 transition-colors">
                      <FaHeart className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Content Section */}
                  <div className="p-5">
                    <h4 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1">
                      {project.project_title}
                    </h4>
                    <p className="text-sm text-gray-500 mb-4 line-clamp-2 leading-relaxed">
                      {project.project_description}
                    </p>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden mb-3">
                        <div
                          className="h-full bg-gradient-to-r from-abu-green to-abu-green-dark rounded-full transition-all duration-1000"
                          style={{ width: `${progressPercentage}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-lg font-bold text-gray-900">{formatNaira(raisedAmount)}</p>
                          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Raised of {formatNaira(targetAmount)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-abu-green">{Math.round(progressPercentage)}%</p>
                          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Funded</p>
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 mb-5 text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <FaUserFriends className="w-4 h-4" />
                        <span className="text-xs font-medium">324 backers</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <ClockIcon className="w-4 h-4" />
                        <span className="text-xs font-medium">45 days left</span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={() => navigate(`/donations?project=${encodeURIComponent(project.project_title)}`)}
                      className="w-full py-3.5 rounded-xl bg-abu-green text-white font-bold text-sm shadow-lg hover:bg-abu-green-dark transition-all"
                    >
                      Support This Project
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Alumni Directory Section */}
      <div className="px-4 mt-12 mb-8">
        <div className="bg-white rounded-[32px] border-2 border-dashed border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#E6F3EF] rounded-2xl flex items-center justify-center text-abu-green">
                <FaUserFriends className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Alumni Directory</h3>
                <p className="text-xs text-gray-500">Connect and invite fellow alumni</p>
              </div>
            </div>
            <button
              onClick={() => {
                if (isAuthenticated) {
                  toast.info('Select an alumni to message');
                } else {
                  toast.error('Please login to message alumni');
                }
              }}
              className="px-5 py-2.5 bg-abu-green text-white text-sm font-bold rounded-xl shadow-lg shadow-abu-green/20 transition-transform active:scale-95"
            >
              Compose
            </button>
          </div>

          <div className="relative mb-8">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-abu-green/10 transition-all placeholder:text-gray-400"
            />
          </div>

          {donorsLoading ? (
            <div className="flex justify-center py-12">
              <FaSpinner className="w-8 h-8 text-abu-green animate-spin" />
            </div>
          ) : donors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-20 h-20 bg-[#F8FAFC] rounded-full flex items-center justify-center mb-4">
                <FaUserFriends className="w-10 h-10 text-[#CBD5E1]" />
              </div>
              <h4 className="text-base font-bold text-gray-900 mb-1">No alumni available</h4>
              <p className="text-xs text-gray-400">Alumni list will appear here once available</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {donors.map((donor) => (
                <div key={donor.id} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:border-abu-green/20 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white border border-gray-100 flex items-center justify-center overflow-hidden">
                      {donor.profile_image ? (
                        <img
                          src={donor.profile_image.startsWith('http') ? donor.profile_image : `${getBaseUrl()}storage/${donor.profile_image}`}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <FaUser className="w-6 h-6 text-gray-300" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{[donor.name, donor.surname].filter(Boolean).join(' ')}</p>
                      <p className="text-[10px] text-gray-500 truncate max-w-[150px]">{donor.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (isAuthenticated) {
                        setSelectedDonor(donor);
                        setShowComposeModal(true);
                      } else {
                        toast.error('Please login to send messages');
                      }
                    }}
                    className="px-4 py-2 bg-white text-abu-green border border-abu-green/20 text-xs font-bold rounded-lg hover:bg-abu-green hover:text-white transition-all"
                  >
                    Message
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Compose Message Modal */}
      {showComposeModal && selectedDonor && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-lg rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-abu-green-light flex items-center justify-center text-abu-green">
                  <FaPaperPlane className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Send Message</h3>
                  <p className="text-xs text-gray-500">To: {[selectedDonor.name, selectedDonor.surname].filter(Boolean).join(' ')}</p>
                </div>
              </div>
              <button
                onClick={() => setShowComposeModal(false)}
                className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FaTimes />
              </button>
            </div>

            <div className="p-6">
              <textarea
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder="Type your message here..."
                className="w-full h-40 p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-abu-green/10 transition-all resize-none"
              ></textarea>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setShowComposeModal(false)}
                className="flex-1 py-4 rounded-2xl bg-white text-gray-500 font-bold text-sm border border-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSendMessage}
                disabled={sendingMessage}
                className="flex-[2] py-4 rounded-2xl bg-abu-green text-white font-bold text-sm shadow-lg shadow-abu-green/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {sendingMessage ? <FaSpinner className="animate-spin" /> : <FaPaperPlane className="w-4 h-4" />}
                Send Message
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Donation History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-lg rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Donation History</h3>
                <p className="text-xs text-gray-500">Your contributions to ABU</p>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FaTimes />
              </button>
            </div>

            <div className="flex-grow overflow-y-auto p-6">
              {historyLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <FaSpinner className="w-8 h-8 text-abu-green animate-spin mb-4" />
                  <p className="text-sm text-gray-500">Loading history...</p>
                </div>
              ) : donationHistory.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ClockIcon className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="text-gray-500 font-medium">No donations yet</p>
                  <p className="text-xs text-gray-400 mt-1">Your impact will show up here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {donationHistory.map((donation, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-abu-green-light flex items-center justify-center text-abu-green">
                          <ArrowUpRightIcon className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{donation.project_title || 'General Donation'}</p>
                          <p className="text-[10px] text-gray-500">
                            {new Date(donation.created_at).toLocaleDateString('en-NG', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">{formatNaira(donation.amount || donation.type)}</p>
                        <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Successful</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-100">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="w-full py-4 rounded-2xl bg-abu-green text-white font-bold text-sm shadow-lg shadow-abu-green/20"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Gallery Modal */}
      {showImageGallery && selectedProject && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex flex-col items-center justify-center p-4">
          <button
            onClick={closeImageGallery}
            className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors z-[110]"
          >
            <FaTimes className="w-6 h-6" />
          </button>

          <div className="relative w-full max-w-4xl aspect-video flex items-center justify-center">
            {/* Navigation Buttons */}
            <button
              onClick={previousImage}
              className="absolute left-0 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors z-[110]"
            >
              <FaChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-0 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors z-[110]"
            >
              <FaChevronRight className="w-5 h-5" />
            </button>

            {/* Main Image */}
            <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-2xl">
              <img
                src={getAllProjectImages(selectedProject)[selectedImageIndex].url}
                alt="Project Gallery"
                className="max-w-full max-h-full object-contain"
              />

              {/* Overlay with Title and Description - Covers half the center */}
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex flex-col justify-end p-8 text-center">
                <div className="max-w-2xl mx-auto">
                  <h3 className="text-2xl font-bold text-white mb-3">
                    {getAllProjectImages(selectedProject)[selectedImageIndex].title}
                  </h3>
                  <p className="text-base text-white/80 leading-relaxed line-clamp-3">
                    {getAllProjectImages(selectedProject)[selectedImageIndex].description}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Thumbnails */}
          <div className="mt-8 flex gap-3 overflow-x-auto pb-4 px-4 max-w-full">
            {getAllProjectImages(selectedProject).map((img, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedImageIndex(idx)}
                className={`flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 transition-all ${selectedImageIndex === idx ? 'border-abu-green scale-110 shadow-lg' : 'border-transparent opacity-50 hover:opacity-100'}`}
              >
                <img src={img.url} alt="Thumbnail" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;