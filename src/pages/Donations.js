import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FaCreditCard, FaUser, FaSearch, FaEnvelope, FaLock, FaGraduationCap, FaHandHoldingHeart, FaSpinner } from 'react-icons/fa';
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

  // Note: Phone number is no longer required for payments
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

    // Use user data if authenticated, otherwise show auth modal
    if (!user || !user.email || !isAuthenticated) {
      toast.error('Please login or register to make a donation');
      setShowAuthModal(true);
      setProcessingPayment(false);
      return;
    }

    // Note: Phone validation will be handled by backend
    // We'll proceed with payment and handle phone errors from backend response
    setProcessingPayment(true);

    try {
      await getCsrfCookie();

      // Prepare metadata with separate name fields from user data
      // Include phone as empty string to satisfy backend validation (backend may require the field even if empty)
      // Note: Email is sent in paymentData.email (top level) for Paystack, not in metadata
      // CRITICAL: Include donor_id in metadata so backend uses the authenticated donor, not device session donor
      const metadata = {
        name: user.name || '',
        surname: user.surname || '',
        other_name: user.other_name || null,
        phone: '', // Send empty string - backend should accept this or make field optional
        donor_id: user.id, // CRITICAL: Tell backend to use this donor_id, not device session donor
        // email: Not included - backend uses device session donor or paymentData.email
        endowment: selectedProject ? 'no' : 'yes',
        type: selectedProject ? 'project' : 'endowment'
      };
      if (selectedProject) {
        metadata.project_id = selectedProject.id;
        metadata.project_title = selectedProject.project_title;
      }

      // Convert amount to number (backend expects numeric, min:100 in naira)
      const amountInNaira = parseFloat(donationData.amount) || 0;

      if (amountInNaira < 100) {
        toast.error('Minimum donation amount is ₦100');
        setProcessingPayment(false);
        return;
      }

      const paymentData = {
        email: user.email || '',
        amount: amountInNaira, // Send amount in naira as number (backend will convert to kobo for Paystack)
        device_fingerprint: getDeviceFingerprint(),
        callback_url: `${window.location.origin}/donations`,
        metadata: metadata
      };

      console.log('Payment data with donor_id:', {
        email: paymentData.email,
        donor_id: metadata.donor_id,
        user_id: user.id,
        authenticated: isAuthenticated
      });

      console.log('Initializing Paystack payment:', paymentData);
      console.log('Amount in Naira:', amountInNaira);

      const response = await paymentsAPI.initialize(paymentData);

      const { access_code, authorization_url } = response.data.data;

      // Load Paystack script
      await loadPaystackScript();

      // Open Paystack payment popup using v2 API
      const paystack = window.PaystackPop.setup({
        key: process.env.REACT_APP_PAYSTACK_PUBLIC_KEY || 'pk_test_your_key_here', // You should set this in .env
        email: paymentData.email,
        amount: amountInNaira * 100, // Convert to kobo
        ref: response.data.data.reference, // Use the reference from backend
        metadata: metadata,
        onClose: function () {
          console.log('Paystack popup closed');
          setProcessingPayment(false);
        },
        callback: function (response) {
          // Payment successful - verify immediately with backend
          console.log('Paystack payment successful:', response);
          const reference = response.reference || response.trxref;

          if (reference) {
            // Verify payment with backend immediately
            console.log('Verifying payment immediately with reference:', reference);
            paymentsAPI.verify(reference)
              .then(verifyResponse => {
                console.log('Immediate verification response:', verifyResponse.data);
                const verifyData = verifyResponse.data.data || verifyResponse.data;

                // Check both status and gateway_response
                const isSuccess = verifyResponse.data.success ||
                  verifyData?.status === 'success' ||
                  (verifyData?.gateway_response &&
                    verifyData.gateway_response.toLowerCase() === 'successful');

                if (isSuccess) {
                  const projectName = selectedProject?.project_title || 'the Endowment Fund';
                  const amount = verifyData?.amount ? verifyData.amount / 100 : amountInNaira;

                  // Store thank you data
                  sessionStorage.setItem('donationThankYou', JSON.stringify({
                    project: projectName,
                    amount: amount
                  }));

                  toast.success('Payment verified successfully! 🎉');

                  // Redirect to home using React Router to preserve authentication state
                  setTimeout(() => {
                    navigate('/', { replace: true });
                  }, 500);
                } else {
                  // Verification didn't confirm success, but payment was made
                  console.warn('Payment made but verification unclear:', verifyData);
                  toast.success('Payment received! Verification in progress...');

                  // Still redirect - webhook will handle final verification
                  const projectName = selectedProject?.project_title || 'the Endowment Fund';
                  sessionStorage.setItem('donationThankYou', JSON.stringify({
                    project: projectName,
                    amount: amountInNaira
                  }));

                  setTimeout(() => {
                    navigate('/', { replace: true });
                  }, 500);
                }
              })
              .catch(error => {
                console.error('Immediate verification error:', error);
                // Payment was successful in Paystack, but verification failed
                // Still proceed - webhook will handle verification
                toast.success('Payment received! Verification in progress...');

                const projectName = selectedProject?.project_title || 'the Endowment Fund';
                sessionStorage.setItem('donationThankYou', JSON.stringify({
                  project: projectName,
                  amount: amountInNaira
                }));

                setTimeout(() => {
                  navigate('/', { replace: true });
                }, 500);
              });
          } else {
            // No reference - fallback to callback URL handling
            console.warn('No reference in Paystack response, relying on callback URL');
            const projectName = selectedProject?.project_title || 'the Endowment Fund';
            sessionStorage.setItem('donationThankYou', JSON.stringify({
              project: projectName,
              amount: amountInNaira
            }));

            setTimeout(() => {
              navigate('/', { replace: true });
            }, 500);
          }
        }
      });

      paystack.openIframe();

      // After payment, redirect will be handled by Paystack callback
      // The webhook will handle the donation record creation

    } catch (error) {
      console.error('Payment error:', error);
      console.error('Payment error response:', error.response?.data);
      console.error('Payment error status:', error.response?.status);

      if (error.response?.status === 500) {
        toast.error('Server error during payment initialization. Please check backend logs.');
      } else if (error.response?.status === 422) {
        const validationErrors = error.response?.data?.errors || {};
        console.error('Validation errors details:', validationErrors);

        // Handle validation errors
        if (Object.keys(validationErrors).length > 0) {
          // Check if it's a phone error - backend still requires phone field
          const phoneError = validationErrors.phone ||
            validationErrors['metadata.phone'] ||
            validationErrors['metadata.phone.0'];

          if (phoneError) {
            // Backend requires phone but we're sending empty string
            // This means backend validation needs to be updated to make phone optional
            console.error('Backend phone validation error:', phoneError);
            toast.error(
              'Backend validation error: Phone field is required by the backend. Please update backend to make phone optional for donations.',
              {
                duration: 8000,
                icon: '⚠️'
              }
            );
          } else {
            // Show each validation error clearly
            const errorMessages = Object.entries(validationErrors)
              .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
              .join(' | ');
            toast.error(`Validation failed: ${errorMessages}`, { duration: 6000 });
          }
        } else {
          const errorMessage = error.response?.data?.message || 'Payment validation failed. Please check your input.';
          toast.error(errorMessage, { duration: 5000 });
        }
      } else if (error.code === 'ERR_NETWORK') {
        toast.error('Network error. Please check your internet connection.');
      } else {
        const errorMessage = error.response?.data?.message || error.message || 'Payment initialization failed. Please try again.';
        toast.error(errorMessage, { duration: 5000 });
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
      script.src = 'https://js.paystack.co/v2/inline.js';
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
      console.log('Verifying payment with reference:', paymentRef);
      paymentsAPI.verify(paymentRef)
        .then(response => {
          console.log('Payment verification response:', response.data);
          const paymentData = response.data.data || response.data;

          // Check both status and gateway_response as per backend guide
          const isSuccess = response.data.success ||
            paymentData?.status === 'success' ||
            (paymentData?.gateway_response &&
              paymentData.gateway_response.toLowerCase() === 'successful');

          console.log('Payment verification result:', {
            isSuccess,
            status: paymentData?.status,
            gateway_response: paymentData?.gateway_response,
            responseSuccess: response.data.success
          });

          if (isSuccess) {
            // Get amount from payment response or fallback
            const amount = paymentData?.amount ? paymentData.amount / 100 : (donationData?.amount || 0);

            // Get project name from payment metadata, URL, or fallback
            const projectFromMetadata = paymentData?.metadata?.project_title || paymentData?.metadata?.project;
            const projectName = projectFromMetadata || projectFromUrl || selectedProject?.project_title || 'the Endowment Fund';

            toast.success(`Thank you! Your donation has been processed successfully! 🎉`);

            // Clean URL first
            window.history.replaceState({}, document.title, window.location.pathname);

            // Store thank you data in sessionStorage for home page to pick up (more reliable than navigate state)
            sessionStorage.setItem('donationThankYou', JSON.stringify({
              project: projectName,
              amount: amount
            }));

            // Redirect to home using React Router to preserve authentication state
            setTimeout(() => {
              navigate('/', { replace: true });
            }, 300); // Reduced delay for faster redirect
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

          // Redirect to home using React Router to preserve authentication state
          setTimeout(() => {
            // Store thank you data in sessionStorage for home page to pick up
            sessionStorage.setItem('donationThankYou', JSON.stringify({
              project: projectName,
              amount: amount
            }));
            // Use navigate to preserve authentication state
            navigate('/', { replace: true });
          }, 500); // Reduced delay for faster redirect
        });
    }
  }, [navigate, searchParams, selectedProject, donationData]);

  // Check if user needs to login/register first
  // Only show login modal if not authenticated AND not already on login step
  // Add longer delay to ensure auth state is fully restored (optimistic restoration)
  useEffect(() => {
    // Wait for loading to complete and give extra time for session restoration
    if (!loading && !isAuthenticated && currentStep === 'donation') {
      // Longer delay to ensure optimistic session restoration completes
      const timer = setTimeout(() => {
        // Triple-check authentication state before showing login modal
        // This prevents showing login modal if user is actually authenticated
        // but session restoration is still in progress
        if (!isAuthenticated && currentStep === 'donation') {
          // Check localStorage directly as a final check
          const storedSessionId = localStorage.getItem('donor_session_id');
          if (!storedSessionId) {
            // Only show login if there's truly no session
            setCurrentStep('login-register');
          }
          // If session ID exists, keep on donation step - session will restore
        }
      }, 1000); // Increased delay to 1 second for session restoration
      return () => clearTimeout(timer);
    }

    // If user becomes authenticated, ensure we're on donation step
    if (!loading && isAuthenticated && currentStep === 'login-register') {
      setCurrentStep('donation');
    }
  }, [loading, isAuthenticated, currentStep]);

  // Check if user needs donor type selection after registration
  useEffect(() => {
    if (isAuthenticated && user && !user.donor_type && currentStep !== 'donor-type-selection' && currentStep !== 'donation' && currentStep !== 'login-register') {
      // Small delay to ensure state is stable
      const timer = setTimeout(() => {
        setCurrentStep('donor-type-selection');
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, user, currentStep]);

  // Handle login
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthErrors({});
    setIsAuthSubmitting(true);

    try {
      const result = await login({
        username: loginFormData.email.trim(),
        password: loginFormData.password
      });

      if (result.success) {
        toast.success('Login successful!');
        await checkSession();
        // Wait a bit for user state to update, then check donor_type
        setTimeout(async () => {
          await checkSession(); // Refresh user data
          const updatedUser = await api.get('/api/donor-sessions/me').then(res => res.data?.data?.donor).catch(() => null);
          if (updatedUser && !updatedUser.donor_type) {
            setCurrentStep('donor-type-selection');
          } else {
            setCurrentStep('donation');
          }
        }, 800);
      } else {
        setAuthErrors({ submit: result.message || 'Login failed' });
        toast.error(result.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      setAuthErrors({ submit: 'An error occurred during login' });
      toast.error('An error occurred during login');
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  // Handle register
  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthErrors({});

    if (registerFormData.password !== registerFormData.password_confirmation) {
      setAuthErrors({ password_confirmation: 'Passwords do not match' });
      return;
    }

    if (registerFormData.password.length < 6) {
      setAuthErrors({ password: 'Password must be at least 6 characters' });
      return;
    }

    setIsAuthSubmitting(true);

    try {
      // First, create a minimal donor record if it doesn't exist
      let donorId = null;
      try {
        const donorResponse = await api.post('/api/donors', {
          email: registerFormData.email.trim(),
          name: '',
          surname: ''
        });
        if (donorResponse.data?.data?.id) {
          donorId = donorResponse.data.data.id;
        }
      } catch (donorError) {
        // If donor already exists, try to get it
        if (donorError.response?.status === 409 || donorError.response?.status === 422) {
          try {
            const existingDonor = await api.get(`/api/donors?email=${encodeURIComponent(registerFormData.email.trim())}`);
            if (existingDonor.data?.data?.[0]?.id) {
              donorId = existingDonor.data.data[0].id;
            }
          } catch (err) {
            console.error('Error fetching existing donor:', err);
          }
        }
      }

      if (!donorId) {
        throw new Error('Failed to create or find donor record');
      }

      // Now register the session
      const result = await register({
        username: registerFormData.email.trim(),
        password: registerFormData.password,
        donor_id: donorId
      });

      if (result.success) {
        toast.success('Registration successful!');
        await checkSession();
        // Wait a bit for user state to update, then check donor_type
        setTimeout(async () => {
          await checkSession(); // Refresh user data
          const updatedUser = await api.get('/api/donor-sessions/me').then(res => res.data?.data?.donor).catch(() => null);
          if (updatedUser && !updatedUser.donor_type) {
            setCurrentStep('donor-type-selection');
          } else {
            setCurrentStep('donation');
          }
        }, 800);
      } else {
        setAuthErrors({ submit: result.message || 'Registration failed' });
        toast.error(result.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setAuthErrors({ submit: error.response?.data?.message || 'An error occurred during registration' });
      toast.error(error.response?.data?.message || 'An error occurred during registration');
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  // Handle Google register/login
  const handleGoogleAuth = async (idToken) => {
    setIsGoogleLoading(true);
    try {
      // Try register first
      let result = await googleRegister(idToken);

      // If account exists, try login
      if (!result.success && result.error?.response?.status === 409) {
        result = await googleLogin(idToken);
      }

      if (result.success) {
        toast.success('Google authentication successful!');
        await checkSession();
        // Wait a bit for user state to update, then check donor_type
        setTimeout(async () => {
          await checkSession(); // Refresh user data
          const updatedUser = await api.get('/api/donor-sessions/me').then(res => res.data?.data?.donor).catch(() => null);
          if (updatedUser && !updatedUser.donor_type) {
            setCurrentStep('donor-type-selection');
          } else {
            setCurrentStep('donation');
          }
        }, 800);
      } else {
        toast.error(result.message || 'Google authentication failed');
      }
    } catch (error) {
      console.error('Google auth error:', error);
      toast.error('Google authentication failed');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Handle donor type selection
  const handleDonorTypeSelection = async (donorType) => {
    if (!user || !user.id) {
      toast.error('User information not available');
      return;
    }

    try {
      const result = await updateDonor(user.id, { donor_type: donorType });
      if (result.success) {
        toast.success('Profile updated successfully!');
        await checkSession();
        setCurrentStep('donation');
      } else {
        toast.error(result.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Update donor type error:', error);
      toast.error('Failed to update profile');
    }
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

  // Login/Register Screen
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {isLoginMode ? 'Login to Donate' : 'Create Account'}
            </h2>
            <p className="text-gray-600">
              {isLoginMode ? 'Please login to continue with your donation' : 'Create an account to make your donation'}
            </p>
          </div>

          {isLoginMode ? (
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label htmlFor="loginEmail" className="block text-sm font-semibold text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaEnvelope className="text-gray-400" />
                  </div>
                  <input
                    type="email"
                    id="loginEmail"
                    value={loginFormData.email}
                    onChange={(e) => setLoginFormData({ ...loginFormData, email: e.target.value })}
                    className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all ${authErrors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                    placeholder="Enter your email"
                    required
                    disabled={isAuthSubmitting}
                  />
                </div>
                {authErrors.email && (
                  <p className="mt-1 text-sm text-red-600">{authErrors.email}</p>
                )}
              </div>

              <div>
                <label htmlFor="loginPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaLock className="text-gray-400" />
                  </div>
                  <input
                    type="password"
                    id="loginPassword"
                    value={loginFormData.password}
                    onChange={(e) => setLoginFormData({ ...loginFormData, password: e.target.value })}
                    className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all ${authErrors.password ? 'border-red-500' : 'border-gray-300'
                      }`}
                    placeholder="Enter your password"
                    required
                    disabled={isAuthSubmitting}
                  />
                </div>
                {authErrors.password && (
                  <p className="mt-1 text-sm text-red-600">{authErrors.password}</p>
                )}
              </div>

              {authErrors.submit && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                  <p className="text-sm text-red-600">{authErrors.submit}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isAuthSubmitting}
                className="w-full bg-gradient-to-r from-gray-600 to-gray-700 text-white py-3 rounded-xl font-semibold hover:from-gray-700 hover:to-gray-800 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
              >
                {isAuthSubmitting ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    <span>Logging in...</span>
                  </>
                ) : (
                  'Login'
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-6">
              <div>
                <label htmlFor="registerEmail" className="block text-sm font-semibold text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaEnvelope className="text-gray-400" />
                  </div>
                  <input
                    type="email"
                    id="registerEmail"
                    value={registerFormData.email}
                    onChange={(e) => setRegisterFormData({ ...registerFormData, email: e.target.value })}
                    className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all ${authErrors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                    placeholder="Enter your email"
                    required
                    disabled={isAuthSubmitting}
                  />
                </div>
                {authErrors.email && (
                  <p className="mt-1 text-sm text-red-600">{authErrors.email}</p>
                )}
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label htmlFor="registerPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaLock className="text-gray-400" />
                    </div>
                    <input
                      type="password"
                      id="registerPassword"
                      value={registerFormData.password}
                      onChange={(e) => setRegisterFormData({ ...registerFormData, password: e.target.value })}
                      className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all ${authErrors.password ? 'border-red-500' : 'border-gray-300'
                        }`}
                      placeholder="Password"
                      required
                      disabled={isAuthSubmitting}
                    />
                  </div>
                  {authErrors.password && (
                    <p className="mt-1 text-sm text-red-600">{authErrors.password}</p>
                  )}
                </div>

                <div className="flex-1">
                  <label htmlFor="registerPasswordConfirmation" className="block text-sm font-semibold text-gray-700 mb-2">
                    Confirm
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaLock className="text-gray-400" />
                    </div>
                    <input
                      type="password"
                      id="registerPasswordConfirmation"
                      value={registerFormData.password_confirmation}
                      onChange={(e) => setRegisterFormData({ ...registerFormData, password_confirmation: e.target.value })}
                      className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all ${authErrors.password_confirmation ? 'border-red-500' : 'border-gray-300'
                        }`}
                      placeholder="Confirm"
                      required
                      disabled={isAuthSubmitting}
                    />
                  </div>
                  {authErrors.password_confirmation && (
                    <p className="mt-1 text-sm text-red-600">{authErrors.password_confirmation}</p>
                  )}
                </div>
              </div>

              {authErrors.submit && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                  <p className="text-sm text-red-600">{authErrors.submit}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isAuthSubmitting}
                className="w-full bg-gradient-to-r from-gray-600 to-gray-700 text-white py-3 rounded-xl font-semibold hover:from-gray-700 hover:to-gray-800 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
              >
                {isAuthSubmitting ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>
          )}

          {/* Divider */}
          <div className="flex items-center my-6">
            <div className="flex-1 border-t border-gray-300"></div>
            <span className="px-4 text-sm text-gray-500">or</span>
            <div className="flex-1 border-t border-gray-300"></div>
          </div>

          {/* Google Sign In Button */}
          <GoogleSignInButton
            onSuccess={handleGoogleAuth}
            onError={(error) => {
              toast.error(error.message || 'Google authentication was cancelled or failed');
              setIsGoogleLoading(false);
            }}
            text={isLoginMode ? "Login with Google" : "Sign up with Google"}
            disabled={isGoogleLoading || isAuthSubmitting}
          />

          {/* Toggle between Login and Register */}
          <div className="text-center mt-6">
            <button
              type="button"
              onClick={() => {
                setIsLoginMode(!isLoginMode);
                setAuthErrors({});
              }}
              className="text-sm text-gray-600 hover:text-gray-800 font-medium"
            >
              {isLoginMode ? (
                <>Don't have an account? <span className="text-gray-800 font-semibold">Register</span></>
              ) : (
                <>Already have an account? <span className="text-gray-800 font-semibold">Login</span></>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Donor Type Selection Screen
  if (currentStep === 'donor-type-selection') {
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Your Type</h2>
            <p className="text-gray-600">Please select whether you are an ABU Alumni or a Supporter</p>
          </div>

          <div className="space-y-4 mb-6">
            <button
              onClick={() => handleDonorTypeSelection('Alumni')}
              className="w-full p-6 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl font-semibold hover:from-gray-700 hover:to-gray-800 transition-all transform hover:scale-105 shadow-lg flex items-center justify-center gap-3"
            >
              <FaGraduationCap className="text-2xl" />
              <span className="text-lg">I'm an ABU Alumni</span>
            </button>

            <button
              onClick={() => handleDonorTypeSelection('Individual')}
              className="w-full p-6 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl font-semibold hover:from-gray-700 hover:to-gray-800 transition-all transform hover:scale-105 shadow-lg flex items-center justify-center gap-3"
            >
              <FaHandHoldingHeart className="text-2xl" />
              <span className="text-lg">I'm a Supporter</span>
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center my-6">
            <div className="flex-1 border-t border-gray-300"></div>
            <span className="px-4 text-sm text-gray-500">or</span>
            <div className="flex-1 border-t border-gray-300"></div>
          </div>

          {/* Google Sign Up Button */}
          <GoogleSignInButton
            onSuccess={handleGoogleAuth}
            onError={(error) => {
              toast.error(error.message || 'Google sign up was cancelled or failed');
              setIsGoogleLoading(false);
            }}
            text="Sign up with Google"
            disabled={isGoogleLoading}
          />
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
                  onChange={(e) => setDonationData({ ...donationData, name: e.target.value })}
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
                  onChange={(e) => setDonationData({ ...donationData, email: e.target.value })}
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
                  onChange={(e) => setDonationData({ ...donationData, phone: e.target.value })}
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

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={async () => {
          // Refresh user data after successful login/register
          await checkSession();
          setShowAuthModal(false);
        }}
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
            {user && (user.name || user.surname) && (
              <p className="text-lg text-gray-700 mb-4">
                {[user.name, user.surname].filter(Boolean).join(' ') || user.email}, you are about to donate to{' '}
                <span className="font-bold text-gray-900">
                  {selectedProject ? selectedProject.project_title : 'the Endowment Fund'}
                </span>
              </p>
            )}
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
                <p><strong>Target:</strong> {formatNaira(projectDetails.target || projectDetails.target_amount || 0)}</p>
                <p><strong>Raised:</strong> {formatNaira(projectDetails.raised || projectDetails.amount || projectDetails.current_amount || projectDetails.raised_amount || 0)}</p>
              </div>
            </div>
          )}

          {/* Login/Register Buttons - Show if not authenticated */}
          {!isAuthenticated && (
            <div className="mb-8 p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border-2 border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Login or Register to Donate</h3>
              <p className="text-sm text-gray-600 mb-4">
                Please login or create an account to proceed with your donation
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="flex-1 py-3 px-6 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all transform hover:scale-105 shadow-lg font-semibold"
                >
                  Login / Register
                </button>
              </div>
            </div>
          )}

          <form onSubmit={alumniData ? handleAlumniUpdate : handlePaymentSubmit} className="space-y-6">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Donation Amount (₦) *
              </label>
              <input
                type="number"
                value={donationData.amount}
                onChange={(e) => setDonationData({ ...donationData, amount: e.target.value })}
                required
                min="100"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter amount (minimum ₦100)"
              />
            </div>

            <button
              type="submit"
              disabled={processingPayment || !isAuthenticated}
              className="w-full py-3 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <FaCreditCard className="w-5 h-5" />
              {processingPayment ? 'Processing...' :
                !isAuthenticated ? 'Please Login or Register' :
                  alumniData ? 'Update & Continue' :
                    `Pay ${formatNaira(donationData.amount)} ${isEndowment ? 'to Endowment' : 'to Project'}`
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
