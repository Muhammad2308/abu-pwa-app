import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { formatNaira } from '../services/api';
import { FaHandHoldingHeart, FaEye } from 'react-icons/fa';
import { getBaseUrl } from '../services/api';

const Projects = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

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
      .catch(err => {
        setError('Failed to load projects');
        setLoading(false);
      });
  }, []);

  // When projects update, update cache
  useEffect(() => {
    if (projects && projects.length > 0) {
      localStorage.setItem('abu_projects', JSON.stringify(projects));
    }
  }, [projects]);

  // Get project image (icon or first photo)
  const getProjectImage = (project) => {
    if (project.icon_image) {
      return getBaseUrl() + 'storage/' + project.icon_image;
    }
    if (project.photos && project.photos.length > 0) {
      return getBaseUrl() + 'storage/' + project.photos[0].body_image;
    }
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';
  };

  // Open image gallery
  const openImageGallery = (project, index) => {
    setSelectedProject(project);
    setCurrentImageIndex(index);
    setSelectedImage(true);
  };

  // Close image gallery
  const closeImageGallery = () => {
    setSelectedImage(null);
    setSelectedProject(null);
    setCurrentImageIndex(0);
  };

  // Navigate to next image
  const nextImage = () => {
    if (selectedProject && selectedProject.photos) {
      setCurrentImageIndex((prev) => (prev + 1) % selectedProject.photos.length);
    }
  };

  // Navigate to previous image
  const prevImage = () => {
    if (selectedProject && selectedProject.photos) {
      setCurrentImageIndex((prev) => (prev - 1 + selectedProject.photos.length) % selectedProject.photos.length);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading projects...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">Endowment Projects</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {projects.map((project) => {
          const projectImage = getProjectImage(project);
          const raisedAmount = Number(
            project.raised ||
            project.amount ||
            project.current_amount ||
            project.raised_amount ||
            0
          );
          const targetAmount = Number(project.target || project.target_amount || 0);
          const progressPercentage = targetAmount > 0
            ? Math.min((raisedAmount / targetAmount) * 100, 100)
            : 0;
          const isUrgent = progressPercentage > 0 && progressPercentage < 50;
          const isCompleted = progressPercentage >= 100;

          return (
            <div
              key={project.id}
              className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 transform hover:-translate-y-1"
            >
              <div
                className="relative h-48 overflow-hidden bg-gray-200 cursor-pointer"
                onClick={() => openImageGallery(project, 0)}
              >
                <img
                  src={projectImage}
                  alt={project.project_title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  onError={(e) => {
                    if (!e.target.dataset.errorLogged) {
                      console.warn('Image load error for project:', project.project_title, 'URL:', e.target.src);
                      e.target.dataset.errorLogged = 'true';
                    }
                    if (!e.target.src.includes('data:image')) {
                      e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';
                    }
                  }}
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white bg-opacity-90 rounded-full p-2">
                    <FaEye className="w-5 h-5 text-gray-700" />
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>

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

                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-white font-bold text-xl mb-1 drop-shadow-lg line-clamp-2">
                    {project.project_title}
                  </h3>
                </div>
              </div>

              <div className="p-5">
                <p className="text-gray-600 text-sm mb-4 line-clamp-2 min-h-[2.5rem]">
                  {project.project_description}
                </p>

                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${isCompleted ? 'bg-green-500' :
                        isUrgent ? 'bg-red-500 animate-pulse' :
                          'bg-gray-500 animate-pulse'
                        }`}></div>
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Progress</span>
                    </div>
                    <span className={`text-xs font-bold ${isCompleted ? 'text-green-600' : 'text-primary-600'
                      }`}>
                      {targetAmount > 0
                        ? `${Math.round(progressPercentage)}%`
                        : raisedAmount > 0
                          ? 'Active'
                          : 'New Project'}
                    </span>
                  </div>

                  <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                    <div
                      className={`h-full rounded-full transition-all duration-500 relative overflow-hidden shadow-sm ${isCompleted
                        ? 'bg-gradient-to-r from-green-500 via-green-600 to-emerald-600'
                        : 'bg-gradient-to-r from-gray-500 via-gray-600 to-gray-700'
                        }`}
                      style={{ width: `${Math.max(progressPercentage, 2)}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-3">
                    <div>
                      <p className="text-[9px] text-gray-500 mb-0.5 uppercase tracking-wide">Raised</p>
                      <p className="text-xs font-semibold text-gray-900">{formatNaira(raisedAmount)}</p>
                    </div>
                    {targetAmount > 0 && (
                      <div className="text-right">
                        <p className="text-[9px] text-gray-500 mb-0.5 uppercase tracking-wide">Target</p>
                        <p className="text-xs font-semibold text-primary-600">{formatNaira(targetAmount)}</p>
                      </div>
                    )}
                  </div>
                </div>

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

                <p className="text-center text-xs text-gray-400 mt-3 italic">
                  Every contribution makes a difference 💙
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {selectedImage && selectedProject && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={closeImageGallery}
        >
          <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={closeImageGallery}
              className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75 transition z-10"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <img
              src={selectedProject.photos && selectedProject.photos.length > 0
                ? getBaseUrl() + 'storage/' + selectedProject.photos[currentImageIndex].body_image
                : getProjectImage(selectedProject)}
              alt={selectedProject.project_title}
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
            />

            {selectedProject.photos && selectedProject.photos.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white bg-black bg-opacity-50 rounded-full p-3 hover:bg-opacity-75 transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white bg-black bg-opacity-50 rounded-full p-3 hover:bg-opacity-75 transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}

            {selectedProject.photos && selectedProject.photos.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white bg-black bg-opacity-50 px-4 py-2 rounded-full">
                {currentImageIndex + 1} / {selectedProject.photos.length}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;
