import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../contexts/AuthContext';
import { FaGraduationCap, FaSearch } from 'react-icons/fa';
import toast from 'react-hot-toast';
import api from '../../services/api';

const AddressableAlumni = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { register: registerUser, loading } = useAuth();
  const [searching, setSearching] = useState(false);
  const [alumniData, setAlumniData] = useState(null);
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();

  const [regNumber, setRegNumber] = useState('');

  // Get redirect parameters
  const queryParams = new URLSearchParams(location.search);
  const redirectTo = queryParams.get('redirect') || '/';
  const projectParam = queryParams.get('project');

  const searchAlumni = async () => {
    if (!regNumber.trim()) {
      toast.error('Please enter your registration number');
      return;
    }

    setSearching(true);
    try {
      const response = await api.get(`/api/donors/search/${regNumber}`);
      setAlumniData(response.data);
      toast.success('Alumni record found!');
    } catch (error) {
      toast.error('Alumni record not found. Please check your registration number.');
      setAlumniData(null);
    } finally {
      setSearching(false);
    }
  };

  const onSubmit = async (data) => {
    if (!alumniData) {
      toast.error('Please search and verify your alumni record first');
      return;
    }

    const registrationData = {
      ...data,
      donor_type: 'addressable_alumni',
      alumni_data: alumniData,
      registration_number: regNumber
    };

    const result = await registerUser(registrationData);
    if (result.success) {
      // Redirect to the original destination with project parameter if available
      const redirectUrl = projectParam ? `${redirectTo}?project=${projectParam}` : redirectTo;
      navigate(redirectUrl);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
            <FaGraduationCap className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Addressable Alumni Registration</h1>
          <p className="text-gray-600">Verify your alumni record to continue</p>
        </div>

        {/* Alumni Search */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Registration Number
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={regNumber}
              onChange={(e) => setRegNumber(e.target.value)}
              placeholder="Enter your registration number"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={searchAlumni}
              disabled={searching}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
            >
              <FaSearch className="w-4 h-4" />
              {searching ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>

        {/* Alumni Data Display */}
        {alumniData && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-semibold text-green-800 mb-2">✓ Alumni Record Found</h3>
            <div className="text-sm text-green-700">
              <p><strong>Name:</strong> {alumniData.name}</p>
              <p><strong>Faculty:</strong> {alumniData.faculty?.name || 'N/A'}</p>
              <p><strong>Department:</strong> {alumniData.department?.name || 'N/A'}</p>
              <p><strong>Graduation Year:</strong> {alumniData.graduation_year || 'N/A'}</p>
            </div>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              {...register('email', { 
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address'
                }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your email"
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              {...register('phone', { 
                required: 'Phone number is required',
                pattern: {
                  value: /^[0-9+\-\s()]+$/,
                  message: 'Invalid phone number'
                }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your phone number"
            />
            {errors.phone && (
              <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              {...register('password', { 
                required: 'Password is required',
                minLength: {
                  value: 8,
                  message: 'Password must be at least 8 characters'
                }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Create a password"
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              {...register('confirmPassword', { 
                required: 'Please confirm your password',
                validate: value => value === watch('password') || 'Passwords do not match'
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Confirm your password"
            />
            {errors.confirmPassword && (
              <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !alumniData}
            className={`w-full py-3 rounded-lg font-semibold text-white transition-all duration-200 ${
              loading || !alumniData
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 hover:scale-105 shadow-lg'
            }`}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        {/* Back Button */}
        <div className="text-center mt-6">
          <button
            onClick={() => navigate('/register')}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Donor Types
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddressableAlumni; 