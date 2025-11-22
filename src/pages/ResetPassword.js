import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { FaLock, FaSpinner, FaArrowLeft, FaCheckCircle } from 'react-icons/fa';
import abuLogo from '../assets/abu_logo.png';

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyResetCode, resetPassword } = useAuth();
  const [email, setEmail] = useState(location.state?.email || '');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [step, setStep] = useState('verify'); // 'verify' or 'reset'
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [errors, setErrors] = useState({});
  const [codeVerified, setCodeVerified] = useState(false);
  const inputRefs = useRef([]);

  // Redirect if no email
  useEffect(() => {
    if (!email) {
      toast.error('Email is required. Please start from the forgot password page.');
      navigate('/forgot-password', { replace: true });
    }
  }, [email, navigate]);

  // Auto-focus first input
  useEffect(() => {
    if (inputRefs.current[0] && step === 'verify') {
      inputRefs.current[0].focus();
    }
  }, [step]);

  const handleCodeChange = (index, value) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) {
      return;
    }

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits are entered
    if (newCode.every(digit => digit !== '') && newCode.length === 6) {
      setTimeout(() => {
        handleVerifyCode();
      }, 300);
    }
  };

  const handleCodeKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    // Handle paste
    if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      navigator.clipboard.readText().then(text => {
        const digits = text.replace(/\D/g, '').slice(0, 6).split('');
        const newCode = [...code];
        digits.forEach((digit, i) => {
          if (i < 6) newCode[i] = digit;
        });
        setCode(newCode);
        if (digits.length === 6) {
          setTimeout(() => handleVerifyCode(), 300);
        } else {
          inputRefs.current[digits.length]?.focus();
        }
      });
    }
  };

  const handleVerifyCode = async () => {
    const codeString = code.join('');
    
    if (codeString.length !== 6) {
      setErrors({ code: 'Please enter the complete 6-digit code' });
      return;
    }

    setIsVerifying(true);
    setErrors({});

    try {
      const result = await verifyResetCode(email, codeString);
      
      if (result.success) {
        setCodeVerified(true);
        toast.success('Code verified! Please set your new password.');
        setStep('reset');
        setErrors({});
      } else {
        setErrors({ code: result.message || 'Invalid or expired code' });
        toast.error(result.message || 'Invalid or expired code');
        // Clear code on error
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      console.error('Verify code error:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to verify code';
      setErrors({ code: errorMsg });
      toast.error(errorMsg);
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErrors({});

    // Validation
    if (!password) {
      setErrors({ password: 'Password is required' });
      return;
    }

    if (password.length < 6) {
      setErrors({ password: 'Password must be at least 6 characters' });
      return;
    }

    if (password !== passwordConfirmation) {
      setErrors({ passwordConfirmation: 'Passwords do not match' });
      return;
    }

    setIsResetting(true);

    try {
      const codeString = code.join('');
      const result = await resetPassword(email, codeString, password);
      
      if (result.success) {
        toast.success('Password reset successful! Redirecting to login...');
        setTimeout(() => {
          navigate('/login', { 
            state: { message: 'Password reset successful. Please login with your new password.' },
            replace: true 
          });
        }, 1500);
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
      setIsResetting(false);
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {step === 'verify' ? 'Verify Reset Code' : 'Reset Password'}
          </h1>
          <p className="text-gray-600">
            {step === 'verify' 
              ? `Enter the 6-digit code sent to ${email}` 
              : 'Enter your new password'}
          </p>
        </div>

        {step === 'verify' ? (
          <div className="space-y-6">
            {/* Code Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3 text-center">
                Enter 6-Digit Code
              </label>
              <div className="flex justify-center gap-2">
                {code.map((digit, index) => (
                  <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(index, e)}
                  className={`w-12 h-14 text-center text-2xl font-bold border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                    errors.code ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={isVerifying}
                />
                ))}
              </div>
              {errors.code && (
                <p className="mt-2 text-sm text-red-600 text-center">{errors.code}</p>
              )}
              <p className="mt-3 text-xs text-gray-500 text-center">
                Code expires in 20 minutes
              </p>
            </div>

            {/* Verify Button */}
            <button
              onClick={handleVerifyCode}
              disabled={isVerifying || code.join('').length !== 6}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {isVerifying ? (
                <>
                  <FaSpinner className="animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                'Verify Code'
              )}
            </button>
          </div>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-6">
            {/* Success Message */}
            {codeVerified && (
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 flex items-center gap-3">
                <FaCheckCircle className="text-green-600 text-xl flex-shrink-0" />
                <p className="text-sm text-green-700">Code verified successfully!</p>
              </div>
            )}

            {/* New Password */}
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
                  className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter new password (min 6 characters)"
                  disabled={isResetting}
                  required
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="passwordConfirmation" className="block text-sm font-semibold text-gray-700 mb-2">
                Confirm New Password
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
                  className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    errors.passwordConfirmation ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Confirm new password"
                  disabled={isResetting}
                  required
                />
              </div>
              {errors.passwordConfirmation && (
                <p className="mt-1 text-sm text-red-600">{errors.passwordConfirmation}</p>
              )}
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}

            {/* Reset Button */}
            <button
              type="submit"
              disabled={isResetting}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {isResetting ? (
                <>
                  <FaSpinner className="animate-spin" />
                  <span>Resetting Password...</span>
                </>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>
        )}

        {/* Back Links */}
        <div className="mt-6 text-center space-y-2">
          {step === 'verify' && (
            <button
              onClick={() => navigate('/forgot-password', { replace: true })}
              className="text-sm text-gray-600 hover:text-gray-900 font-medium"
            >
              Resend code
            </button>
          )}
          <div>
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
    </div>
  );
};

export default ResetPassword;

