import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { FaEnvelope, FaLock, FaSpinner, FaTimes } from 'react-icons/fa';
import abuLogo from '../assets/abu_logo.png';
import { GoogleSignInButton } from '../hooks/useGoogleAuth';
import { Link } from 'react-router-dom';

const AuthModal = ({ isOpen, onClose, onSuccess }) => {
  const { login, register, googleLogin, googleRegister, isAuthenticated, user } = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  
  const [loginFormData, setLoginFormData] = useState({
    email: '',
    password: ''
  });
  const [registerFormData, setRegisterFormData] = useState({
    email: '',
    password: '',
    password_confirmation: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  if (!isOpen) return null;

  // Show loading overlay if redirecting
  if (isRedirecting) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <FaSpinner className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Redirecting...</p>
        </div>
      </div>
    );
  }

  const handleLoginChange = (e) => {
    const { name, value } = e.target;
    setLoginFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleRegisterChange = (e) => {
    const { name, value } = e.target;
    setRegisterFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateLogin = () => {
    const newErrors = {};
    if (!loginFormData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginFormData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!loginFormData.password) {
      newErrors.password = 'Password is required';
    } else if (loginFormData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateRegister = () => {
    const newErrors = {};
    if (!registerFormData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerFormData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!registerFormData.password) {
      newErrors.password = 'Password is required';
    } else if (registerFormData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    if (!registerFormData.password_confirmation) {
      newErrors.password_confirmation = 'Please confirm your password';
    } else if (registerFormData.password !== registerFormData.password_confirmation) {
      newErrors.password_confirmation = 'Passwords do not match';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!validateLogin()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const result = await login({
        username: loginFormData.email.trim(),
        password: loginFormData.password,
      });

      if (result.success) {
        toast.success(result.message || 'Login successful!');
        setIsRedirecting(true);
        // Small delay to ensure state is fully updated
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 200);
      } else {
        const errorMsg = result.message || 'Login failed';
        const isGoogleAccountError = errorMsg.toLowerCase().includes('google');
        
        if (isGoogleAccountError) {
          toast.error(errorMsg, { duration: 6000, icon: '🔵' });
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

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!validateRegister()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const result = await register({
        email: registerFormData.email.trim(),
        password: registerFormData.password,
        password_confirmation: registerFormData.password_confirmation,
      });

      if (result.success) {
        toast.success(result.message || 'Registration successful!');
        setIsRedirecting(true);
        // Small delay to ensure state is fully updated
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 200);
      } else {
        const errorMsg = result.message || 'Registration failed';
        toast.error(errorMsg);
        setErrors({ submit: errorMsg });
      }
    } catch (error) {
      console.error('Register error:', error);
      toast.error('An unexpected error occurred');
      setErrors({ submit: 'An unexpected error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async (idToken) => {
    setIsGoogleLoading(true);
    try {
      const result = await googleLogin(idToken);
      if (result.success) {
        toast.success(result.message || 'Google login successful!');
        setIsRedirecting(true);
        // Wait for state to be fully updated before closing
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 300);
      } else {
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

  const handleGoogleRegister = async (idToken) => {
    setIsGoogleLoading(true);
    try {
      const result = await googleRegister(idToken);
      if (result.success) {
        toast.success(result.message || 'Google registration successful!');
        setIsRedirecting(true);
        // Small delay to ensure state is fully updated
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 300);
      } else {
        // Check if it's a 409 (account already exists) - automatically try login instead
        if (result.error?.response?.status === 409) {
          toast('Account already exists. Logging you in...', { duration: 3000, icon: '🔄' });
          
          try {
            const loginResult = await googleLogin(idToken);
            if (loginResult.success) {
              toast.success('Successfully logged in!');
              setIsRedirecting(true);
              setTimeout(() => {
                if (onSuccess) onSuccess();
                onClose();
              }, 300);
            } else {
              toast.error(loginResult.message || 'Please login manually');
            }
          } catch (loginError) {
            console.error('Auto-login failed:', loginError);
            toast.error('Please login manually');
          }
        } else {
          const errorMsg = result.message || 'Google registration failed';
          toast.error(errorMsg, { duration: 6000 });
        }
      }
    } catch (error) {
      console.error('Google register error:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Google registration failed. Please try again.';
      toast.error(errorMsg, { duration: 6000 });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <div className="flex justify-end p-4">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        <div className="px-8 pb-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <img src={abuLogo} alt="ABU Logo" className="h-16 w-auto" />
              <div className="flex flex-col justify-center ml-3 h-16 text-left">
                <span className="text-sm font-bold leading-tight text-gray-800" style={{lineHeight: '1.1'}}>ABU Endowment</span>
                <span className="text-xs font-bold text-gray-800 leading-none">& Crowd Funding</span>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {isLoginMode ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="text-gray-600">
              {isLoginMode ? 'Sign in to your account' : 'Register to get started'}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => {
                setIsLoginMode(true);
                setErrors({});
                setLoginFormData({ email: '', password: '' });
                setRegisterFormData({ email: '', password: '', password_confirmation: '' });
              }}
              className={`flex-1 py-2 px-4 rounded-md font-semibold transition-all ${
                isLoginMode
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => {
                setIsLoginMode(false);
                setErrors({});
                setLoginFormData({ email: '', password: '' });
                setRegisterFormData({ email: '', password: '', password_confirmation: '' });
              }}
              className={`flex-1 py-2 px-4 rounded-md font-semibold transition-all ${
                !isLoginMode
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Register
            </button>
          </div>

          {/* Login Form */}
          {isLoginMode && (
            <form onSubmit={handleLoginSubmit} className="space-y-6">
              {/* Email Field */}
              <div>
                <label htmlFor="login-email" className="block text-sm font-semibold text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaEnvelope className="text-gray-400" />
                  </div>
                  <input
                    type="email"
                    id="login-email"
                    name="email"
                    value={loginFormData.email}
                    onChange={handleLoginChange}
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
                <label htmlFor="login-password" className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaLock className="text-gray-400" />
                  </div>
                  <input
                    type="password"
                    id="login-password"
                    name="password"
                    value={loginFormData.password}
                    onChange={handleLoginChange}
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

              {/* Forgot Password Link */}
              <div className="text-right">
                <Link
                  to="/forgot-password"
                  onClick={onClose}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || isGoogleLoading}
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
          )}

          {/* Register Form */}
          {!isLoginMode && (
            <form onSubmit={handleRegisterSubmit} className="space-y-6">
              {/* Email Field */}
              <div>
                <label htmlFor="register-email" className="block text-sm font-semibold text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaEnvelope className="text-gray-400" />
                  </div>
                  <input
                    type="email"
                    id="register-email"
                    name="email"
                    value={registerFormData.email}
                    onChange={handleRegisterChange}
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

              {/* Password Fields in Flexbox */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label htmlFor="register-password" className="block text-sm font-semibold text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaLock className="text-gray-400" />
                    </div>
                    <input
                      type="password"
                      id="register-password"
                      name="password"
                      value={registerFormData.password}
                      onChange={handleRegisterChange}
                      className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                        errors.password ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Password"
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                  )}
                </div>

                <div className="flex-1">
                  <label htmlFor="register-password-confirmation" className="block text-sm font-semibold text-gray-700 mb-2">
                    Confirm
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaLock className="text-gray-400" />
                    </div>
                    <input
                      type="password"
                      id="register-password-confirmation"
                      name="password_confirmation"
                      value={registerFormData.password_confirmation}
                      onChange={handleRegisterChange}
                      className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                        errors.password_confirmation ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Confirm"
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.password_confirmation && (
                    <p className="mt-1 text-sm text-red-600">{errors.password_confirmation}</p>
                  )}
                </div>
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
                disabled={isSubmitting || isGoogleLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    <span>Registering...</span>
                  </>
                ) : (
                  'Register'
                )}
              </button>

              {/* Divider */}
              <div className="flex items-center my-4">
                <div className="flex-1 border-t border-gray-300"></div>
                <span className="px-4 text-sm text-gray-500">or</span>
                <div className="flex-1 border-t border-gray-300"></div>
              </div>

              {/* Register with Google Button */}
              <GoogleSignInButton
                onSuccess={handleGoogleRegister}
                onError={(error) => {
                  toast.error(error.message || 'Google registration was cancelled or failed');
                  setIsGoogleLoading(false);
                }}
                text="Sign up with Google"
                disabled={isGoogleLoading || isSubmitting}
              />
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;

