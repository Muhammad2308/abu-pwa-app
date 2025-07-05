import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { FaHandHoldingHeart } from 'react-icons/fa';

const BASE_URL = 'http://127.0.0.1:8000/';
const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/400x200?text=No+Image';

const Projects = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/api/projects')
      .then(res => {
        setProjects(res.data);
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to load projects');
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8 text-center">Loading projects...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Endowment Projects</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {projects.map(project => (
          <div key={project.id} className="bg-white rounded-xl shadow hover:shadow-lg transition overflow-hidden flex flex-col">
            <img
              src={project.icon_image ? BASE_URL + 'storage/' + project.icon_image : PLACEHOLDER_IMAGE}
              alt={project.project_title}
              className="h-32 w-full object-cover"
            />
            <div className="flex gap-2 overflow-x-auto px-2 py-2">
              {project.photos && project.photos.length > 0 ? (
                project.photos.map((photo, idx) => (
                  <img
                    key={photo.id}
                    src={BASE_URL + 'storage/' + photo.body_image}
                    alt={project.project_title + ' photo ' + (idx + 1)}
                    className="h-12 w-16 object-cover rounded border border-gray-200 flex-shrink-0"
                  />
                ))
              ) : (
                <span className="text-gray-400 text-xs">No photos</span>
              )}
            </div>
            <div className="p-4 flex-1 flex flex-col">
              <h2 className="font-semibold text-lg mb-1 text-primary-700">{project.project_title}</h2>
              <p className="text-gray-600 text-sm flex-1">{project.project_description}</p>
              <button
                className="mt-4 bg-blue-600 text-white py-1.5 px-4 rounded-lg flex items-center gap-2 font-medium shadow transition-all duration-200 transform hover:bg-blue-700 hover:scale-105 hover:shadow-lg"
                onClick={() => navigate(`/donations?project=${encodeURIComponent(project.project_title)}`)}
              >
                <FaHandHoldingHeart className="text-lg" />
                Contribute
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Projects; 