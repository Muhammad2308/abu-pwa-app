import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { formatNaira, getBaseUrl } from '../services/api';
import { FaHandHoldingHeart, FaEye, FaTimes, FaChevronLeft, FaChevronRight, FaSpinner, FaUserFriends } from 'react-icons/fa';
import { ClockIcon } from '@heroicons/react/24/outline';

const Projects = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    setLoading(true);
    // Use the new endpoint if available, otherwise fallback to /api/projects
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
          .catch(err => {
            setError('Failed to load projects');
            setLoading(false);
          });
      });
  }, []);

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

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <FaSpinner className="w-10 h-10 text-abu-green animate-spin mb-4" />
      <p className="text-gray-500 font-medium">Loading projects...</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
      <div className="bg-red-50 text-red-600 p-4 rounded-2xl border border-red-100 max-w-md">
        <p className="font-bold mb-1">Error</p>
        <p>{error}</p>
      </div>
    </div>
  );

  return (
    <div className="p-4 pb-24 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Endowment Projects</h1>
        <p className="text-gray-500">Browse and support our ongoing initiatives</p>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
            <FaSpinner className="w-12 h-12 text-gray-300" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No active projects</h2>
          <p className="text-gray-500 max-w-md">We are currently preparing new initiatives. Please check back soon or support our general endowment fund.</p>
          <button
            onClick={() => navigate('/donations')}
            className="mt-8 px-8 py-4 bg-abu-green text-white font-bold rounded-2xl shadow-lg shadow-abu-green/20"
          >
            Support Endowment Fund
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {projects.map((project) => {
            const projectImage = getProjectImage(project);
            const raisedAmount = Number(project.raised || project.amount || project.current_amount || 0);
            const targetAmount = Number(project.target || project.target_amount || 0);
            const progressPercentage = targetAmount > 0 ? Math.min((raisedAmount / targetAmount) * 100, 100) : 0;

            return (
              <div key={project.id} className="project-card flex flex-col">
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
                    <FaEye className="text-white opacity-0 group-hover:opacity-100 w-10 h-10 drop-shadow-lg" />
                  </div>
                  <div className="absolute top-4 left-4">
                    <span className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-lg text-[10px] font-bold text-gray-900 uppercase tracking-wider shadow-sm">
                      {project.category || 'Infrastructure'}
                    </span>
                  </div>
                </div>

                {/* Content Section */}
                <div className="p-6 flex flex-col flex-grow">
                  <h4 className="text-xl font-bold text-gray-900 mb-3 line-clamp-1">
                    {project.project_title}
                  </h4>
                  <p className="text-gray-500 mb-6 line-clamp-3 leading-relaxed flex-grow">
                    {project.project_description}
                  </p>

                  {/* Progress Bar */}
                  <div className="mb-6">
                    <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden mb-4">
                      <div
                        className="h-full bg-gradient-to-r from-abu-green to-abu-green-dark rounded-full transition-all duration-1000"
                        style={{ width: `${progressPercentage}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-xl font-bold text-gray-900">{formatNaira(raisedAmount)}</p>
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Raised of {formatNaira(targetAmount)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-abu-green">{Math.round(progressPercentage)}%</p>
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Funded</p>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-6 mb-6 text-gray-500">
                    <div className="flex items-center gap-2">
                      <FaUserFriends className="w-5 h-5 text-abu-green/60" />
                      <span className="text-sm font-medium">324 backers</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ClockIcon className="w-5 h-5 text-abu-green/60" />
                      <span className="text-sm font-medium">45 days left</span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => navigate(`/donations?project=${encodeURIComponent(project.project_title)}`)}
                    className="w-full py-4 rounded-2xl bg-abu-green text-white font-bold text-sm shadow-lg hover:bg-abu-green-dark transition-all flex items-center justify-center gap-2 group"
                  >
                    <FaHandHoldingHeart className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    Support This Project
                  </button>
                </div>
              </div>
            );
          })}
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

          <div className="relative w-full max-w-5xl aspect-video flex items-center justify-center">
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
            <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-3xl">
              <img
                src={getAllProjectImages(selectedProject)[selectedImageIndex].url}
                alt="Project Gallery"
                className="max-w-full max-h-full object-contain"
              />

              {/* Overlay with Title and Description - Covers half the center */}
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex flex-col justify-end p-10 text-center">
                <div className="max-w-3xl mx-auto">
                  <h3 className="text-3xl font-bold text-white mb-4">
                    {getAllProjectImages(selectedProject)[selectedImageIndex].title}
                  </h3>
                  <p className="text-lg text-white/80 leading-relaxed line-clamp-3">
                    {getAllProjectImages(selectedProject)[selectedImageIndex].description}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Thumbnails */}
          <div className="mt-10 flex gap-4 overflow-x-auto pb-4 px-4 max-w-full">
            {getAllProjectImages(selectedProject).map((img, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedImageIndex(idx)}
                className={`flex-shrink-0 w-24 h-16 rounded-xl overflow-hidden border-2 transition-all ${selectedImageIndex === idx ? 'border-abu-green scale-110 shadow-xl' : 'border-transparent opacity-50 hover:opacity-100'}`}
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

export default Projects;
