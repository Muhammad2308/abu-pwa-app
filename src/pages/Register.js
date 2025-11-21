import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { FaUser, FaLock, FaSpinner, FaSearch, FaEnvelope, FaPhone, FaMapMarkerAlt, FaCity, FaBuilding, FaIdCard, FaArrowLeft, FaGraduationCap } from 'react-icons/fa';
import { donorsAPI, facultiesAPI } from '../services/api';
import abuLogo from '../assets/abu_logo.png';
import { GoogleSignInButton } from '../hooks/useGoogleAuth';

const Register = () => {
  const navigate = useNavigate();
  const { register, googleRegister, isAuthenticated, loading } = useAuth();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Redirect if already authenticated (similar to Login.js)
  useEffect(() => {
    if (!loading && isAuthenticated) {
      console.log('Register: User is authenticated, redirecting to home...');
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  const [step, setStep] = useState('register'); // 'search', 'found', 'register' - default to 'register' for simplified flow
  const [searchData, setSearchData] = useState({
    searchType: 'email', // 'email', 'phone', 'regNumber'
    searchValue: '',
  });
  const [foundDonor, setFoundDonor] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [formData, setFormData] = useState({
    // Donor fields
    donor_type: 'Alumni', // 'Alumni', 'Individual', 'Organization', 'NGO'
    name: '',
    surname: '',
    other_name: '',
    email: '',
    phone: '',
    address: '',
    state: '',
    city: '',
    registration_number: '', // For Alumni
    organization_name: '', // For Organization/NGO
    // Alumni specific fields
    entry_year: '',
    graduation_year: '',
    faculty_id: '',
    department_id: '',
    // User account fields
    password: '',
    password_confirmation: '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableFaculties, setAvailableFaculties] = useState([]);
  const [availableDepartments, setAvailableDepartments] = useState([]);
  const [loadingFaculties, setLoadingFaculties] = useState(false);
  const [loadingDepartments, setLoadingDepartments] = useState(false);

  // Generate year options (from 1950 to current year + 5)
  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const startYear = 1950;
    const endYear = currentYear + 5;
    const years = [];
    for (let year = endYear; year >= startYear; year--) {
      years.push(year);
    }
    return years;
  };

  // Fetch faculties based on entry_year
  useEffect(() => {
    const fetchFaculties = async () => {
      if (formData.donor_type === 'Alumni' && formData.entry_year) {
        setLoadingFaculties(true);
        try {
          const response = await facultiesAPI.getByEntryYear(formData.entry_year);
          if (response.data?.success && response.data?.data) {
            setAvailableFaculties(response.data.data);
          } else if (Array.isArray(response.data?.data)) {
            setAvailableFaculties(response.data.data);
          } else {
            setAvailableFaculties([]);
          }
        } catch (error) {
          console.error('Error fetching faculties:', error);
          toast.error('Failed to load faculties');
          setAvailableFaculties([]);
        } finally {
          setLoadingFaculties(false);
        }
      } else {
        setAvailableFaculties([]);
      }
    };

    fetchFaculties();
  }, [formData.entry_year, formData.donor_type]);

  // Fetch departments based on entry_year and faculty_id
  useEffect(() => {
    const fetchDepartments = async () => {
      if (formData.donor_type === 'Alumni' && formData.entry_year && formData.faculty_id) {
        setLoadingDepartments(true);
        try {
          const response = await facultiesAPI.getDepartmentsByEntryYear(formData.faculty_id, formData.entry_year);
          if (response.data?.success && response.data?.data) {
            setAvailableDepartments(response.data.data);
          } else if (Array.isArray(response.data?.data)) {
            setAvailableDepartments(response.data.data);
          } else {
            setAvailableDepartments([]);
          }
        } catch (error) {
          console.error('Error fetching departments:', error);
          toast.error('Failed to load departments');
          setAvailableDepartments([]);
        } finally {
          setLoadingDepartments(false);
        }
      } else {
        setAvailableDepartments([]);
      }
    };

    fetchDepartments();
  }, [formData.entry_year, formData.faculty_id, formData.donor_type]);

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  const handleSearchChange = (e) => {
    const { name, value } = e.target;
    setSearchData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!searchData.searchValue.trim()) {
      toast.error('Please enter a search value');
      return;
    }

    setIsSearching(true);
    setErrors({});

    try {
      let response;
      if (searchData.searchType === 'email') {
        response = await donorsAPI.searchByEmail(searchData.searchValue.trim());
      } else if (searchData.searchType === 'phone') {
        response = await donorsAPI.searchByPhone(searchData.searchValue.trim());
      } else {
        response = await donorsAPI.searchByRegNumber(searchData.searchValue.trim());
      }

      if (response.data?.success && response.data?.data) {
        setFoundDonor(response.data.data);
        setStep('found');
        // Pre-fill form with found donor data
        setFormData(prev => ({
          ...prev,
          name: response.data.data.name || '',
          surname: response.data.data.surname || '',
          other_name: response.data.data.other_name || '',
          email: response.data.data.email || '',
          phone: response.data.data.phone || '',
          address: response.data.data.address || '',
          state: response.data.data.state || '',
          city: response.data.data.city || '',
          registration_number: response.data.data.registration_number || '',
          organization_name: response.data.data.organization_name || '',
          donor_type: response.data.data.donor_type || 'Alumni',
          // Alumni specific fields
          entry_year: response.data.data.entry_year ? String(response.data.data.entry_year) : '',
          graduation_year: response.data.data.graduation_year ? String(response.data.data.graduation_year) : '',
          faculty_id: response.data.data.faculty_id ? String(response.data.data.faculty_id) : '',
          department_id: response.data.data.department_id ? String(response.data.data.department_id) : '',
        }));
        toast.success('Donor found! Please complete your account registration.');
      } else {
        // Donor not found, proceed to registration
        setStep('register');
        // Pre-fill search value in form
        if (searchData.searchType === 'email') {
          setFormData(prev => ({ ...prev, email: searchData.searchValue.trim() }));
        } else if (searchData.searchType === 'phone') {
          setFormData(prev => ({ ...prev, phone: searchData.searchValue.trim() }));
        }
        toast.info('Donor not found. Please complete registration with your details.');
      }
    } catch (error) {
      console.error('Search error:', error);
      // If search fails, assume donor doesn't exist and proceed to registration
      setStep('register');
      if (searchData.searchType === 'email') {
        setFormData(prev => ({ ...prev, email: searchData.searchValue.trim() }));
      } else if (searchData.searchType === 'phone') {
        setFormData(prev => ({ ...prev, phone: searchData.searchValue.trim() }));
      }
      toast.info('Donor not found. Please complete registration with your details.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: value
      };
      
      // Reset dependent fields when entry_year changes
      if (name === 'entry_year') {
        newData.faculty_id = '';
        newData.department_id = '';
        setAvailableDepartments([]);
      }
      
      // Reset department when faculty changes
      if (name === 'faculty_id') {
        newData.department_id = '';
        setAvailableDepartments([]);
      }
      
      return newData;
    });
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validate = () => {
    const newErrors = {};

    // Validate donor fields
    if (!formData.name.trim()) {
      newErrors.name = 'First name is required';
    }
    if (!formData.surname.trim()) {
      newErrors.surname = 'Surname is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\+[1-9]\d{1,14}$/.test(formData.phone.trim())) {
      newErrors.phone = 'Phone number must be in international format (e.g., +2348012345678)';
    }
    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }
    if (!formData.state.trim()) {
      newErrors.state = 'State is required';
    }
    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }

    // Validate donor type specific fields
    if (formData.donor_type === 'Alumni') {
      if (!formData.registration_number.trim()) {
        newErrors.registration_number = 'Registration number is required for Alumni';
      }
      if (!formData.entry_year) {
        newErrors.entry_year = 'Entry year is required for Alumni';
      }
      if (!formData.graduation_year) {
        newErrors.graduation_year = 'Graduation year is required for Alumni';
      }
      if (!formData.faculty_id) {
        newErrors.faculty_id = 'Faculty is required for Alumni';
      }
      if (!formData.department_id) {
        newErrors.department_id = 'Department is required for Alumni';
      }
      // Validate graduation year is after entry year
      if (formData.entry_year && formData.graduation_year && parseInt(formData.graduation_year) < parseInt(formData.entry_year)) {
        newErrors.graduation_year = 'Graduation year must be after entry year';
      }
    }
    if ((formData.donor_type === 'Organization' || formData.donor_type === 'NGO') && !formData.organization_name.trim()) {
      newErrors.organization_name = 'Organization name is required';
    }

    // Validate user account fields (email is already validated above)
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.password_confirmation) {
      newErrors.password_confirmation = 'Please confirm your password';
    } else if (formData.password !== formData.password_confirmation) {
      newErrors.password_confirmation = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Simplified validation - only email and password
    if (!formData.email || !formData.email.trim()) {
      setErrors({ email: 'Email is required' });
      return;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      setErrors({ email: 'Please enter a valid email address' });
      return;
    }

    if (!formData.password || formData.password.length < 6) {
      setErrors({ password: 'Password must be at least 6 characters' });
      return;
    }

    if (formData.password !== formData.password_confirmation) {
      setErrors({ password_confirmation: 'Passwords do not match' });
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      let donorId = foundDonor?.id;

      // If donor not found, create minimal donor first (required for donor_sessions)
      if (!donorId) {
        // Create minimal donor with email (required)
        if (!formData.email || !formData.email.trim()) {
          toast.error('Email is required for registration');
          setErrors({ email: 'Email is required' });
          setIsSubmitting(false);
          return;
        }
        
        const minimalDonorData = {
          donor_type: 'Individual',
          name: 'User',
          surname: '',
          email: formData.email.trim(),
          phone: formData.phone?.trim() || '',
        };

        try {
          const donorResponse = await donorsAPI.create(minimalDonorData);
          
          // Handle different response structures
          if (donorResponse.data?.success) {
            donorId = donorResponse.data.data?.id || donorResponse.data.data?.donor?.id || donorResponse.data.id;
          } else if (donorResponse.data?.data?.id) {
            donorId = donorResponse.data.data.id;
          } else if (donorResponse.data?.id) {
            donorId = donorResponse.data.id;
          }

          if (!donorId) {
            throw new Error('Failed to get donor ID from response');
          }

          // Ensure donorId is a number
          donorId = parseInt(donorId, 10);
          
          if (isNaN(donorId)) {
            throw new Error('Invalid donor ID received');
          }
        } catch (donorError) {
          console.error('Donor creation error:', donorError);
          
          // Handle validation errors from donor creation
          if (donorError.response?.status === 422) {
            const validationErrors = donorError.response.data?.errors || {};
            const errorMessages = Object.entries(validationErrors)
              .map(([field, messages]) => {
                const message = Array.isArray(messages) ? messages[0] : messages;
                return `${field}: ${message}`;
              })
              .join(', ');
            
            toast.error(`Validation error: ${errorMessages}`);
            setErrors(validationErrors);
            setIsSubmitting(false);
            return;
          }
          
          const donorErrorMessage = donorError.response?.data?.message || donorError.message || 'Failed to create donor';
          toast.error(donorErrorMessage);
          setErrors({ submit: donorErrorMessage });
          setIsSubmitting(false);
          return;
        }
      } else {
        // Ensure donorId is a number
        donorId = parseInt(donorId, 10);
        if (isNaN(donorId)) {
          throw new Error('Invalid donor ID');
        }
      }

      // Get email from donor (either from foundDonor or from formData)
      const donorEmail = foundDonor?.email || formData.email.trim();
      
      if (!donorEmail) {
        toast.error('Email is required for registration');
        setErrors({ email: 'Email is required' });
        setIsSubmitting(false);
        return;
      }

      // Create user session (only donor_sessions table)
      // Username will be set to email from donors table
      const registerData = {
        username: donorEmail, // Use email as username
        password: formData.password,
        donor_id: donorId,
      };
      
      console.log('Registering user session with data:', registerData);
      
      const result = await register(registerData);

      if (result.success) {
        toast.success(result.message || 'Registration successful! You can now complete your profile.');
        navigate('/', { replace: true });
      } else {
        toast.error(result.message || 'Registration failed');
        
        // If there are field-level errors, map them to form fields
        if (result.errors) {
          const fieldErrors = {};
          Object.keys(result.errors).forEach(field => {
            const messages = result.errors[field];
            fieldErrors[field] = Array.isArray(messages) ? messages[0] : messages;
          });
          setErrors(fieldErrors);
        } else {
          setErrors({ submit: result.message || 'Registration failed' });
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      console.error('Error response:', error.response?.data);
      
      // Handle validation errors
      if (error.response?.status === 422) {
        const validationErrors = error.response.data?.errors || {};
        const errorMessages = Object.entries(validationErrors)
          .map(([field, messages]) => {
            const message = Array.isArray(messages) ? messages[0] : messages;
            return `${field}: ${message}`;
          })
          .join(', ');
        
        toast.error(`Validation error: ${errorMessages}`);
        
        // Map backend errors to form fields
        const fieldErrors = {};
        Object.keys(validationErrors).forEach(field => {
          const messages = validationErrors[field];
          fieldErrors[field] = Array.isArray(messages) ? messages[0] : messages;
        });
        setErrors(fieldErrors);
      } else {
        const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
        toast.error(errorMessage);
        setErrors({ submit: errorMessage });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Google OAuth Register Handler
  const handleGoogleRegister = async (idToken) => {
    setIsGoogleLoading(true);
    try {
      console.log('Starting Google registration...');
      const result = await googleRegister(idToken);
      console.log('Google registration result:', result);
      
      if (result.success) {
        toast.success(result.message || 'Google registration successful!');
        console.log('Registration successful, navigating to home...');
        
        // Wait a bit longer to ensure state is fully updated, then navigate
        setTimeout(() => {
          console.log('Navigating to home page...');
          // Try React Router navigation first
          navigate('/', { replace: true });
          // Fallback: Force navigation if React Router doesn't work
          setTimeout(() => {
            if (window.location.pathname !== '/') {
              console.log('React Router navigation failed, using window.location...');
              window.location.href = '/';
            }
          }, 200);
        }, 500);
      } else {
        // Show detailed error message
        const errorMsg = result.message || 'Google registration failed';
        
        // Show more helpful error messages
        if (errorMsg.includes('email') && errorMsg.includes('verified')) {
          toast.error('Please verify your Google email first, then try again.', { 
            duration: 8000,
            icon: '📧',
          });
        } else if (errorMsg.includes('expired')) {
          toast.error('Google sign-in expired. Please try again.', { 
            duration: 6000,
            icon: '⏰',
          });
        } else if (errorMsg.includes('Invalid') || errorMsg.includes('token')) {
          toast.error('Google sign-in failed. Please try signing in with Google again.', { 
            duration: 6000,
            icon: '🔐',
          });
        } else {
          toast.error(errorMsg, { duration: 6000 });
        }
        
        console.error('Registration failed:', errorMsg, result.error);
        
        // If it's a 409 (account exists), offer to redirect to login
        if (result.error?.response?.status === 409) {
          setTimeout(() => {
            if (window.confirm('This account already exists. Would you like to login instead?')) {
              navigate('/login', { replace: true });
            }
          }, 2000);
        }
        
        // If it's a 401, suggest trying again
        if (result.error?.response?.status === 401) {
          console.log('401 error - Token verification failed. This could be a backend issue.');
          console.log('Suggestions:');
          console.log('1. Check backend GoogleAuthService is correctly verifying tokens');
          console.log('2. Verify GOOGLE_CLIENT_ID matches in backend .env');
          console.log('3. Check backend logs for detailed error');
        }
        
        // If it's a 500 error with backend implementation issue, show helpful message
        if (result.error?.response?.status === 500) {
          const backendError = result.error?.response?.data?.message || result.error?.response?.data?.exception || '';
          if (backendError.includes('Google_Client') || backendError.includes('not found')) {
            console.error('Backend Google OAuth not configured. Please check backend implementation.');
            const detailedMsg = 'Backend Google OAuth is not configured. The server needs to install the Google API client library. Error: ' + backendError;
            toast.error(detailedMsg, { duration: 10000 });
            console.error('Full backend error:', result.error?.response?.data);
          } else {
            // Show the actual backend error message
            const errorDetails = result.error?.response?.data?.message || result.error?.response?.data?.exception || 'Unknown server error';
            console.error('Backend 500 error:', errorDetails);
            toast.error(`Server error: ${errorDetails}`, { duration: 8000 });
          }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="text-center">
          <FaSpinner className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4 py-8">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <img src={abuLogo} alt="ABU Logo" className="h-16 w-auto" />
            <div className="flex flex-col justify-center ml-3 h-16 text-left">
              <span className="text-sm font-bold leading-tight text-gray-800" style={{lineHeight: '1.1'}}>ABU Endowment</span>
              <span className="text-xs font-bold text-gray-800 leading-none">& Crowd Funding</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Create Account</h1>
          <p className="text-gray-600">Create your account with email and password. You can complete your profile later.</p>
        </div>

        {/* Simplified Registration Step - Only Email/Password */}
        {step === 'register' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Email *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaEnvelope className="text-gray-400" />
                </div>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter your email address"
                  disabled={isSubmitting}
                  required
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            {/* Password Fields in Flexbox */}
            <div className="flex gap-4">
              {/* Password Field */}
              <div className="flex-1">
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                  Password *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaLock className="text-gray-400" />
                  </div>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      errors.password ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Create password"
                    disabled={isSubmitting}
                    required
                  />
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                )}
              </div>

              {/* Password Confirmation Field */}
              <div className="flex-1">
                <label htmlFor="password_confirmation" className="block text-sm font-semibold text-gray-700 mb-2">
                  Confirm Password *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaLock className="text-gray-400" />
                  </div>
                  <input
                    type="password"
                    id="password_confirmation"
                    name="password_confirmation"
                    value={formData.password_confirmation}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      errors.password_confirmation ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Confirm password"
                    disabled={isSubmitting}
                    required
                  />
                </div>
                {errors.password_confirmation && (
                  <p className="mt-1 text-sm text-red-600">{errors.password_confirmation}</p>
                )}
              </div>
            </div>

            {errors.submit && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <FaSpinner className="animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <FaUser />
                  <span>Create Account</span>
                </>
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
              text="Register with Google"
              disabled={isGoogleLoading || isSubmitting}
            />

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="text-blue-600 font-semibold hover:text-blue-700 hover:underline">
                  Login
                </Link>
              </p>
            </div>
          </form>
        )}

        {/* Search Step - Optional */}
        {step === 'search' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-blue-800">
                <strong>First, let's check if you're already in our system.</strong> Search by email, phone, or registration number.
              </p>
            </div>

            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Search By
                </label>
                <select
                  name="searchType"
                  value={searchData.searchType}
                  onChange={handleSearchChange}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="email">Email Address</option>
                  <option value="phone">Phone Number</option>
                  <option value="regNumber">Registration Number</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {searchData.searchType === 'email' ? 'Email Address' : 
                   searchData.searchType === 'phone' ? 'Phone Number' : 
                   'Registration Number'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    {searchData.searchType === 'email' ? <FaEnvelope className="text-gray-400" /> :
                     searchData.searchType === 'phone' ? <FaPhone className="text-gray-400" /> :
                     <FaIdCard className="text-gray-400" />}
                  </div>
                  <input
                    type={searchData.searchType === 'email' ? 'email' : 'text'}
                    name="searchValue"
                    value={searchData.searchValue}
                    onChange={handleSearchChange}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={
                      searchData.searchType === 'email' ? 'Enter your email address' :
                      searchData.searchType === 'phone' ? 'Enter your phone number (+2348012345678)' :
                      'Enter your registration number'
                    }
                    disabled={isSearching}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSearching}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
              >
                {isSearching ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    <FaSearch />
                    <span>Search</span>
                  </>
                )}
              </button>
            </form>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setStep('register')}
                className="text-blue-600 font-semibold hover:text-blue-700 hover:underline"
              >
                Skip search and register as new user
              </button>
            </div>
          </div>
        )}

        {/* Found Donor Step */}
        {step === 'found' && (
          <div className="space-y-6">
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-green-800">
                <strong>Great! We found your record.</strong> Please complete your account registration below.
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">Your Information</h3>
              <p className="text-sm text-gray-600">
                <strong>Name:</strong> {foundDonor.name} {foundDonor.surname} {foundDonor.other_name || ''}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Email:</strong> {foundDonor.email}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Phone:</strong> {foundDonor.phone}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setStep('search')}
              className="text-blue-600 font-semibold hover:text-blue-700 hover:underline flex items-center gap-2 mb-4"
            >
              <FaArrowLeft />
              <span>Search again</span>
            </button>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field - Email will be used as username */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                  Email * (will be used as your login)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaEnvelope className="text-gray-400" />
                  </div>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter your email address"
                    disabled={isSubmitting}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                  Password *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaLock className="text-gray-400" />
                  </div>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      errors.password ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Create a password (min 6 characters)"
                    disabled={isSubmitting}
                  />
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                )}
              </div>

              {/* Password Confirmation Field */}
              <div>
                <label htmlFor="password_confirmation" className="block text-sm font-semibold text-gray-700 mb-2">
                  Confirm Password *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaLock className="text-gray-400" />
                  </div>
                  <input
                    type="password"
                    id="password_confirmation"
                    name="password_confirmation"
                    value={formData.password_confirmation}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      errors.password_confirmation ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Confirm your password"
                    disabled={isSubmitting}
                  />
                </div>
                {errors.password_confirmation && (
                  <p className="mt-1 text-sm text-red-600">{errors.password_confirmation}</p>
                )}
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
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-green-600 to-blue-600 text-white py-3 rounded-xl font-semibold hover:from-green-700 hover:to-blue-700 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    <span>Registering...</span>
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>
          </div>
        )}

        {/* Registration Step */}
        {step === 'register' && (
          <div className="space-y-6">
            <button
              type="button"
              onClick={() => setStep('search')}
              className="text-blue-600 font-semibold hover:text-blue-700 hover:underline flex items-center gap-2 mb-4"
            >
              <FaArrowLeft />
              <span>Back to search</span>
            </button>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Donor Type Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Donor Type *
                </label>
                <select
                  name="donor_type"
                  value={formData.donor_type}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.donor_type ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={isSubmitting}
                >
                  <option value="Alumni">Alumni</option>
                  <option value="Individual">Individual (Supporter)</option>
                  <option value="Organization">Organization (Supporter)</option>
                  <option value="NGO">NGO (Supporter)</option>
                </select>
                {errors.donor_type && (
                  <p className="mt-1 text-sm text-red-600">{errors.donor_type}</p>
                )}
              </div>

              {/* Organization Name (for Organization/NGO) */}
              {(formData.donor_type === 'Organization' || formData.donor_type === 'NGO') && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Organization Name *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaBuilding className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      name="organization_name"
                      value={formData.organization_name}
                      onChange={handleChange}
                      className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                        errors.organization_name ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter organization name"
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.organization_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.organization_name}</p>
                  )}
                </div>
              )}

              {/* Alumni Specific Fields */}
              {formData.donor_type === 'Alumni' && (
                <>
                  {/* Registration Number */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Registration Number *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaIdCard className="text-gray-400" />
                      </div>
                      <input
                        type="text"
                        name="registration_number"
                        value={formData.registration_number}
                        onChange={handleChange}
                        className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                          errors.registration_number ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Enter your registration number"
                        disabled={isSubmitting}
                      />
                    </div>
                    {errors.registration_number && (
                      <p className="mt-1 text-sm text-red-600">{errors.registration_number}</p>
                    )}
                  </div>

                  {/* Entry Year and Graduation Year */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Entry Year *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FaGraduationCap className="text-gray-400" />
                        </div>
                        <select
                          name="entry_year"
                          value={formData.entry_year}
                          onChange={handleChange}
                          className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            errors.entry_year ? 'border-red-500' : 'border-gray-300'
                          }`}
                          disabled={isSubmitting || loadingFaculties}
                        >
                          <option value="">Select entry year</option>
                          {generateYearOptions().map(year => (
                            <option key={year} value={year}>{year}</option>
                          ))}
                        </select>
                      </div>
                      {errors.entry_year && (
                        <p className="mt-1 text-sm text-red-600">{errors.entry_year}</p>
                      )}
                      {loadingFaculties && formData.entry_year && (
                        <p className="mt-1 text-xs text-blue-600">Loading faculties...</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Graduation Year *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FaGraduationCap className="text-gray-400" />
                        </div>
                        <select
                          name="graduation_year"
                          value={formData.graduation_year}
                          onChange={handleChange}
                          className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            errors.graduation_year ? 'border-red-500' : 'border-gray-300'
                          }`}
                          disabled={isSubmitting}
                        >
                          <option value="">Select graduation year</option>
                          {generateYearOptions().map(year => (
                            <option key={year} value={year}>{year}</option>
                          ))}
                        </select>
                      </div>
                      {errors.graduation_year && (
                        <p className="mt-1 text-sm text-red-600">{errors.graduation_year}</p>
                      )}
                    </div>
                  </div>

                  {/* Faculty */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Faculty *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaGraduationCap className="text-gray-400" />
                      </div>
                      <select
                        name="faculty_id"
                        value={formData.faculty_id}
                        onChange={handleChange}
                        className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          errors.faculty_id ? 'border-red-500' : 'border-gray-300'
                        }`}
                        disabled={isSubmitting || loadingFaculties || !formData.entry_year}
                      >
                        <option value="">
                          {!formData.entry_year 
                            ? 'Please select entry year first' 
                            : loadingFaculties 
                            ? 'Loading faculties...' 
                            : availableFaculties.length === 0 
                            ? 'No faculties available for this entry year' 
                            : 'Select faculty'}
                        </option>
                        {availableFaculties.map(faculty => (
                          <option key={faculty.id} value={faculty.id}>
                            {faculty.name || faculty.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    {errors.faculty_id && (
                      <p className="mt-1 text-sm text-red-600">{errors.faculty_id}</p>
                    )}
                    {loadingFaculties && formData.entry_year && (
                      <p className="mt-1 text-xs text-blue-600">Loading faculties...</p>
                    )}
                  </div>

                  {/* Department */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Department *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaGraduationCap className="text-gray-400" />
                      </div>
                      <select
                        name="department_id"
                        value={formData.department_id}
                        onChange={handleChange}
                        className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          errors.department_id ? 'border-red-500' : 'border-gray-300'
                        }`}
                        disabled={isSubmitting || loadingDepartments || !formData.entry_year || !formData.faculty_id}
                      >
                        <option value="">
                          {!formData.entry_year 
                            ? 'Please select entry year first' 
                            : !formData.faculty_id 
                            ? 'Please select faculty first' 
                            : loadingDepartments 
                            ? 'Loading departments...' 
                            : availableDepartments.length === 0 
                            ? 'No departments available for this faculty and entry year' 
                            : 'Select department'}
                        </option>
                        {availableDepartments.map(department => (
                          <option key={department.id} value={department.id}>
                            {department.name || department.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    {errors.department_id && (
                      <p className="mt-1 text-sm text-red-600">{errors.department_id}</p>
                    )}
                    {loadingDepartments && formData.entry_year && formData.faculty_id && (
                      <p className="mt-1 text-xs text-blue-600">Loading departments...</p>
                    )}
                  </div>
                </>
              )}

              {/* Name Fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    First Name *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaUser className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                        errors.name ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="First name"
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Surname *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaUser className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      name="surname"
                      value={formData.surname}
                      onChange={handleChange}
                      className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                        errors.surname ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Surname"
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.surname && (
                    <p className="mt-1 text-sm text-red-600">{errors.surname}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Other Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaUser className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      name="other_name"
                      value={formData.other_name}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Other name (optional)"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaEnvelope className="text-gray-400" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter your email address"
                    disabled={isSubmitting}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone Number *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaPhone className="text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      errors.phone ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="+2348012345678"
                    disabled={isSubmitting}
                  />
                </div>
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Must be in international format (e.g., +2348012345678)
                </p>
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Address *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none top-3">
                    <FaMapMarkerAlt className="text-gray-400" />
                  </div>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    rows={3}
                    className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      errors.address ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter your address"
                    disabled={isSubmitting}
                  />
                </div>
                {errors.address && (
                  <p className="mt-1 text-sm text-red-600">{errors.address}</p>
                )}
              </div>

              {/* State and City */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    State *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaMapMarkerAlt className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                        errors.state ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter state"
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.state && (
                    <p className="mt-1 text-sm text-red-600">{errors.state}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    City *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaCity className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                        errors.city ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter city"
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.city && (
                    <p className="mt-1 text-sm text-red-600">{errors.city}</p>
                  )}
                </div>
              </div>

              {/* Email - Email will be used as username */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email * (will be used as your login)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaEnvelope className="text-gray-400" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter your email address"
                    disabled={isSubmitting}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Password *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaLock className="text-gray-400" />
                  </div>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      errors.password ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Create a password (min 6 characters)"
                    disabled={isSubmitting}
                  />
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                )}
              </div>

              {/* Password Confirmation */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Confirm Password *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaLock className="text-gray-400" />
                  </div>
                  <input
                    type="password"
                    name="password_confirmation"
                    value={formData.password_confirmation}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      errors.password_confirmation ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Confirm your password"
                    disabled={isSubmitting}
                  />
                </div>
                {errors.password_confirmation && (
                  <p className="mt-1 text-sm text-red-600">{errors.password_confirmation}</p>
                )}
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
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-green-600 to-blue-600 text-white py-3 rounded-xl font-semibold hover:from-green-700 hover:to-blue-700 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    <span>Registering...</span>
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>
          </div>
        )}

        {/* Login Link */}
        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-blue-600 font-semibold hover:text-blue-700 hover:underline"
            >
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
