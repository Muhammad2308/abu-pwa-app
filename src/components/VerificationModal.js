import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FaMobile, FaEnvelope, FaArrowLeft, FaCheck } from 'react-icons/fa';

const VerificationModal = ({ isOpen, onClose, onSuccess, donorData }) => {
  const { 
    verificationStep, 
    verificationData, 
    sendVerification, 
    verifyAndCreateSession,
    setVerificationStep,
    loading 
  } = useAuth();
  
  const [smsCode, setSmsCode] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [resendDisabled, setResendDisabled] = useState(false);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setResendDisabled(false);
    }
  }, [countdown]);

  const handleSendSMS = async () => {
    if (!donorData?.phone) {
      // toast.error('Phone number is required'); // Removed toast
      return;
    }
    
    const result = await sendVerification('sms', donorData.phone);
    if (result.success) {
      setCountdown(60);
      setResendDisabled(true);
    }
  };

  const handleSendEmail = async () => {
    if (!donorData?.email) {
      // toast.error('Email is required'); // Removed toast
      return;
    }
    
    const result = await sendVerification('email', donorData.email);
    if (result.success) {
      setCountdown(60);
      setResendDisabled(true);
    }
  };

  const handleVerifySMS = async () => {
    if (!smsCode.trim()) {
      // toast.error('Please enter the SMS verification code'); // Removed toast
      return;
    }
    
    const result = await verifyAndCreateSession(smsCode, donorData);
    if (result.success) {
      onSuccess();
      onClose();
    }
  };

  const handleVerifyEmail = async () => {
    if (!emailCode.trim()) {
      // toast.error('Please enter the email verification code'); // Removed toast
      return;
    }
    
    const result = await verifyAndCreateSession(emailCode, donorData);
    if (result.success) {
      onSuccess();
      onClose();
    }
  };

  const handleResend = async () => {
    if (verificationStep === 'sms') {
      await handleSendSMS();
    } else if (verificationStep === 'email') {
      await handleSendEmail();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
            {verificationStep === 'sms' ? (
              <FaMobile className="w-8 h-8 text-blue-600" />
            ) : (
              <FaEnvelope className="w-8 h-8 text-blue-600" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {verificationStep === 'sms' ? 'SMS Verification' : 'Email Verification'}
          </h2>
          <p className="text-gray-600">
            {verificationStep === 'sms' 
              ? `We've sent a 6-digit code to ${donorData?.phone}`
              : `We've sent a 6-digit code to ${donorData?.email}`
            }
          </p>
        </div>

        {/* Verification Form */}
        <div className="space-y-4">
          {verificationStep === 'sms' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SMS Verification Code
              </label>
              <input
                type="text"
                value={smsCode}
                onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit code"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg font-mono"
                maxLength={6}
              />
              <button
                onClick={handleVerifySMS}
                disabled={loading || !smsCode.trim()}
                className="w-full mt-4 py-3 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 transition-all duration-200"
              >
                {loading ? 'Verifying...' : 'Verify SMS Code'}
              </button>
            </div>
          )}

          {verificationStep === 'email' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Verification Code
              </label>
              <input
                type="text"
                value={emailCode}
                onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit code"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg font-mono"
                maxLength={6}
              />
              <button
                onClick={handleVerifyEmail}
                disabled={loading || !emailCode.trim()}
                className="w-full mt-4 py-3 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 transition-all duration-200"
              >
                {loading ? 'Verifying...' : 'Verify Email Code'}
              </button>
            </div>
          )}

          {/* Resend Code */}
          <div className="text-center">
            <button
              onClick={handleResend}
              disabled={resendDisabled || loading}
              className="text-blue-600 hover:text-blue-700 disabled:text-gray-400 font-medium"
            >
              {resendDisabled 
                ? `Resend in ${countdown}s` 
                : 'Resend Code'
              }
            </button>
          </div>

          {/* Switch Verification Method */}
          <div className="text-center">
            <button
              onClick={() => {
                if (verificationStep === 'sms') {
                  setVerificationStep('email');
                  handleSendEmail();
                } else {
                  setVerificationStep('sms');
                  handleSendSMS();
                }
              }}
              disabled={loading}
              className="text-gray-600 hover:text-gray-700 disabled:text-gray-400 text-sm"
            >
              {verificationStep === 'sms' 
                ? 'Verify with email instead' 
                : 'Verify with SMS instead'
              }
            </button>
          </div>
        </div>

        {/* Close Button */}
        <div className="text-center mt-6">
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 font-medium flex items-center justify-center gap-2 mx-auto"
          >
            <FaArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerificationModal; 