import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { FaGraduationCap, FaUserGraduate, FaUsers } from 'react-icons/fa';
import toast from 'react-hot-toast';

const Register = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { register: registerUser, loading } = useAuth();
  const navigate = useNavigate();
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();

  const password = watch('password');
  const [selectedType, setSelectedType] = useState('');

  const donorTypes = [
    {
      id: 'addressable_alumni',
      title: 'Addressable Alumni',
      description: 'I am an ABU graduate with records in the database',
      icon: FaGraduationCap,
      color: 'blue'
    },
    {
      id: 'non_addressable_alumni',
      title: 'Non-addressable Alumni',
      description: 'I am an ABU graduate but not in the database',
      icon: FaUserGraduate,
      color: 'green'
    },
    {
      id: 'friends',
      title: 'Friends',
      description: 'I am a friend/supporter of ABU',
      icon: FaUsers,
      color: 'purple'
    }
  ];

  const handleTypeSelect = (typeId) => {
    setSelectedType(typeId);
  };

  const handleContinue = async () => {
    if (!selectedType) {
      toast.error('Please select a donor type');
      return;
    }

    try {
      // Navigate to the appropriate registration form based on type
      navigate(`/register/${selectedType}`);
    } catch (error) {
      console.error('Navigation error:', error);
      toast.error('An error occurred. Please try again.');
    }
  };

  const onSubmit = async (data) => {
    const result = await registerUser(data);
    if (result.success) {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Join Our Donor Community</h1>
          <p className="text-gray-600">Select your donor type to get started</p>
        </div>

        {/* Donor Type Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {donorTypes.map((type) => {
            const IconComponent = type.icon;
            const isSelected = selectedType === type.id;
            
            return (
              <div
                key={type.id}
                className={`relative bg-white rounded-xl shadow-lg p-6 cursor-pointer transition-all duration-300 transform hover:scale-105 ${
                  isSelected 
                    ? `ring-4 ring-${type.color}-500 shadow-xl` 
                    : 'hover:shadow-xl'
                }`}
                onClick={() => handleTypeSelect(type.id)}
              >
                {/* Selection Ring */}
                {isSelected && (
                  <div className={`absolute -top-2 -right-2 w-8 h-8 bg-${type.color}-500 rounded-full flex items-center justify-center`}>
                    <div className="w-4 h-4 bg-white rounded-full"></div>
                  </div>
                )}

                {/* Icon */}
                <div className={`w-16 h-16 mx-auto mb-4 rounded-full bg-${type.color}-100 flex items-center justify-center`}>
                  <IconComponent className={`w-8 h-8 text-${type.color}-600`} />
                </div>

                {/* Content */}
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{type.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{type.description}</p>
                </div>

                {/* Radio Button */}
                <div className="mt-4 flex justify-center">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    isSelected 
                      ? `border-${type.color}-500 bg-${type.color}-500` 
                      : 'border-gray-300'
                  }`}>
                    {isSelected && (
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Continue Button */}
        <div className="text-center">
          <button
            onClick={handleContinue}
            disabled={!selectedType || loading}
            className={`px-8 py-3 rounded-lg font-semibold text-white transition-all duration-200 transform ${
              selectedType && !loading
                ? 'bg-blue-600 hover:bg-blue-700 hover:scale-105 shadow-lg'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            {loading ? 'Loading...' : 'Continue'}
          </button>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <button
            onClick={() => navigate('/')}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default Register; 