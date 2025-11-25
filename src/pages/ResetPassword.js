import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { FaLock, FaSpinner, FaArrowLeft, FaShieldAlt, FaEnvelopeOpenText, FaCheckCircle } from 'react-icons/fa';
import abuLogo from '../assets/abu_logo.png';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const { validateResetToken, resetPasswordWithToken } = useAuth();

  const [status, setStatus] = useState('loading'); // loading | ready | invalid | success
  const [email, setEmail] = useState('');
  const [tokenError, setTokenError] = useState('');

  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchToken = async () => {
      if (!token) {
        setStatus('invalid');
        setTokenError('Missing or invalid reset link. Please request a new one.');
        return;
      }

      setStatus('loading');
      const result = await validateResetToken(token);
      if (result.success) {
        setEmail(result.data?.username || result.data?.email || '');
        setStatus('ready');
      } else {
        setTokenError(result.message || 'This reset link is invalid or has expired.');
        setStatus('invalid');
      }
    };

    fetchToken();
  }, [token, validateResetToken]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    if (!password || password.length < 6) {
      setErrors({ password: 'Password must be at least 6 characters' });
      return;
    }

    if (password !== passwordConfirmation) {
      setErrors({ passwordConfirmation: 'Passwords do not match' });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await resetPasswordWithToken(token, password, passwordConfirmation);
      if (result.success) {
        setStatus('success');
        toast.success('Password updated successfully!');
        setTimeout(() => {
          navigate('/login', {
            replace: true,
            state: { message: 'Password reset complete. Please login with your new credentials.' },
          });
        }, 1800);
      } else {
        setErrors({ submit: result.message || 'Failed to reset password' });
        toast.error(result.message || 'Failed to reset password');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to reset password';
      setErrors({ submit: errorMsg });
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderContent = () => {
    if (status === 'loading') {
      return (
        <div className="flex flex-col items-center justify-center py-16">
          <FaSpinner className="w-10 h-10 text-blue-600 animate-spin mb-4" />
          <p className="text-gray-600 font-medium">Validating reset link...</p>
        </div>
      );
    }

    if (status === 'invalid') {
      return (
        <div className="text-center py-10">
          <div className="w-16 h-16 mx-auto bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
            <FaShieldAlt className="text-2xl" />
          </div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Link no longer valid</h2>
          <p className="text-sm text-gray-500 mb-6">{tokenError}</p>
          <Link
            to="/forgot-password"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            Request new link
          </Link>
        </div>
      );
    }

    if (status === 'success') {
      return (
        <div className="text-center py-12">
          <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
            <FaCheckCircle className="text-3xl text-green-600" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Password updated!</h2>
          <p className="text-gray-600 mb-6">Redirecting you to the login page...</p>
        </div>
      );
    }

    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
            <FaEnvelopeOpenText />
          </div>
          <div>
            <p className="text-sm text-gray-600">Resetting password for</p>
            <p className="text-base font-semibold text-gray-900">{email || 'Your account'}</p>
            <p className="text-xs text-gray-500 mt-1">This secure link expires 10 minutes after it was requested.</p>
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
            New Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaLock className="text-gray-400" />
            </div>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full pl-11 pr-4 py-3 border-2 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                errors.password ? 'border-red-500' : 'border-gray-200'
              }`}
              placeholder="Choose a strong password"
              disabled={isSubmitting}
              required
            />
          </div>
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password}</p>
          )}
        </div>

        <div>
          <label htmlFor="passwordConfirmation" className="block text-sm font-semibold text-gray-700 mb-2">
            Confirm Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaLock className="text-gray-400" />
            </div>
            <input
              type="password"
              id="passwordConfirmation"
              name="passwordConfirmation"
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              className={`w-full pl-11 pr-4 py-3 border-2 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                errors.passwordConfirmation ? 'border-red-500' : 'border-gray-200'
              }`}
              placeholder="Repeat new password"
              disabled={isSubmitting}
              required
            />
          </div>
          {errors.passwordConfirmation && (
            <p className="mt-1 text-sm text-red-600">{errors.passwordConfirmation}</p>
          )}
        </div>

        {errors.submit && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 text-sm text-red-600">
            {errors.submit}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white py-3 rounded-2xl font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <FaSpinner className="animate-spin" />
              <span>Updating password...</span>
            </>
          ) : (
            'Update Password'
          )}
        </button>
      </form>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6">
        <div className="bg-white rounded-3xl shadow-2xl border border-white/40 p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white via-transparent to-purple-50 opacity-80" />
          <div className="relative z-10">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center mb-4">
                <img src={abuLogo} alt="ABU Logo" className="h-16 w-auto" />
                <div className="flex flex-col justify-center ml-3 h-16 text-left">
                  <span className="text-sm font-bold leading-tight text-gray-800 tracking-wide">ABU Endowment</span>
                  <span className="text-xs font-bold text-gray-600 leading-none">& Crowd Funding</span>
                </div>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Reset your password</h1>
              <p className="text-gray-600">Keep your credentials secure with our 10-minute unique links.</p>
            </div>

            {renderContent()}

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

        <div className="bg-white/80 backdrop-blur rounded-3xl border border-white/60 shadow-xl p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Security snapshot</h2>
            <p className="text-sm text-gray-500">How we keep your reset link safe</p>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-2xl border border-gray-100 bg-gradient-to-br from-blue-50 to-white">
              <h3 className="font-semibold text-gray-900 mb-1">10-minute link</h3>
              <p className="text-sm text-gray-500">Every reset link expires in 10 minutes. Request a new one if time runs out.</p>
            </div>
            <div className="p-4 rounded-2xl border border-gray-100 bg-gradient-to-br from-purple-50 to-white">
              <h3 className="font-semibold text-gray-900 mb-1">Session aware</h3>
              <p className="text-sm text-gray-500">Each link is tied to a single session, preventing reuse across devices.</p>
            </div>
            <div className="p-4 rounded-2xl border border-gray-100 bg-gradient-to-br from-indigo-50 to-white">
              <h3 className="font-semibold text-gray-900 mb-1">Email verified</h3>
              <p className="text-sm text-gray-500">Only the registered email can receive a reset link—no shortcuts.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;

