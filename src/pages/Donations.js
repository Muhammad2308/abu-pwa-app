import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FaCreditCard, FaUser, FaSearch } from 'react-icons/fa';
import toast from 'react-hot-toast';
import api, { paymentsAPI, getCsrfCookie } from '../services/api';

const Donations = () => {
  const [searchParams] = useSearchParams();
  const { user, isDeviceRecognized, loading, createDonor, updateDonor, searchAlumni } = useAuth();
  const projectFromQuery = searchParams.get('project') || '';
  const isEndowment = !projectFromQuery;
  
  const [currentStep, setCurrentStep] = useState('donation'); // donation, registration, alumni-search
  const [donationData, setDonationData] = useState({
    amount: '',
    name: '',
    email: '',
    phone: ''
  });
  const [processingPayment, setProcessingPayment] = useState(false);
  const [projectDetails, setProjectDetails] = useState(null);
  
  // Alumni search states
  const [regNumber, setRegNumber] = useState('');
  const [alumniData, setAlumniData] = useState(null);
  const [searching, setSearching] = useState(false);

  // Load project details if project is specified
  useEffect(() => {
    if (projectFromQuery) {
      loadProjectDetails();
    }
  }, [projectFromQuery]);

  // Pre-fill form if user is recognized
  useEffect(() => {
    if (user && isDeviceRecognized) {
      setDonationData({
        amount: '',
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || ''
      });
    }
  }, [user, isDeviceRecognized]);

  const loadProjectDetails = async () => {
    try {
      const response = await api.get(`/api/projects/${projectFromQuery}`);
      setProjectDetails(response.data.data || response.data);
    } catch (error) {
      console.error('Error loading project details:', error);
    }
  };

  // Handle alumni search
  const handleAlumniSearch = async (e) => {
    e.preventDefault();
    if (!regNumber.trim()) {
      toast.error('Please enter your registration number');
      return;
    }

    setSearching(true);
    try {
      const result = await searchAlumni(regNumber);
      
      if (result.success) {
        setAlumniData(result.donor);
        setDonationData({
          amount: '',
          name: result.donor.name || '',
          email: result.donor.email || '',
          phone: result.donor.phone || ''
        });
        setCurrentStep('donation');
        toast.success('Alumni record found! Please update your information if needed.');
      } else {
        toast.error('Alumni record not found. Please check your registration number.');
      }
    } catch (error) {
      console.error('Alumni search error:', error);
      toast.error('Error searching for alumni. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  // Handle registration
  const handleRegistration = async (e) => {
    e.preventDefault();
    
    const donorData = {
      name: donationData.name,
      email: donationData.email,
      phone: donationData.phone,
      donor_type: 'non_addressable_alumni'
    };

    const result = await createDonor(donorData);
    if (result.success) {
      setCurrentStep('donation');
    }
  };

  // Handle alumni update
  const handleAlumniUpdate = async (e) => {
    e.preventDefault();
    
    if (!alumniData) {
      toast.error('No alumni data found');
      return;
    }

    const result = await updateDonor(alumniData.id, {
      name: donationData.name,
      email: donationData.email,
      phone: donationData.phone
    });
    
    if (result.success) {
      setCurrentStep('donation');
    }
  };

  // Handle payment submission
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    
    if (!donationData.amount || donationData.amount < 100) {
      toast.error('Please enter a valid amount (minimum ₦100)');
      return;
    }

    if (!donationData.name || !donationData.email || !donationData.phone) {
      toast.error('Please fill in all required fields');
      return;
    }

    setProcessingPayment(true);
    
    try {
      await getCsrfCookie();
      
      const response = await paymentsAPI.initialize({
        email: donationData.email,
        amount: donationData.amount * 100, // Convert to kobo
        device_fingerprint: getDeviceFingerprint(),
        callback_url: `${window.location.origin}/donations`,
        metadata: {
          name: donationData.name,
          phone: donationData.phone,
          endowment: isEndowment ? 'yes' : 'no',
          project_id: projectFromQuery || null
        }
      });

      const { access_code } = response.data.data;
      
      // Load Paystack script
      await loadPaystackScript();
      
      // Open payment popup
      const popup = new window.PaystackPop();
      popup.resumeTransaction(access_code);
      
      toast.success('Payment popup opened! Please complete your payment.');
      
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Payment initialization failed. Please try again.');
    } finally {
      setProcessingPayment(false);
    }
  };

  // Load Paystack script
  const loadPaystackScript = () => {
    return new Promise((resolve, reject) => {
      if (window.PaystackPop) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Alumni Search Screen
  if (currentStep === 'alumni-search') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-6">
            <FaSearch className="w-16 h-16 mx-auto mb-4 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Find Your Record</h2>
            <p className="text-gray-600">Enter your ABU registration number</p>
          </div>

          <form onSubmit={handleAlumniSearch} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Registration Number
              </label>
              <input
                type="text"
                value={regNumber}
                onChange={(e) => setRegNumber(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your ABU registration number"
              />
            </div>

            <button
              type="submit"
              disabled={searching}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-semibold"
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
          </form>

          <div className="text-center mt-4">
            <button
              onClick={() => setCurrentStep('registration')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Not an alumni? Register here
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Registration Screen
  if (currentStep === 'registration') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-6">
            <FaUser className="w-16 h-16 mx-auto mb-4 text-green-600" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Your Account</h2>
            <p className="text-gray-600">Please provide your information</p>
          </div>

          <form onSubmit={handleRegistration} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                value={donationData.name}
                onChange={(e) => setDonationData({...donationData, name: e.target.value})}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                value={donationData.email}
                onChange={(e) => setDonationData({...donationData, email: e.target.value})}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={donationData.phone}
                onChange={(e) => setDonationData({...donationData, phone: e.target.value})}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your phone number"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Create Account
            </button>
          </form>

          <div className="text-center mt-4">
            <button
              onClick={() => setCurrentStep('alumni-search')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Are you an ABU alumni? Search here
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main Donation Screen
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Welcome Message */}
          {user && isDeviceRecognized && (
            <div className="text-center mb-6 p-4 bg-green-50 rounded-lg">
              <h2 className="text-xl font-semibold text-green-800">
                Welcome back, {user.name}! 👋
              </h2>
              <p className="text-green-700">Your information has been pre-filled</p>
            </div>
          )}

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {isEndowment ? 'Make an Endowment Donation' : 'Support This Project'}
            </h1>
            <p className="text-gray-600">
              {isEndowment 
                ? 'Thank you for supporting ABU Endowment Fund' 
                : 'Thank you for supporting this specific project'
              }
            </p>
          </div>

          {/* Project Details */}
          {projectDetails && (
            <div className="mb-8 p-6 bg-blue-50 rounded-lg">
              <h2 className="text-xl font-semibold text-blue-900 mb-2">
                {projectDetails.name}
              </h2>
              <p className="text-blue-800 mb-3">
                {projectDetails.description}
              </p>
              <div className="text-sm text-blue-700">
                <p><strong>Target:</strong> ₦{projectDetails.target_amount?.toLocaleString() || 'N/A'}</p>
                <p><strong>Raised:</strong> ₦{projectDetails.amount?.toLocaleString() || '0'}</p>
              </div>
            </div>
          )}

          {/* New User Options */}
          {!user && !isDeviceRecognized && (
            <div className="mb-8 p-6 bg-yellow-50 rounded-lg">
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">First time here?</h3>
              <div className="flex gap-4">
                <button
                  onClick={() => setCurrentStep('alumni-search')}
                  className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  I'm an ABU Alumni
                </button>
                <button
                  onClick={() => setCurrentStep('registration')}
                  className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  New Supporter
                </button>
              </div>
            </div>
          )}

          <form onSubmit={alumniData ? handleAlumniUpdate : handlePaymentSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={donationData.name}
                  onChange={(e) => setDonationData({...donationData, name: e.target.value})}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={donationData.email}
                  onChange={(e) => setDonationData({...donationData, email: e.target.value})}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number *
              </label>
              <input
                type="tel"
                value={donationData.phone}
                onChange={(e) => setDonationData({...donationData, phone: e.target.value})}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your phone number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Donation Amount (₦) *
              </label>
              <input
                type="number"
                value={donationData.amount}
                onChange={(e) => setDonationData({...donationData, amount: e.target.value})}
                required
                min="100"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter amount (minimum ₦100)"
              />
            </div>

            <button
              type="submit"
              disabled={processingPayment}
              className="w-full py-3 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <FaCreditCard className="w-5 h-5" />
              {processingPayment ? 'Processing...' : 
               alumniData ? 'Update & Continue' : 
               `Donate ${isEndowment ? 'to Endowment' : 'to Project'}`
              }
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            <p>Your donation will be processed securely through Paystack</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Donations; 