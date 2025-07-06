import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FaGraduationCap, FaUsers, FaEnvelope, FaPhone, FaCreditCard } from 'react-icons/fa';
import toast from 'react-hot-toast';
import api, { paymentsAPI, getCsrfCookie } from '../services/api';

const Donations = () => {
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated, loading, simpleLogin, registerAndVerify, completeVerification } = useAuth();
  const projectFromQuery = searchParams.get('project') || '';
  
  // Simple flow states
  const [currentStep, setCurrentStep] = useState('welcome'); // welcome, login, donor-type, alumni-search, alumni-update, registration, verification, payment
  const [selectedDonorType, setSelectedDonorType] = useState('');
  const [registrationData, setRegistrationData] = useState({});
  const [verificationCode, setVerificationCode] = useState('');
  const [donationData, setDonationData] = useState({
    amount: '',
    project_id: projectFromQuery
  });
  const [availableProjects, setAvailableProjects] = useState([]);
  const [processingPayment, setProcessingPayment] = useState(false);

  // Alumni search states
  const [regNumber, setRegNumber] = useState('');
  const [alumniData, setAlumniData] = useState(null);
  const [alumniSearching, setAlumniSearching] = useState(false);
  const [alumniUpdateForm, setAlumniUpdateForm] = useState({});

  // Non-alumni registration states
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [entryYear, setEntryYear] = useState('');
  const [graduationYear, setGraduationYear] = useState('');

  // Load projects when needed
  useEffect(() => {
    if (currentStep === 'payment') {
      loadProjects();
    }
  }, [currentStep]);

  const loadProjects = async () => {
    try {
      const response = await api.get('/api/projects');
      setAvailableProjects(response.data.data || response.data);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  // Check if user is already authenticated
  useEffect(() => {
    if (!loading) {
      if (isAuthenticated && user) {
        setCurrentStep('payment');
      } else {
        setCurrentStep('welcome');
      }
    }
  }, [isAuthenticated, user, loading]);

  // Load faculties when years are selected
  useEffect(() => {
    if (entryYear && graduationYear && parseInt(entryYear) < parseInt(graduationYear)) {
      loadFaculties();
    }
  }, [entryYear, graduationYear]);

  // Load departments when faculty is selected
  useEffect(() => {
    if (selectedFaculty && entryYear && graduationYear) {
      loadDepartments();
    }
  }, [selectedFaculty, entryYear, graduationYear]);

  const loadFaculties = async () => {
    try {
      const response = await api.get(`/api/faculty-vision?entry_year=${entryYear}&graduation_year=${graduationYear}`);
      setFaculties(response.data.data || response.data);
    } catch (error) {
      console.error('Error loading faculties:', error);
      toast.error('Error loading faculties');
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await api.get(`/api/department-vision?faculty_id=${selectedFaculty}&entry_year=${entryYear}&graduation_year=${graduationYear}`);
      setDepartments(response.data.data || response.data);
    } catch (error) {
      console.error('Error loading departments:', error);
      toast.error('Error loading departments');
    }
  };

  // Handle donor type selection
  const handleDonorTypeSelect = (type) => {
    setSelectedDonorType(type);
    if (type === 'addressable_alumni') {
      setCurrentStep('alumni-search');
    } else {
      setCurrentStep('registration');
    }
  };

  // Handle alumni search
  const handleAlumniSearch = async (e) => {
    e.preventDefault();
    if (!regNumber.trim()) {
      toast.error('Please enter your registration number');
      return;
    }

    setAlumniSearching(true);
    try {
      const response = await api.get(`/api/donors/search/${encodeURIComponent(regNumber)}`);
      const alumni = response.data.data || response.data;
      
      setAlumniData(alumni);
      setAlumniUpdateForm({
        name: alumni.name || alumni.full_name || '',
        email: alumni.email || '',
        phone: alumni.phone || '',
        address: alumni.address || '',
        state: alumni.state || '',
        city: alumni.city || ''
      });
      
      setCurrentStep('alumni-update');
      toast.success('Alumni record found! Please update your information.');
      
    } catch (error) {
      console.error('Alumni search error:', error);
      if (error.response?.status === 404) {
        toast.error('Alumni record not found. Please check your registration number.');
      } else {
        toast.error('Error searching for alumni. Please try again.');
      }
    } finally {
      setAlumniSearching(false);
    }
  };

  // Handle alumni update
  const handleAlumniUpdate = async (e) => {
    e.preventDefault();
    
    try {
      const response = await api.put(`/api/donors/${alumniData.id}`, alumniUpdateForm);
      
      // Now proceed to verification
      const verificationResult = await registerAndVerify({
        ...alumniUpdateForm,
        donor_type: 'addressable_alumni',
        id: alumniData.id
      });
      
      if (verificationResult.success) {
        setCurrentStep('verification');
      }
      
    } catch (error) {
      console.error('Alumni update error:', error);
      toast.error('Error updating alumni information. Please try again.');
    }
  };

  // Handle non-alumni registration form submission
  const handleRegistrationSubmit = async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
      name: formData.get('name'),
      surname: formData.get('surname'),
      other_name: formData.get('other_name'),
      gender: formData.get('gender'),
      country: formData.get('country'),
      state: formData.get('state'),
      city: formData.get('city'),
      address: formData.get('address'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      donor_type: 'non_addressable_alumni'
    };

    setRegistrationData(data);
    
    const result = await registerAndVerify(data);
    if (result.success) {
      setCurrentStep('verification');
    }
  };

  // Handle verification code submission
  const handleVerificationSubmit = async (e) => {
    e.preventDefault();
    
    const result = await completeVerification(verificationCode, registrationData);
    if (result.success) {
      setCurrentStep('payment');
    }
  };

  // Handle simple login for returning users
  const handleSimpleLogin = async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const emailOrPhone = formData.get('email_or_phone');
    
    const result = await simpleLogin(emailOrPhone);
    if (result.success) {
      setCurrentStep('payment');
    }
  };

  // Handle payment submission
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    
    if (!donationData.amount || donationData.amount < 100) {
      toast.error('Please enter a valid amount (minimum ₦100)');
      return;
    }

    setProcessingPayment(true);
    
    try {
      await getCsrfCookie();
      
      const response = await paymentsAPI.initialize({
        email: user.email,
        amount: donationData.amount * 100, // Convert to kobo
        metadata: {
          donor_id: user.id,
          frequency: 'onetime',
          endowment: 'no',
          project_id: donationData.project_id || null
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

  // Welcome Screen
  if (currentStep === 'welcome') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Welcome to ABU Endowment</h1>
            <p className="text-gray-600 mb-6">Support our university through your generous donations</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => setCurrentStep('login')}
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              I'm a returning donor
            </button>
            
            <button
              onClick={() => setCurrentStep('donor-type')}
              className="w-full py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
            >
              I'm a new donor
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Simple Login Screen
  if (currentStep === 'login') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back!</h2>
            <p className="text-gray-600">Enter your email or phone to continue</p>
          </div>

          <form onSubmit={handleSimpleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email or Phone Number
              </label>
              <input
                type="text"
                name="email_or_phone"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your email or phone"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Continue
            </button>
          </form>

          <div className="text-center mt-4">
            <button
              onClick={() => setCurrentStep('welcome')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Donor Type Selection
  if (currentStep === 'donor-type') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Your Type</h2>
            <p className="text-gray-600">Choose the option that best describes you</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => handleDonorTypeSelect('addressable_alumni')}
              className="w-full p-4 border border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
            >
              <div className="flex items-center">
                <FaGraduationCap className="w-6 h-6 text-blue-600 mr-3" />
                <div>
                  <h3 className="font-semibold text-gray-900">ABU Graduate</h3>
                  <p className="text-sm text-gray-600">I graduated from ABU</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => handleDonorTypeSelect('non_addressable_alumni')}
              className="w-full p-4 border border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors text-left"
            >
              <div className="flex items-center">
                <FaUsers className="w-6 h-6 text-green-600 mr-3" />
                <div>
                  <h3 className="font-semibold text-gray-900">Friend of ABU</h3>
                  <p className="text-sm text-gray-600">I support ABU but didn't graduate here</p>
                </div>
              </div>
            </button>
          </div>

          <div className="text-center mt-6">
            <button
              onClick={() => setCurrentStep('welcome')}
              className="text-gray-600 hover:text-gray-700 font-medium"
            >
              ← Back
            </button>
          </div>
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
            <FaGraduationCap className="w-16 h-16 mx-auto mb-4 text-blue-600" />
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
              disabled={alumniSearching}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-semibold"
            >
              {alumniSearching ? 'Searching...' : 'Search'}
            </button>
          </form>

          <div className="text-center mt-4">
            <button
              onClick={() => setCurrentStep('donor-type')}
              className="text-gray-600 hover:text-gray-700 font-medium"
            >
              ← Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Alumni Update Screen
  if (currentStep === 'alumni-update') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Update Your Information</h2>
            <p className="text-gray-600">Please update your contact details</p>
          </div>

          <form onSubmit={handleAlumniUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                value={alumniUpdateForm.name}
                onChange={(e) => setAlumniUpdateForm({...alumniUpdateForm, name: e.target.value})}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                value={alumniUpdateForm.email}
                onChange={(e) => setAlumniUpdateForm({...alumniUpdateForm, email: e.target.value})}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={alumniUpdateForm.phone}
                onChange={(e) => setAlumniUpdateForm({...alumniUpdateForm, phone: e.target.value})}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your phone number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input
                type="text"
                value={alumniUpdateForm.address}
                onChange={(e) => setAlumniUpdateForm({...alumniUpdateForm, address: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your address"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input
                type="text"
                value={alumniUpdateForm.state}
                onChange={(e) => setAlumniUpdateForm({...alumniUpdateForm, state: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your state"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                value={alumniUpdateForm.city}
                onChange={(e) => setAlumniUpdateForm({...alumniUpdateForm, city: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your city"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Continue
            </button>
          </form>

          <div className="text-center mt-4">
            <button
              onClick={() => setCurrentStep('alumni-search')}
              className="text-gray-600 hover:text-gray-700 font-medium"
            >
              ← Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Non-Alumni Registration Form
  if (currentStep === 'registration') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Your Account</h2>
            <p className="text-gray-600">Please provide your information</p>
          </div>

          <form onSubmit={handleRegistrationSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input
                type="text"
                name="name"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your first name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Surname</label>
              <input
                type="text"
                name="surname"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your surname"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Other Name (Optional)</label>
              <input
                type="text"
                name="other_name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your other name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select
                name="gender"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <input
                type="text"
                name="country"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your country"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input
                type="text"
                name="state"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your state"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                name="city"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your city"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input
                type="text"
                name="address"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your address"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                name="email"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="tel"
                name="phone"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your phone number"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Continue
            </button>
          </form>

          <div className="text-center mt-4">
            <button
              onClick={() => setCurrentStep('donor-type')}
              className="text-gray-600 hover:text-gray-700 font-medium"
            >
              ← Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Verification Screen
  if (currentStep === 'verification') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-6">
            <FaEnvelope className="w-16 h-16 mx-auto mb-4 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h2>
            <p className="text-gray-600">
              We've sent a verification code to <strong>{registrationData.email}</strong>
            </p>
          </div>

          <form onSubmit={handleVerificationSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Verification Code</label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg font-mono"
                placeholder="Enter 6-digit code"
                maxLength="6"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Verify & Continue
            </button>
          </form>

          <div className="text-center mt-4">
            <p className="text-sm text-gray-500">
              Didn't receive the email? Check your spam folder or contact support.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Payment Screen
  if (currentStep === 'payment') {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Make a Donation</h1>
              <p className="text-gray-600">Thank you for supporting ABU Endowment</p>
              {user && (
                <p className="text-blue-600 font-semibold mt-2">Welcome, {user.name}!</p>
              )}
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Donation Amount (₦)
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Project (Optional)
                </label>
                <select
                  value={donationData.project_id}
                  onChange={(e) => setDonationData({...donationData, project_id: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">General Donation</option>
                  {availableProjects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={processingPayment}
                className="w-full py-3 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 transition-all duration-200"
              >
                {processingPayment ? 'Processing...' : 'Proceed to Payment'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default Donations; 