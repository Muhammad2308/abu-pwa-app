import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa';

const Register = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to donation form
    navigate('/donations');
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="animate-pulse">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
            <FaArrowRight className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Redirecting...</h1>
          <p className="text-gray-600">Taking you to the donation form</p>
        </div>
      </div>
    </div>
  );
};

export default Register; 