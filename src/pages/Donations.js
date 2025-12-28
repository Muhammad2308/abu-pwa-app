import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FaCreditCard, FaUser, FaSearch, FaEnvelope, FaLock, FaGraduationCap, FaHandHoldingHeart, FaSpinner, FaArrowLeft, FaCheckCircle, FaShieldAlt } from 'react-icons/fa';
import toast from 'react-hot-toast';
import api, { paymentsAPI, getCsrfCookie, formatNaira } from '../services/api';
import { getDeviceFingerprint } from '../utils/deviceFingerprint';
import SessionCreationModal from '../components/SessionCreationModal';
import AuthModal from '../components/AuthModal';
import countries from '../utils/countries';
import { GoogleSignInButton } from '../hooks/useGoogleAuth';
import abuLogo from '../assets/abu_logo.png';

const Donations = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isDeviceRecognized, loading, createDonor, updateDonor, searchAlumni, isAuthenticated, register, login, googleRegister, googleLogin, checkSession } = useAuth();
  const projectFromQuery = searchParams.get('project') || '';
  const isEndowment = !projectFromQuery;
  // Decode project query for matching (handle URL encoding)
  const decodedProjectQuery = projectFromQuery ? decodeURIComponent(projectFromQuery) : '';

  // Session creation modal state
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [pendingDonorId, setPendingDonorId] = useState(null);

  // Auth modal state
  const [showAuthModal, setShowAuthModal] = useState(false);

  const [currentStep, setCurrentStep] = useState('donation'); // donation, login-register, donor-type-selection, registration, alumni-search

  const [donationData, setDonationData] = useState({
    amount: '1000',
    name: '',
    surname: '',
    other_name: '',
    email: '',
    phone: ''
  });
  const [processingPayment, setProcessingPayment] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [projectDetails, setProjectDetails] = useState(null);

  // Alumni search states
  const [regNumber, setRegNumber] = useState('');
  const [searchEmail, setSearchEmail] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [alumniData, setAlumniData] = useState(null);
  const [searching, setSearching] = useState(false);

  // Login/Register form states
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [loginFormData, setLoginFormData] = useState({
    email: '',
    password: ''
  });
  const [registerFormData, setRegisterFormData] = useState({
    email: '',
    password: '',
    password_confirmation: ''
  });
  const [authErrors, setAuthErrors] = useState({});
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

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
      })
      .catch(err => console.error('Error loading LGA data:', err));
  }, []);

  // Update LGAs when state changes
  useEffect(() => {
    if (country === 'Nigeria' && stateName && lgaData[stateName]) {
      setAvailableLgas(lgaData[stateName]);
    } else {
      setAvailableLgas([]);
    }
  }, [country, stateName, lgaData]);

  const [projects, setProjects] = useState([]);

  // Fetch all projects on mount
  useEffect(() => {
    api.get('/api/projects')
      .then(res => setProjects(res.data))
      .catch(() => setProjects([]));
  }, []);

  // Helper to get selected project by title (handle URL decoding)
  const selectedProject = projects.find(
    p => p.project_title === decodedProjectQuery || p.project_title === projectFromQuery
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


  // Load project details if project is specified
  useEffect(() => {
    if (projectFromQuery) {
      loadProjectDetails();
    }
  }, [projectFromQuery]);

  // Pre-fill form if user is recognized
  useEffect(() => {
    if (user && isDeviceRecognized) {
      setDonationData(prev => ({
        ...prev,
        name: user.name || '',
        surname: user.surname || '',
        other_name: user.other_name || '',
        email: user.email || '',
        phone: user.phone || ''
      }));
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
      const result = await searchAlumni({ regNumber, email: searchEmail, phone: searchPhone });
      if (result.success) {
        setAlumniData(result.donor);
        setDonationData(prev => ({
          ...prev,
          name: result.donor.name || '',
          surname: result.donor.surname || '',
          other_name: result.donor.other_name || '',
          email: result.donor.email || '',
          phone: result.donor.phone || ''
        }));
        setCurrentStep('donation');
        toast.success('Alumni record found! Please update your information if needed.');
      } else {
        toast.error(result.message || 'Alumni record not found. Please check your registration number.');
      }
    } catch (error) {
      console.error('Alumni search error:', error);
      toast.error('Error searching for alumni. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  // Handle alumni update
  const handleAlumniUpdate = async (e) => {
    e.preventDefault();
    if (!alumniData) return;

    const updateData = {
      name: donationData.name || '',
      surname: donationData.surname || '',
      other_name: donationData.other_name && donationData.other_name.trim() ? donationData.other_name.trim() : null,
      email: donationData.email || '',
      phone: donationData.phone || '',
      reg_number: alumniData.reg_number,
      entry_year: alumniData.entry_year,
      graduation_year: alumniData.graduation_year,
      faculty_id: alumniData.faculty?.id,
      department_id: alumniData.department?.id,
      donor_type: alumniData.donor_type,
      address: alumniData.address,
      state: alumniData.state,
      city: alumniData.lga,
      lga: alumniData.lga
    };

    const result = await updateDonor(alumniData.id, updateData);
    if (result.success) {
      const donor = result.donor || alumniData;
      if (!isAuthenticated && donor?.id) {
        setPendingDonorId(donor.id);
        setShowSessionModal(true);
      } else {
        setCurrentStep('donation');
        toast.success('Profile updated successfully!');
      }
    }
  };

  // Handle payment submission
  const handlePaymentSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!donationData.amount || donationData.amount < 100) {
      toast.error('Please enter a valid amount (minimum ₦100)');
      return;
    }

    if (!user || !user.email || !isAuthenticated) {
      toast.error('Please login or register to make a donation');
      setShowAuthModal(true);
      return;
    }

    setProcessingPayment(true);

    try {
      await getCsrfCookie();

      const metadata = {
        name: user.name || '',
        surname: user.surname || '',
        other_name: user.other_name || null,
        phone: '',
        donor_id: user.id,
        endowment: selectedProject ? 'no' : 'yes',
        type: selectedProject ? 'project' : 'endowment'
      };
      if (selectedProject) {
        metadata.project_id = selectedProject.id;
        metadata.project_title = selectedProject.project_title;
      }

      const amountInNaira = parseFloat(donationData.amount) || 0;

      const paymentData = {
        email: user.email || '',
        amount: amountInNaira,
        device_fingerprint: getDeviceFingerprint(),
        callback_url: `${window.location.origin}/donations`,
        metadata: metadata
      };

      const response = await paymentsAPI.initialize(paymentData);
      const { access_code, reference } = response.data.data;

      await loadPaystackScript();

      const paystack = window.PaystackPop.setup({
        key: process.env.REACT_APP_PAYSTACK_PUBLIC_KEY || 'pk_test_your_key_here',
        email: paymentData.email,
        amount: amountInNaira * 100,
        ref: reference,
        metadata: metadata,
        onClose: () => setProcessingPayment(false),
        callback: (response) => {
          const ref = response.reference || response.trxref;
          if (ref) {
            paymentsAPI.verify(ref)
              .then(verifyResponse => {
                const verifyData = verifyResponse.data.data || verifyResponse.data;
                const isSuccess = verifyResponse.data.success || verifyData?.status === 'success' || (verifyData?.gateway_response && verifyData.gateway_response.toLowerCase() === 'successful');

                if (isSuccess) {
                  const projectName = selectedProject?.project_title || 'the Endowment Fund';
                  sessionStorage.setItem('donationThankYou', JSON.stringify({
                    project: projectName,
                    amount: verifyData?.amount ? verifyData.amount / 100 : amountInNaira
                  }));
                  toast.success('Payment verified successfully! 🎉');
                  setRedirecting(true);
                  setTimeout(() => navigate('/', { replace: true }), 500);
                } else {
                  toast.success('Payment received! Verification in progress...');
                  setRedirecting(true);
                  setTimeout(() => navigate('/', { replace: true }), 500);
                }
              })
              .catch(() => {
                toast.success('Payment received! Verification in progress...');
                setRedirecting(true);
                setTimeout(() => navigate('/', { replace: true }), 500);
              });
          }
        }
      });

      paystack.openIframe();
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error.response?.data?.message || 'Payment initialization failed. Please try again.');
    } finally {
      setProcessingPayment(false);
    }
  };

  const loadPaystackScript = () => {
    return new Promise((resolve, reject) => {
      if (window.PaystackPop) { resolve(); return; }
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v2/inline.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  };

  // Handle Paystack callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get('reference') || params.get('trxref');

    if (reference) {
      paymentsAPI.verify(reference)
        .then(response => {
          const paymentData = response.data.data || response.data;
          const isSuccess = response.data.success || paymentData?.status === 'success' || (paymentData?.gateway_response && paymentData.gateway_response.toLowerCase() === 'successful');

          if (isSuccess) {
            const amount = paymentData?.amount ? paymentData.amount / 100 : (donationData?.amount || 0);
            const projectName = paymentData?.metadata?.project_title || selectedProject?.project_title || 'the Endowment Fund';
            toast.success(`Thank you! Your donation has been processed successfully! 🎉`);
            window.history.replaceState({}, document.title, window.location.pathname);
            sessionStorage.setItem('donationThankYou', JSON.stringify({ project: projectName, amount }));
            setTimeout(() => navigate('/', { replace: true }), 300);
          }
        })
        .catch(() => {
          window.history.replaceState({}, document.title, window.location.pathname);
          setTimeout(() => navigate('/', { replace: true }), 500);
        });
    }
  }, [navigate, selectedProject, donationData]);

  // Auth state handling
  useEffect(() => {
    if (!loading && !isAuthenticated && currentStep === 'donation') {
      const timer = setTimeout(() => {
        if (!isAuthenticated && currentStep === 'donation') {
          const storedSessionId = localStorage.getItem('donor_session_id');
          if (!storedSessionId) setCurrentStep('login-register');
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
    if (!loading && isAuthenticated && currentStep === 'login-register') {
      setCurrentStep('donation');
    }
  }, [loading, isAuthenticated, currentStep]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthErrors({});
    setIsAuthSubmitting(true);
    try {
      const result = await login({ username: loginFormData.email.trim(), password: loginFormData.password });
      if (result.success) {
        toast.success('Login successful!');
        await checkSession();
        setCurrentStep('donation');
      } else {
        setAuthErrors({ submit: result.message || 'Login failed' });
        toast.error(result.message || 'Login failed');
      }
    } catch (error) {
      toast.error('An error occurred during login');
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleDonorTypeSelection = (type) => {
    if (type === 'Alumni') setCurrentStep('alumni-search');
    else setCurrentStep('registration');
  };

  const handleGoogleAuth = async (response) => {
    setIsGoogleLoading(true);
    try {
      const result = await googleLogin(response.credential);
      if (result.success) {
        toast.success('Google login successful!');
        await checkSession();
        setCurrentStep('donation');
      } else {
        const regResult = await googleRegister(response.credential);
        if (regResult.success) {
          toast.success('Google registration successful!');
          await checkSession();
          setCurrentStep('donor-type-selection');
        }
      }
    } catch (error) {
      toast.error('Google authentication failed');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const presetAmounts = ['500', '1000', '2000', '5000', '10000', '20000'];

  if (currentStep === 'login-register') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <img src={abuLogo} alt="ABU Logo" className="h-16 w-auto" />
              <div className="flex flex-col justify-center ml-3 h-16 text-left">
                <span className="text-sm font-bold leading-tight text-gray-800" style={{ lineHeight: '1.1' }}>ABU Endowment</span>
                <span className="text-xs font-bold text-gray-800 leading-none">& Crowd Funding</span>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{isLoginMode ? 'Welcome Back' : 'Join Us'}</h2>
            <p className="text-gray-600">{isLoginMode ? 'Login to your donor account' : 'Create a donor account to start'}</p>
          </div>
          {isLoginMode && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <div className="relative">
                  <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="email" value={loginFormData.email} onChange={(e) => setLoginFormData({ ...loginFormData, email: e.target.value })} required className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-abu-green/20 focus:border-abu-green outline-none transition-all" placeholder="Enter your email" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="password" value={loginFormData.password} onChange={(e) => setLoginFormData({ ...loginFormData, password: e.target.value })} required className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-abu-green/20 focus:border-abu-green outline-none transition-all" placeholder="Enter your password" />
                </div>
              </div>
              <button type="submit" disabled={isAuthSubmitting} className="w-full py-4 bg-abu-green text-white rounded-xl font-bold shadow-lg shadow-abu-green/20 hover:bg-abu-green-dark transition-all flex items-center justify-center gap-2">
                {isAuthSubmitting ? <FaSpinner className="animate-spin" /> : 'Login'}
              </button>
            </form>
          )}
          <div className="flex items-center my-6">
            <div className="flex-1 border-t border-gray-300"></div>
            <span className="px-4 text-sm text-gray-500">or</span>
            <div className="flex-1 border-t border-gray-300"></div>
          </div>
          <GoogleSignInButton onSuccess={handleGoogleAuth} onError={() => setIsGoogleLoading(false)} text={isLoginMode ? "Login with Google" : "Sign up with Google"} disabled={isGoogleLoading || isAuthSubmitting} />
          <div className="text-center mt-6">
            <button type="button" onClick={() => setIsLoginMode(!isLoginMode)} className="text-sm text-gray-600 hover:text-gray-800 font-medium">
              {isLoginMode ? <>Don't have an account? <span className="text-abu-green font-bold">Register</span></> : <>Already have an account? <span className="text-abu-green font-bold">Login</span></>}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 'donor-type-selection') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8">
          <div className="text-center mb-8">
            <img src={abuLogo} alt="ABU Logo" className="h-16 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Your Type</h2>
            <p className="text-gray-600">Are you an ABU Alumni or a Supporter?</p>
          </div>
          <div className="space-y-4">
            <button onClick={() => handleDonorTypeSelection('Alumni')} className="w-full p-6 bg-abu-green text-white rounded-2xl font-bold shadow-lg shadow-abu-green/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-3">
              <FaGraduationCap className="text-2xl" />
              <span>I'm an ABU Alumni</span>
            </button>
            <button onClick={() => handleDonorTypeSelection('Individual')} className="w-full p-6 bg-white text-gray-700 border-2 border-gray-100 rounded-2xl font-bold hover:border-abu-green/20 transition-all flex items-center justify-center gap-3">
              <FaHandHoldingHeart className="text-2xl text-abu-green" />
              <span>I'm a Supporter</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 'alumni-search') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-abu-green-light rounded-2xl flex items-center justify-center mx-auto mb-4 text-abu-green">
              <FaSearch className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Find Your Record</h2>
            <p className="text-gray-600 text-sm">Search with registration number, email, or phone</p>
          </div>
          <form onSubmit={handleAlumniSearch} className="space-y-4">
            <input type="text" value={regNumber} onChange={(e) => setRegNumber(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-abu-green/10 outline-none" placeholder="Registration Number" />
            <input type="email" value={searchEmail} onChange={(e) => setSearchEmail(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-abu-green/10 outline-none" placeholder="Email Address" />
            <button type="submit" disabled={searching} className="w-full py-4 bg-abu-green text-white rounded-xl font-bold shadow-lg shadow-abu-green/20 transition-all">
              {searching ? <FaSpinner className="animate-spin mx-auto" /> : 'Search Record'}
            </button>
          </form>
          <button onClick={() => setCurrentStep('registration')} className="w-full mt-4 text-sm text-gray-500 font-medium hover:text-abu-green transition-colors">Not an alumni? Register here</button>
        </div>
      </div>
    );
  }

  if (currentStep === 'registration') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-abu-green-light rounded-2xl flex items-center justify-center mx-auto mb-4 text-abu-green">
              <FaUser className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Account</h2>
            <p className="text-gray-600 text-sm">Step {registrationStep} of 2</p>
          </div>
          {registrationStep === 1 ? (
            <form onSubmit={handleRegistrationStep1} className="space-y-4">
              <input type="text" value={donationData.name} onChange={(e) => setDonationData({ ...donationData, name: e.target.value })} required className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none" placeholder="Full Name" />
              <select value={gender} onChange={e => setGender(e.target.value)} required className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none">
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
              <input type="email" value={donationData.email} onChange={(e) => setDonationData({ ...donationData, email: e.target.value })} required className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none" placeholder="Email Address" />
              <input type="tel" value={donationData.phone} onChange={(e) => setDonationData({ ...donationData, phone: e.target.value })} required className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none" placeholder="Phone Number" />
              <button type="submit" className="w-full py-4 bg-abu-green text-white rounded-xl font-bold shadow-lg transition-all">Next Step</button>
            </form>
          ) : (
            <form onSubmit={handleRegistrationStep2} className="space-y-4">
              <select value={country} onChange={e => setCountry(e.target.value)} required className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none">
                {countries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {country === 'Nigeria' && (
                <>
                  <select value={stateName} onChange={e => setStateName(e.target.value)} required className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none">
                    <option value="">Select State</option>
                    {availableStates.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select value={lga} onChange={e => setLga(e.target.value)} required className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none">
                    <option value="">Select LGA</option>
                    {availableLgas.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </>
              )}
              <input type="text" value={address} onChange={e => setAddress(e.target.value)} required className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none" placeholder="Residential Address" />
              <div className="flex gap-3">
                <button type="button" onClick={() => setRegistrationStep(1)} className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-xl font-bold">Back</button>
                <button type="submit" className="flex-[2] py-4 bg-abu-green text-white rounded-xl font-bold shadow-lg">Complete</button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-10">
      <SessionCreationModal isOpen={showSessionModal} onClose={() => { setShowSessionModal(false); setPendingDonorId(null); setCurrentStep('donation'); }} donorId={pendingDonorId} onSuccess={() => { setShowSessionModal(false); setPendingDonorId(null); setCurrentStep('donation'); toast.success('Account created!'); }} />
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onSuccess={async () => { await checkSession(); setShowAuthModal(false); }} />

      {/* Header Section */}
      <div className="bg-abu-green text-white pt-6 pb-16 px-6 rounded-b-[40px] relative">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
            <FaArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold leading-tight truncate">
              {selectedProject ? selectedProject.project_title : 'ABU Endowment Fund'}
            </h1>
            <p className="text-[10px] text-white/80 leading-relaxed line-clamp-2">
              {selectedProject ? selectedProject.project_description : 'Supporting the future of Ahmadu Bello University'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mt-8 px-6">
        <div className="bg-white rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-50 p-8">
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Select Amount</p>
              <span className="px-3 py-1 bg-abu-green-light text-abu-green text-[10px] font-bold rounded-full">Minimum ₦100</span>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              {presetAmounts.map((amt) => (
                <button
                  key={amt}
                  onClick={() => setDonationData({ ...donationData, amount: amt })}
                  className={`py-4 rounded-2xl text-sm font-bold transition-all duration-200 border ${donationData.amount === amt ? 'bg-abu-green text-white border-abu-green shadow-lg shadow-abu-green/20 scale-105' : 'bg-white text-gray-600 border-gray-100 hover:border-abu-green/20'}`}
                >
                  ₦{parseInt(amt).toLocaleString()}
                </button>
              ))}
            </div>

            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Or enter custom amount</p>
            <div className="relative group">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₦</span>
              <input
                type="number"
                value={donationData.amount}
                onChange={(e) => setDonationData({ ...donationData, amount: e.target.value })}
                className="w-full pl-10 pr-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl text-lg font-bold text-gray-900 focus:ring-2 focus:ring-abu-green/10 outline-none transition-all"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Summary Box */}
          <div className="bg-[#E6F3EF] rounded-3xl p-6 flex items-center justify-between mb-8">
            <p className="text-sm font-bold text-abu-green">You're donating</p>
            <p className="text-2xl font-black text-abu-green">₦{parseInt(donationData.amount || 0).toLocaleString()}</p>
          </div>

          {/* Pay Button */}
          <button
            onClick={handlePaymentSubmit}
            disabled={processingPayment || !isAuthenticated}
            className="w-full py-5 rounded-2xl bg-abu-green text-white font-bold text-lg shadow-2xl shadow-abu-green/30 hover:bg-abu-green-dark transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {processingPayment ? <FaSpinner className="animate-spin" /> : <FaCreditCard />}
            <span>{processingPayment ? 'Processing...' : `Pay ₦${parseInt(donationData.amount || 0).toLocaleString()}`}</span>
          </button>

          {/* Trust Indicators */}
          <div className="mt-8 flex items-center justify-center gap-6 text-gray-400">
            <div className="flex items-center gap-2">
              <FaShieldAlt className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">SSL Secured</span>
            </div>
            <div className="w-px h-4 bg-gray-100"></div>
            <div className="flex items-center gap-2">
              <FaLock className="w-3 h-3" />
              <span className="text-[10px] font-bold uppercase tracking-wider">256-bit Encryption</span>
            </div>
          </div>
        </div>
      </div>

      {/* Redirect Overlay */}
      {redirecting && (
        <div className="fixed inset-0 bg-abu-green/95 backdrop-blur-md z-[200] flex flex-col items-center justify-center p-8 text-center text-white">
          <div className="w-24 h-24 bg-white/20 rounded-[40px] flex items-center justify-center mb-8 animate-bounce">
            <FaSpinner className="w-10 h-10 text-white animate-spin" />
          </div>
          <h3 className="text-3xl font-black mb-4">Processing Payment</h3>
          <p className="text-white/70 max-w-xs leading-relaxed">Please wait while we verify your contribution and prepare your receipt.</p>
        </div>
      )}
    </div>
  );
};

export default Donations;
