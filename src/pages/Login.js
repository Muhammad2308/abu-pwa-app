import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { FaEnvelope, FaLock, FaSpinner } from 'react-icons/fa';
import abuLogo from '../assets/abu_logo.png';
import { GoogleSignInButton } from '../hooks/useGoogleAuth';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, googleLogin, isAuthenticated, loading, user, isDeviceRecognized, hasDonorSession } = useAuth();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && isAuthenticated) {
      const redirectTo = location.state?.from?.pathname || '/';
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, loading, navigate, location]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const result = await login({
        username: formData.email.trim(), // Backend expects 'username' but we use email
        password: formData.password,
      });

      if (result.success) {
        toast.success(result.message || 'Login successful!');
        const redirectTo = location.state?.from?.pathname || '/';
        navigate(redirectTo, { replace: true });
      } else {
        // Show error message - if it's a Google account error, show it prominently
        const errorMsg = result.message || 'Login failed';
        const isGoogleAccountError = errorMsg.toLowerCase().includes('google');
        
        if (isGoogleAccountError) {
          toast.error(errorMsg, { 
            duration: 6000,
            icon: '🔵',
          });
        } else {
          toast.error(errorMsg);
        }
        setErrors({ submit: errorMsg });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('An unexpected error occurred');
      setErrors({ submit: 'An unexpected error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Google OAuth Login Handler
  const handleGoogleLogin = async (idToken) => {
    setIsGoogleLoading(true);
    try {
      const result = await googleLogin(idToken);
      if (result.success) {
        toast.success(result.message || 'Google login successful!');
        // Small delay to ensure state is updated before navigation
        setTimeout(() => {
          const redirectTo = location.state?.from?.pathname || '/';
          navigate(redirectTo, { replace: true });
        }, 100);
      } else {
        // Show detailed error message
        const errorMsg = result.message || 'Google login failed';
        toast.error(errorMsg, { duration: 5000 });
      }
    } catch (error) {
      console.error('Google login error:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Google login failed. Please try again.';
      toast.error(errorMsg, { duration: 5000 });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="text-center">
          <FaSpinner className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

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
          {isDeviceRecognized && user && hasDonorSession ? (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back, {user.name || user.surname || 'User'}!</h1>
              <p className="text-gray-600">Sign in to your account to continue</p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h1>
              <p className="text-gray-600">Sign in to your account</p>
            </>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
              Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaEnvelope className="text-gray-400" />
              </div>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter your email"
                disabled={isSubmitting}
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaLock className="text-gray-400" />
              </div>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                  errors.password ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter your password"
                disabled={isSubmitting}
              />
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password}</p>
            )}
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <FaSpinner className="animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              'Sign In'
            )}
          </button>

          {/* Divider */}
          <div className="flex items-center my-4">
            <div className="flex-1 border-t border-gray-300"></div>
            <span className="px-4 text-sm text-gray-500">or</span>
            <div className="flex-1 border-t border-gray-300"></div>
          </div>

          {/* Login with Google Button */}
          <GoogleSignInButton
            onSuccess={handleGoogleLogin}
            onError={(error) => {
              toast.error(error.message || 'Google login was cancelled or failed');
              setIsGoogleLoading(false);
            }}
            text="Login with Google"
            disabled={isGoogleLoading || isSubmitting}
          />
        </form>

        {/* Register Link */}
        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="text-blue-600 font-semibold hover:text-blue-700 hover:underline"
            >
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
