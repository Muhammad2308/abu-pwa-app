import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { FaEnvelope, FaSpinner, FaArrowLeft, FaShieldAlt, FaClock, FaCheckCircle } from 'react-icons/fa';
import abuLogo from '../assets/abu_logo.png';

const ForgotPassword = () => {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const steps = [
    { title: 'Request Link', description: 'Enter the email you used during registration.' },
    { title: 'Check Inbox', description: 'We’ll send a secure link that stays active for 10 minutes.' },
    { title: 'Reset Password', description: 'Follow the link to set a brand new password.' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

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
        toast.success('If an account exists, a reset link has been emailed to you.');
      } else {
        setError(result.message || 'Failed to send reset link');
        toast.error(result.message || 'Failed to send reset link');
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-100 flex items-center justify-center p-4">
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6">
        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 border border-white/40 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-transparent to-blue-50 opacity-80 pointer-events-none" />
          <div className="relative z-10">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center mb-4">
                <img src={abuLogo} alt="ABU Logo" className="h-16 w-auto drop-shadow-md" />
                <div className="flex flex-col justify-center ml-3 h-16 text-left">
                  <span className="text-sm font-bold leading-tight text-gray-800 tracking-wide">ABU Endowment</span>
                  <span className="text-xs font-bold text-gray-600 leading-none">& Crowd Funding</span>
                </div>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Forgot Password?</h1>
              <p className="text-gray-600 max-w-md mx-auto">
                {success
                  ? 'We just sent you a magic link. It expires in 10 minutes, so please act fast.'
                  : 'Enter your registered email and we’ll send you a secure reset link that stays active for 10 minutes.'}
              </p>
            </div>

            {success ? (
              <div className="bg-gradient-to-br from-green-50 to-white border-2 border-green-100 rounded-2xl p-6 text-center shadow-inner">
                <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-4">
                  <FaCheckCircle className="text-2xl text-green-600" />
                </div>
                <p className="text-gray-700 font-medium mb-1">Link sent to:</p>
                <p className="text-lg font-semibold text-blue-700">{email}</p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-sm text-gray-500 mt-4">
                  <div className="flex items-center gap-2">
                    <FaClock className="text-gray-400" />
                    <span>Expires in 10 minutes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FaShieldAlt className="text-gray-400" />
                    <span>If you didn’t request this, ignore the email.</span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-4">
                  Didn’t receive anything? Check your spam folder or try again in a few minutes.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaEnvelope className="text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`w-full pl-11 pr-4 py-3 border-2 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                        error ? 'border-red-500' : 'border-gray-200'
                      }`}
                      placeholder="e.g. musa@abu.edu.ng"
                      disabled={isSubmitting}
                      required
                    />
                  </div>
                  {error && (
                    <p className="mt-1 text-sm text-red-600">{error}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white py-3 rounded-2xl font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <FaSpinner className="animate-spin" />
                      <span>Sending link...</span>
                    </>
                  ) : (
                    'Email me the reset link'
                  )}
                </button>
              </form>
            )}

            <div className="mt-8 text-center">
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

        {/* Side Panel */}
        <div className="bg-white/80 backdrop-blur rounded-3xl border border-white/60 shadow-xl p-6 flex flex-col gap-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">How it works</h2>
            <p className="text-sm text-gray-500">Quick three-step flow designed for security.</p>
          </div>
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={step.title} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-white flex items-center justify-center font-semibold text-sm shadow-lg">
                    {index + 1}
                  </div>
                  {index !== steps.length - 1 && <div className="flex-1 w-px bg-gray-200 mt-1 mb-1" />}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">{step.title}</h3>
                  <p className="text-sm text-gray-500">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
            <h4 className="text-sm font-semibold text-blue-800 mb-1">Security Reminder</h4>
            <p className="text-sm text-blue-700">
              ABU staff will never ask for this link. Only reset your password from a trusted device.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

