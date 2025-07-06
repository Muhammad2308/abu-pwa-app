import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FaSignInAlt, FaSpinner } from 'react-icons/fa';
import toast from 'react-hot-toast';

const SimpleLoginForm = ({ email, onSuccess, onCancel }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log('Simple login with email:', email);
      
      const result = await login({ email });
      
      if (result.success) {
        toast.success('Login successful! Redirecting to donations...');
        onSuccess();
      } else {
        toast.error(result.error || 'Login failed');
      }
    } catch (error) {
      console.error('Simple login error:', error);
      toast.error('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
            <FaSignInAlt className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign In to Continue</h2>
          <p className="text-gray-600">Please sign in to proceed with your donation</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
            />
            <p className="text-xs text-gray-500 mt-1">Your email address is pre-filled</p>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-2 rounded-lg font-semibold text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 transition-all duration-200 flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <FaSpinner className="w-4 h-4 mr-2 animate-spin" />
                  Signing In...
                </>
              ) : (
                <>
                  <FaSignInAlt className="w-4 h-4 mr-2" />
                  Sign In
                </>
              )}
            </button>
            
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg font-medium text-gray-600 hover:text-gray-700 border border-gray-300 hover:bg-gray-50 transition-all duration-200"
            >
              Cancel
            </button>
          </div>
        </form>

        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500">
            This will create a secure session for your donation
          </p>
        </div>
      </div>
    </div>
  );
};

export default SimpleLoginForm; 