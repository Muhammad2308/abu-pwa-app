import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { FaEnvelope, FaSpinner, FaArrowLeft } from 'react-icons/fa';
import abuLogo from '../assets/abu_logo.png';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate email
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await requestPasswordReset(email.trim());
      
      if (result.success) {
        setSuccess(true);
        toast.success('Password reset code sent to your email!');
        // Redirect to verification page after 2 seconds
        setTimeout(() => {
          navigate('/reset-password', { 
            state: { email: email.trim() },
            replace: true 
          });
        }, 2000);
      } else {
        setError(result.message || 'Failed to send reset code');
        toast.error(result.message || 'Failed to send reset code');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      const errorMsg = error.response?.data?.message || error.message || 'An error occurred. Please try again.';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <img src={abuLogo} alt="ABU Logo" className="h-16 w-auto" />
            <div className="flex flex-col justify-center ml-3 h-16 text-left">
              <span className="text-sm font-bold leading-tight text-gray-800" style={{lineHeight: '1.1'}}>ABU Endowment</span>
              <span className="text-xs font-bold text-gray-800 leading-none">& Crowd Funding</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Forgot Password</h1>
          <p className="text-gray-600">
            {success 
              ? 'Check your email for the reset code' 
              : 'Enter your email address and we\'ll send you a reset code'}
          </p>
        </div>

        {success ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaEnvelope className="text-2xl text-green-600" />
            </div>
            <p className="text-gray-700 mb-2">Reset code sent to:</p>
            <p className="text-sm font-semibold text-blue-600 mb-4">{email}</p>
            <p className="text-sm text-gray-500">Redirecting to verification page...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaEnvelope className="text-gray-400" />
                </div>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    error ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter your email address"
                  disabled={isSubmitting}
                  required
                />
              </div>
              {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <FaSpinner className="animate-spin" />
                  <span>Sending code...</span>
                </>
              ) : (
                'Send Reset Code'
              )}
            </button>
          </form>
        )}

        {/* Back to Login Link */}
        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 font-medium"
          >
            <FaArrowLeft className="w-3 h-3" />
            <span>Back to Login</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

