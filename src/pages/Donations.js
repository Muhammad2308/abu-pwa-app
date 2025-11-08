import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FaCreditCard, FaUser, FaSearch, FaBug } from 'react-icons/fa';
import toast from 'react-hot-toast';
import api, { paymentsAPI, getCsrfCookie, formatNaira } from '../services/api';
import { getDeviceFingerprint } from '../utils/deviceFingerprint';
import BackendTest from '../components/BackendTest';
import SessionCreationModal from '../components/SessionCreationModal';
import countries from '../utils/countries';

const Donations = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isDeviceRecognized, loading, createDonor, updateDonor, searchAlumni, isAuthenticated } = useAuth();
  const projectFromQuery = searchParams.get('project') || '';
  const isEndowment = !projectFromQuery;
  
  // Session creation modal state
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [pendingDonorId, setPendingDonorId] = useState(null);
  
  const [currentStep, setCurrentStep] = useState('donation'); // donation, registration, alumni-search
  const [donationData, setDonationData] = useState({
    amount: '',
    name: '',
    surname: '',
    other_name: '',
    email: '',
    phone: ''
  });
  const [processingPayment, setProcessingPayment] = useState(false);
  const [projectDetails, setProjectDetails] = useState(null);
  
  // Alumni search states
  const [regNumber, setRegNumber] = useState('');
  const [searchEmail, setSearchEmail] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [alumniData, setAlumniData] = useState(null);
  const [searching, setSearching] = useState(false);
  
  // --- Multistep Registration State ---
  const [registrationStep, setRegistrationStep] = useState(1);
  const [gender, setGender] = useState('');
  const [country, setCountry] = useState('Nigeria');
  const [stateName, setStateName] = useState('');
  const [lga, setLga] = useState('');
  const [address, setAddress] = useState('');
  const [lgaData, setLgaData] = useState({});
  const [availableStates, setAvailableStates] = useState([]);
  const [availableLgas, setAvailableLgas] = useState([]);

  // Load LGA.json on mount
  useEffect(() => {
    fetch('/LGA.json')
      .then(res => res.json())
      .then(data => {
        setLgaData(data);
        setAvailableStates(Object.keys(data));
      });
  }, []);

  // Update LGAs when state changes
  useEffect(() => {
    if (country === 'Nigeria' && stateName && lgaData[stateName]) {
      setAvailableLgas(lgaData[stateName]);
    } else {
      setAvailableLgas([]);
    }
  }, [country, stateName, lgaData]);

  // Add at the top of the component:
  const [projects, setProjects] = useState([]);

  // Fetch all projects on mount
  useEffect(() => {
    api.get('/api/projects')
      .then(res => setProjects(res.data))
      .catch(() => setProjects([]));
  }, []);

  // Helper to get selected project by title
  const selectedProject = projects.find(
    p => p.project_title === projectFromQuery
  );

  // --- Registration Form Steps ---
  function parseName(fullName) {
    const parts = fullName.trim().split(' ');
    return {
      name: parts[0] || '',
      surname: parts[1] || '',
      other_name: parts.slice(2).join(' ') || null,
    };
  }

  const handleRegistrationStep1 = (e) => {
    e.preventDefault();
    if (!donationData.name || !gender || !donationData.email || !donationData.phone) {
      toast.error('Please fill in all required fields');
      return;
    }
    setRegistrationStep(2);
  };

  const handleRegistrationStep2 = async (e) => {
    e.preventDefault();
    if (!country || (country === 'Nigeria' && (!stateName || !lga)) || !address) {
      toast.error('Please fill in all required address fields');
      return;
    }
    // Parse name
    const parsed = parseName(donationData.name);
    const donorData = {
      ...parsed,
      gender,
      email: donationData.email,
      phone: donationData.phone,
      country,
      state: country === 'Nigeria' ? stateName : '',
      lga: country === 'Nigeria' ? lga : '',
      city: country === 'Nigeria' ? lga : '',
      address,
      donor_type: 'non_addressable_alumni',
    };
    const result = await createDonor(donorData);
    if (result.success) {
      const donor = result.donor;
      setDonationData({
        ...donationData,
        name: donorData.name + (donorData.surname ? ' ' + donorData.surname : '') + (donorData.other_name ? ' ' + donorData.other_name : ''),
        email: donorData.email,
        phone: donorData.phone,
      });
      
      // If user is not authenticated, prompt for session creation
      if (!isAuthenticated && donor?.id) {
        setPendingDonorId(donor.id);
        setShowSessionModal(true);
      } else {
        // User is authenticated or no donor ID, proceed to donation
        setCurrentStep('donation');
      }
      
      setRegistrationStep(1);
      setGender('');
      setCountry('Nigeria');
      setStateName('');
      setLga('');
      setAddress('');
    }
  };

  // Debug state
  const [showDebug, setShowDebug] = useState(false);

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
        surname: user.surname || '',
        other_name: user.other_name || '',
        email: user.email || '',
        phone: user.phone || ''
      });
    }
  }, [user, isDeviceRecognized]);

  const loadProjectDetails = async () => {
    try {
      // Only load if projectFromQuery is a valid ID (not a string with spaces)
      if (projectFromQuery && !isNaN(projectFromQuery)) {
        const response = await api.get(`/api/projects/${projectFromQuery}`);
        setProjectDetails(response.data.data || response.data);
      } else {
        console.log('Skipping project load - invalid project ID:', projectFromQuery);
      }
    } catch (error) {
      console.error('Error loading project details:', error);
      // Don't show error to user for project loading failures
    }
  };

  // Handle alumni search
  const handleAlumniSearch = async (e) => {
    e.preventDefault();
    if (!regNumber.trim() && !searchEmail.trim() && !searchPhone.trim()) {
      toast.error('Enter reg number, email, or phone');
      return;
    }

    setSearching(true);
    try {
      console.log('Searching alumni with:', { regNumber, email: searchEmail, phone: searchPhone });
      const result = await searchAlumni({ regNumber, email: searchEmail, phone: searchPhone });
      console.log('Search result:', result);
      
      if (result.success) {
        setAlumniData(result.donor);
        setDonationData({
          amount: '',
          name: result.donor.name || '',
          surname: result.donor.surname || '',
          other_name: result.donor.other_name || '',
          email: result.donor.email || '',
          phone: result.donor.phone || ''
        });
        setCurrentStep('donation');
        toast.success('Alumni record found! Please update your information if needed.');
      } else {
        toast.error(result.message || 'Alumni record not found. Please check your registration number.');
        // TEMPORARILY DISABLED: Don't redirect, stay on search page
        // setCurrentStep('donation');
      }
    } catch (error) {
      console.error('Alumni search error:', error);
      
      // More detailed error handling
      if (error.response?.status === 404) {
        toast.error('Alumni record not found. Please check your registration number.');
      } else if (error.code === 'ERR_NETWORK') {
        toast.error('Network error. Please check your internet connection.');
      } else if (error.response?.status === 500) {
        toast.error('Server error. Please try again later.');
      } else {
        toast.error('Error searching for alumni. Please try again.');
      }
      
      // TEMPORARILY DISABLED: Don't redirect, stay on search page
      // setCurrentStep('donation');
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

    // Send all the required fields from the alumni data
    // IMPORTANT: Send name, surname, and other_name as SEPARATE fields
    // DO NOT combine them into a single name field
    const updateData = {
      name: donationData.name || '',
      surname: donationData.surname || '',
      other_name: donationData.other_name && donationData.other_name.trim() ? donationData.other_name.trim() : null,
      email: donationData.email || '',
      phone: donationData.phone || '',
      // Include other required fields from the original alumni data
      reg_number: alumniData.reg_number,
      entry_year: alumniData.entry_year,
      graduation_year: alumniData.graduation_year,
      faculty_id: alumniData.faculty?.id,
      department_id: alumniData.department?.id,
      donor_type: alumniData.donor_type,
      // Add the missing required fields
      address: alumniData.address,
      state: alumniData.state,
      city: alumniData.lga, // Using lga as city
      lga: alumniData.lga // Also include lga field in case backend expects it
    };

    // Log the exact structure being sent
    console.log('Updating alumni with SEPARATE name fields:');
    console.log('- name:', updateData.name);
    console.log('- surname:', updateData.surname);
    console.log('- other_name:', updateData.other_name);
    console.log('Full updateData:', JSON.stringify(updateData, null, 2));

    const result = await updateDonor(alumniData.id, updateData);
    
    if (result.success) {
      const donor = result.donor || alumniData;
      
      // If user is not authenticated, prompt for session creation
      if (!isAuthenticated && donor?.id) {
        setPendingDonorId(donor.id);
        setShowSessionModal(true);
      } else {
        // User is authenticated, proceed to donation
        setCurrentStep('donation');
        toast.success('Profile updated successfully!');
      }
    }
  };

  // Handle payment submission
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    
    if (!donationData.amount || donationData.amount < 100) {
      toast.error('Please enter a valid amount (minimum ₦100)');
      return;
    }

    if (!donationData.name || !donationData.surname || !donationData.email || !donationData.phone) {
      toast.error('Please fill in all required fields (Name, Surname, Email, Phone)');
      return;
    }

    setProcessingPayment(true);
    
    try {
      await getCsrfCookie();
      
      // Prepare metadata with separate name fields
      const metadata = {
        name: donationData.name || '',
        surname: donationData.surname || '',
        other_name: donationData.other_name || null,
        phone: donationData.phone,
        endowment: selectedProject ? 'no' : 'yes',
        type: selectedProject ? 'project' : 'endowment'
      };
      if (selectedProject) {
        metadata.project_id = selectedProject.id;
      }
      
      const paymentData = {
        email: donationData.email,
        amount: donationData.amount,
        device_fingerprint: getDeviceFingerprint(),
        callback_url: `${window.location.origin}/donations`,
        metadata: metadata
      };
      
      console.log('Initializing Paystack payment:', paymentData);
      
      const response = await paymentsAPI.initialize(paymentData);

      const { access_code } = response.data.data;
      
      // Load Paystack script
      await loadPaystackScript();
      
      // Open Paystack payment popup
      const popup = new window.PaystackPop();
      popup.resumeTransaction(access_code);
      
      // After payment, redirect will be handled by Paystack callback
      // The webhook will handle the donation record creation
      
    } catch (error) {
      console.error('Payment error:', error);
      console.error('Payment error response:', error.response?.data);
      
      if (error.response?.status === 500) {
        toast.error('Server error during payment initialization. Please check backend logs.');
      } else if (error.response?.status === 422) {
        const validationErrors = error.response.data.errors;
        if (validationErrors) {
          const errorMessages = Object.values(validationErrors).flat().join(', ');
          toast.error(`Payment validation errors: ${errorMessages}`);
        } else {
          toast.error('Payment validation failed. Please check your input.');
        }
      } else if (error.code === 'ERR_NETWORK') {
        toast.error('Network error. Please check your internet connection.');
      } else {
        toast.error('Payment initialization failed. Please try again.');
      }
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

  // Handle Paystack callback - check URL params for payment reference
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get('reference');
    const trxref = params.get('trxref'); // Paystack reference
    const paymentRef = reference || trxref;
    
    if (paymentRef) {
      console.log('Payment reference detected:', paymentRef);
      
      // Get project from URL params or current state
      const urlProject = params.get('project');
      const projectFromUrl = urlProject ? decodeURIComponent(urlProject) : null;
      
      // Payment completed - verify with backend
      paymentsAPI.verify(paymentRef)
        .then(response => {
          console.log('Payment verification response:', response.data);
          const paymentData = response.data.data || response.data;
          const isSuccess = response.data.success || paymentData?.status === 'success';
          
          if (isSuccess) {
            // Get amount from payment response or fallback
            const amount = paymentData?.amount ? paymentData.amount / 100 : (donationData?.amount || 0);
            
            // Get project name from payment metadata, URL, or fallback
            const projectFromMetadata = paymentData?.metadata?.project_title || paymentData?.metadata?.project;
            const projectName = projectFromMetadata || projectFromUrl || selectedProject?.project_title || 'the Endowment Fund';
            
            toast.success(`Thank you! Your donation has been processed successfully! 🎉`);
            
            // Clean URL first
            window.history.replaceState({}, document.title, window.location.pathname);
            
            // Redirect to home immediately with thank you message
            setTimeout(() => {
              navigate('/', {
                state: {
                  thankYou: {
                    project: projectName,
                    amount: amount
                  }
                },
                replace: true
              });
            }, 500);
          } else {
            // Payment failed or pending
            toast.error('Payment verification failed. Please contact support if payment was deducted.');
          }
        })
        .catch(error => {
          console.error('Payment verification error:', error);
          // Still show success and redirect - webhook will handle verification
          toast.success('Thank you! Your payment is being processed. You will receive a confirmation shortly.');
          
          // Get project name from URL or fallback
          const urlProject = params.get('project');
          const projectFromUrl = urlProject ? decodeURIComponent(urlProject) : null;
          const projectName = projectFromUrl || selectedProject?.project_title || 'the Endowment Fund';
          const amount = donationData?.amount || 0;
          
          // Clean URL
          window.history.replaceState({}, document.title, window.location.pathname);
          
          // Redirect to home
          setTimeout(() => {
            navigate('/', {
              state: {
                thankYou: {
                  project: projectName,
                  amount: amount
                }
              },
              replace: true
            });
          }, 500);
        });
    }
  }, [navigate, searchParams, selectedProject]);

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
            <p className="text-gray-600">Search with registration number, email, or phone</p>
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your ABU registration number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your phone number"
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

          <div className="text-center mt-4 space-y-2">
            <button
              onClick={() => setCurrentStep('registration')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Not an alumni? Register here
            </button>
            
            {/* Temporary debug button */}
            <div className="pt-2">
              <button
                onClick={() => setCurrentStep('donation')}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                🐛 Debug: Go to Donation Form
              </button>
            </div>
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
          {registrationStep === 1 ? (
            <form onSubmit={handleRegistrationStep1} className="space-y-4">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={e => setGender(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
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
                Next
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegistrationStep2} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <select
                  value={country}
                  onChange={e => { setCountry(e.target.value); setStateName(''); setLga(''); }}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {countries.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {country === 'Nigeria' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                    <select
                      value={stateName}
                      onChange={e => { setStateName(e.target.value); setLga(''); }}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select state</option>
                      {availableStates.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">LGA</label>
                    <select
                      value={lga}
                      onChange={e => setLga(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select LGA</option>
                      {availableLgas.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your address"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRegistrationStep(1)}
                  className="flex-1 py-3 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition-colors font-semibold"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                  Create Account
                </button>
              </div>
            </form>
          )}
          <div className="text-center mt-4">
            <button
              onClick={() => { setCurrentStep('alumni-search'); setRegistrationStep(1); }}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Are you an ABU alumni? Search here
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Handle session creation success
  const handleSessionCreated = () => {
    setShowSessionModal(false);
    setPendingDonorId(null);
    setCurrentStep('donation');
    toast.success('Account created! You can now make your donation.');
  };

  // Main Donation Screen
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {/* Session Creation Modal */}
      <SessionCreationModal
        isOpen={showSessionModal}
        onClose={() => {
          setShowSessionModal(false);
          setPendingDonorId(null);
          // Still allow them to proceed to donation even if they skip
          setCurrentStep('donation');
        }}
        donorId={pendingDonorId}
        onSuccess={handleSessionCreated}
      />
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

          {/* Alumni Update Success Message */}
          {alumniData && (
            <div className="text-center mb-6 p-4 bg-blue-50 rounded-lg">
              <h2 className="text-xl font-semibold text-blue-800">
                ✅ Profile Updated Successfully!
              </h2>
              <p className="text-blue-700">Now enter your donation amount and click the payment button below</p>
            </div>
          )}

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Thank you for contributing to {selectedProject ? selectedProject.project_title : 'the Endowment Fund'}!
            </h1>
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
                <p><strong>Target:</strong> {formatNaira(projectDetails.target_amount)}</p>
                <p><strong>Raised:</strong> {formatNaira(projectDetails.amount)}</p>
              </div>
            </div>
          )}

          {/* New User Options - Show if not authenticated */}
          {!isAuthenticated && (
            <div className="mb-8 p-6 bg-yellow-50 rounded-lg">
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">First time here?</h3>
              <p className="text-sm text-yellow-700 mb-4">
                Search for your alumni record or register as a new supporter to get started
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setCurrentStep('alumni-search')}
                  className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                  I'm an ABU Alumni
                </button>
                <button
                  onClick={() => setCurrentStep('registration')}
                  className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
                >
                  New Supporter
                </button>
              </div>
            </div>
          )}

          <form onSubmit={alumniData ? handleAlumniUpdate : handlePaymentSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  value={donationData.name || ''}
                  onChange={(e) => setDonationData({...donationData, name: e.target.value})}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your first name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Surname *
                </label>
                <input
                  type="text"
                  value={donationData.surname || ''}
                  onChange={(e) => setDonationData({...donationData, surname: e.target.value})}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your surname"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Other Name
                </label>
                <input
                  type="text"
                  value={donationData.other_name || ''}
                  onChange={(e) => setDonationData({...donationData, other_name: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter other name (optional)"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={donationData.email || ''}
                  onChange={(e) => setDonationData({...donationData, email: e.target.value})}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your email address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={donationData.phone || ''}
                  onChange={(e) => setDonationData({...donationData, phone: e.target.value})}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your phone number"
                />
              </div>
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
               `Pay ${formatNaira(donationData.amount)} ${isEndowment ? 'to Endowment' : 'to Project'}`
              }
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            <p>Your donation will be processed securely through Paystack</p>
          </div>

          {/* Debug Button */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="flex items-center gap-2 mx-auto px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
            >
              <FaBug className="w-4 h-4" />
              {showDebug ? 'Hide Debug Tools' : 'Show Debug Tools'}
            </button>
          </div>

          {/* Debug Tools */}
          {showDebug && (
            <div className="mt-6">
              <BackendTest />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Donations;
