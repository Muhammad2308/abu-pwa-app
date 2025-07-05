import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { FaGraduationCap, FaUsers, FaSearch, FaEdit, FaCheck } from 'react-icons/fa';
import { MdEmail, MdPhone } from 'react-icons/md';
import toast from 'react-hot-toast';
import api from '../services/api';
import VerificationModal from '../components/VerificationModal';

const Donations = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading, verificationStep, sendVerification, verifyAndCreateSession } = useAuth();
  const projectFromQuery = searchParams.get('project') || '';
  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm();
  const [showPayment, setShowPayment] = useState(false);
  const [paymentData, setPaymentData] = useState({ amount: '', project: '' });
  const [showDonorTypeSelection, setShowDonorTypeSelection] = useState(false);
  const [selectedDonorType, setSelectedDonorType] = useState('');
  const [alumniStep, setAlumniStep] = useState('select'); // select | verify | update | confirm | verification
  const [regNumber, setRegNumber] = useState('');
  const [alumniData, setAlumniData] = useState(null);
  const [alumniSearching, setAlumniSearching] = useState(false);
  const [nonAlumniForm, setNonAlumniForm] = useState({ email: '', phone: '', country: '', state: '', city: '' });
  const [nonAlumniErrors, setNonAlumniErrors] = useState({});
  const [showAltVerify, setShowAltVerify] = useState(false);
  const [altVerify, setAltVerify] = useState({ phone: '', email: '' });
  const [alumniUpdateForm, setAlumniUpdateForm] = useState(null);
  const [alumniUpdateErrors, setAlumniUpdateErrors] = useState({});
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [pendingDonorData, setPendingDonorData] = useState(null);

  const donorTypes = [
    {
      id: 'alumni',
      title: 'Alumni',
      description: 'I am an ABU graduate',
      icon: FaGraduationCap,
      color: 'blue'
    },
    {
      id: 'non_alumni',
      title: 'Non-Alumni',
      description: 'I am a friend/supporter of ABU',
      icon: FaUsers,
      color: 'purple'
    }
  ];

  useEffect(() => {
    if (projectFromQuery) {
      setValue('project', projectFromQuery);
    }
  }, [projectFromQuery, setValue]);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      setShowDonorTypeSelection(true);
    }
  }, [isAuthenticated, loading]);

  const handleDonorTypeSelect = (typeId) => {
    setSelectedDonorType(typeId);
    if (typeId === 'alumni') {
      setAlumniStep('verify');
    } else if (typeId === 'non_alumni') {
      setAlumniStep('non_alumni_form');
    }
  };

  // Alumni verification
  const handleAlumniSearch = async () => {
    if (!regNumber.trim() && (!altVerify.phone.trim() && !altVerify.email.trim())) {
      toast.error('Please enter your registration number or use an alternative method');
      return;
    }
    setAlumniSearching(true);
    try {
      let url = '';
      if (regNumber.trim()) {
        url = `/api/donors/search/${encodeURIComponent(regNumber)}`;
      } else if (altVerify.phone.trim()) {
        url = `/api/donors/search/phone/${encodeURIComponent(altVerify.phone)}`;
      } else if (altVerify.email.trim()) {
        url = `/api/donors/search/email/${encodeURIComponent(altVerify.email)}`;
      }
      const response = await api.get(url);
      setAlumniData(response.data);
      
      // Pre-populate the update form with alumni data
      setAlumniUpdateForm({
        name: response.data.full_name || response.data.name || '',
        email: response.data.email || '',
        phone: response.data.phone || '',
        faculty: response.data.faculty_name || response.data.faculty?.name || '',
        department: response.data.department_name || response.data.department?.name || '',
        graduation_year: response.data.graduation_year || '',
        registration_number: regNumber || response.data.registration_number || ''
      });
      
      toast.success('Alumni record found! Please update your information.');
      setAlumniStep('update');
    } catch (error) {
      setAlumniData(null);
      toast.error('Alumni record not found. Please register as an alumni.');
      setAlumniStep('register');
    } finally {
      setAlumniSearching(false);
    }
  };

  // Alumni update form validation
  const validateAlumniUpdateForm = () => {
    const errs = {};
    if (!alumniUpdateForm.name) errs.name = 'Name is required';
    if (!alumniUpdateForm.email) errs.email = 'Email is required';
    if (!alumniUpdateForm.phone) errs.phone = 'Phone is required';
    if (!alumniUpdateForm.faculty) errs.faculty = 'Faculty is required';
    if (!alumniUpdateForm.department) errs.department = 'Department is required';
    if (!alumniUpdateForm.graduation_year) errs.graduation_year = 'Graduation year is required';
    setAlumniUpdateErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAlumniUpdateSubmit = async (e) => {
    e.preventDefault();
    if (validateAlumniUpdateForm()) {
      // Prepare donor data for registration
      const donorData = {
        ...alumniUpdateForm,
        donor_type: 'alumni',
        alumni_data: alumniData
      };
      
      setPendingDonorData(donorData);
      setShowVerificationModal(true);
    }
  };

  // Handle verification success
  const handleVerificationSuccess = () => {
    setShowDonorTypeSelection(false);
    setShowVerificationModal(false);
    setPendingDonorData(null);
    toast.success('Registration successful! You can now proceed to donate.');
  };

  // Non-Alumni form validation
  const validateNonAlumniForm = () => {
    const errs = {};
    if (!nonAlumniForm.email) errs.email = 'Email is required';
    if (!nonAlumniForm.phone) errs.phone = 'Phone is required';
    if (!nonAlumniForm.country) errs.country = 'Country is required';
    if (!nonAlumniForm.state) errs.state = 'State is required';
    if (!nonAlumniForm.city) errs.city = 'City is required';
    setNonAlumniErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNonAlumniSubmit = async (e) => {
    e.preventDefault();
    if (validateNonAlumniForm()) {
      const donorData = {
        ...nonAlumniForm,
        donor_type: 'non_alumni'
      };
      
      setPendingDonorData(donorData);
      setShowVerificationModal(true);
    }
  };

  // Do NOT make a real API call, just open the payment modal
  const onSubmit = (data) => {
    setPaymentData({ amount: data.amount, project: data.project });
    setShowPayment(true);
  };

  const handlePayment = () => {
    setShowPayment(false);
    toast.success('Payment successful! Thank you for your support.');
    reset();
  };

  // Show loading while checking authentication
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

  // Show donor type selection for non-registered users
  if (showDonorTypeSelection) {
    // Alumni flow
    if (selectedDonorType === 'alumni') {
      if (alumniStep === 'verify') {
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-transparent rounded-xl p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
                  <FaGraduationCap className="w-8 h-8 text-blue-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Alumni Verification</h1>
                <p className="text-gray-600">Enter your registration number to verify your alumni status</p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Registration Number
                  </label>
                  <input
                    type="text"
                    value={regNumber}
                    onChange={e => setRegNumber(e.target.value)}
                    placeholder="Registration Number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    className="mt-2 text-blue-600 hover:underline text-xs"
                    onClick={() => setShowAltVerify(v => !v)}
                  >
                    {showAltVerify ? 'Hide alternative options' : 'Verify with phone or email instead'}
                  </button>
                  {showAltVerify && (
                    <div className="mt-2 space-y-2">
                      <input
                        type="text"
                        value={altVerify.phone}
                        onChange={e => setAltVerify({ ...altVerify, phone: e.target.value })}
                        placeholder="Phone Number"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <input
                        type="email"
                        value={altVerify.email}
                        onChange={e => setAltVerify({ ...altVerify, email: e.target.value })}
                        placeholder="Email Address"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  )}
                </div>
                
                <button
                  onClick={handleAlumniSearch}
                  disabled={alumniSearching}
                  className="w-full py-2 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all duration-200"
                >
                  {alumniSearching ? 'Searching...' : 'Verify'}
                </button>
                <div className="text-center mt-4">
                  <button onClick={() => setShowDonorTypeSelection(false)} className="text-blue-600 hover:text-blue-700 font-medium">← Back</button>
                </div>
              </div>
            </div>
          </div>
        );
      }
      
      if (alumniStep === 'update' && alumniUpdateForm) {
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
                  <FaGraduationCap className="w-8 h-8 text-blue-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Update Your Profile</h1>
                <p className="text-gray-600">Please confirm or update your information</p>
              </div>
              
              <form onSubmit={handleAlumniUpdateSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={alumniUpdateForm.name || ''}
                    onChange={e => setAlumniUpdateForm({ ...alumniUpdateForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {alumniUpdateErrors.name && <p className="text-red-500 text-xs mt-1">{alumniUpdateErrors.name}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={alumniUpdateForm.email || ''}
                    onChange={e => setAlumniUpdateForm({ ...alumniUpdateForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {alumniUpdateErrors.email && <p className="text-red-500 text-xs mt-1">{alumniUpdateErrors.email}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={alumniUpdateForm.phone || ''}
                    onChange={e => setAlumniUpdateForm({ ...alumniUpdateForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {alumniUpdateErrors.phone && <p className="text-red-500 text-xs mt-1">{alumniUpdateErrors.phone}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Faculty</label>
                  <input
                    type="text"
                    value={alumniUpdateForm.faculty || ''}
                    onChange={e => setAlumniUpdateForm({ ...alumniUpdateForm, faculty: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {alumniUpdateErrors.faculty && <p className="text-red-500 text-xs mt-1">{alumniUpdateErrors.faculty}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={alumniUpdateForm.department || ''}
                    onChange={e => setAlumniUpdateForm({ ...alumniUpdateForm, department: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {alumniUpdateErrors.department && <p className="text-red-500 text-xs mt-1">{alumniUpdateErrors.department}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Graduation Year</label>
                  <input
                    type="number"
                    value={alumniUpdateForm.graduation_year || ''}
                    onChange={e => setAlumniUpdateForm({ ...alumniUpdateForm, graduation_year: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {alumniUpdateErrors.graduation_year && <p className="text-red-500 text-xs mt-1">{alumniUpdateErrors.graduation_year}</p>}
                </div>
                
                <button
                  type="submit"
                  className="w-full py-2 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all duration-200"
                >
                  Confirm & Register
                </button>
              </form>
              
              <div className="text-center mt-4">
                <button onClick={() => setAlumniStep('verify')} className="text-blue-600 hover:text-blue-700 font-medium">← Back</button>
              </div>
            </div>
          </div>
        );
      }
      
      if (alumniStep === 'register') {
        // Show alumni registration form (reuse NonAddressableAlumni fields)
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
                  <FaGraduationCap className="w-8 h-8 text-blue-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Alumni Registration</h1>
                <p className="text-gray-600">We couldn't find your record. Please register as an alumni.</p>
              </div>
              {/* Registration form fields */}
              {/* ... You can add the alumni registration form here ... */}
              <div className="text-center mt-4">
                <button onClick={() => setAlumniStep('verify')} className="text-blue-600 hover:text-blue-700 font-medium">← Back</button>
              </div>
            </div>
          </div>
        );
      }
    }
    
    // Non-Alumni flow
    if (selectedDonorType === 'non_alumni' && alumniStep === 'non_alumni_form') {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-100 flex items-center justify-center">
                <FaUsers className="w-8 h-8 text-purple-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Non-Alumni Information</h1>
              <p className="text-gray-600">Please provide your information to proceed</p>
            </div>
            <form onSubmit={handleNonAlumniSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={nonAlumniForm.email}
                  onChange={e => setNonAlumniForm({ ...nonAlumniForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter your email"
                />
                {nonAlumniErrors.email && <p className="text-red-500 text-xs mt-1">{nonAlumniErrors.email}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={nonAlumniForm.phone}
                  onChange={e => setNonAlumniForm({ ...nonAlumniForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter your phone number"
                />
                {nonAlumniErrors.phone && <p className="text-red-500 text-xs mt-1">{nonAlumniErrors.phone}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <input
                  type="text"
                  value={nonAlumniForm.country}
                  onChange={e => setNonAlumniForm({ ...nonAlumniForm, country: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter your country"
                />
                {nonAlumniErrors.country && <p className="text-red-500 text-xs mt-1">{nonAlumniErrors.country}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <input
                  type="text"
                  value={nonAlumniForm.state}
                  onChange={e => setNonAlumniForm({ ...nonAlumniForm, state: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter your state"
                />
                {nonAlumniErrors.state && <p className="text-red-500 text-xs mt-1">{nonAlumniErrors.state}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  value={nonAlumniForm.city}
                  onChange={e => setNonAlumniForm({ ...nonAlumniForm, city: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter your city"
                />
                {nonAlumniErrors.city && <p className="text-red-500 text-xs mt-1">{nonAlumniErrors.city}</p>}
              </div>
              
              <button
                type="submit"
                className="w-full py-2 rounded-lg font-semibold text-white bg-purple-600 hover:bg-purple-700 transition-all duration-200"
              >
                Proceed to Register
              </button>
            </form>
            <div className="text-center mt-4">
              <button onClick={() => setShowDonorTypeSelection(false)} className="text-purple-600 hover:text-purple-700 font-medium">← Back</button>
            </div>
          </div>
        </div>
      );
    }

    // Donor type selection
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Choose Your Donor Type</h1>
            <p className="text-gray-600">Select the category that best describes you</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {donorTypes.map((type) => (
              <div
                key={type.id}
                onClick={() => handleDonorTypeSelect(type.id)}
                className={`bg-white rounded-xl shadow-lg p-6 cursor-pointer transition-all duration-200 hover:shadow-xl hover:scale-105 border-2 ${
                  selectedDonorType === type.id ? 'border-blue-500' : 'border-transparent'
                }`}
              >
                <div className={`w-16 h-16 mx-auto mb-4 rounded-full bg-${type.color}-100 flex items-center justify-center`}>
                  <type.icon className={`w-8 h-8 text-${type.color}-600`} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{type.title}</h3>
                <p className="text-gray-600">{type.description}</p>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-8">
            <button
              onClick={() => setShowDonorTypeSelection(false)}
              className="text-gray-600 hover:text-gray-700 font-medium"
            >
              ← Back to Donations
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main donation form for authenticated users
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Make a Donation</h1>
            <p className="text-gray-600">Support our projects and make a difference</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Donation Amount (₦)
              </label>
              <input
                type="number"
                {...register('amount', { 
                  required: 'Amount is required',
                  min: { value: 100, message: 'Minimum donation is ₦100' }
                })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter amount"
              />
              {errors.amount && (
                <p className="text-red-500 text-sm mt-1">{errors.amount.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Project (Optional)
              </label>
              <select
                {...register('project')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">General Donation</option>
                <option value="scholarship">Scholarship Fund</option>
                <option value="infrastructure">Infrastructure Development</option>
                <option value="research">Research & Innovation</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 transition-all duration-200"
            >
              {isSubmitting ? 'Processing...' : 'Proceed to Payment'}
            </button>
          </form>
        </div>
      </div>

      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Details</h2>
              <p className="text-gray-600">Amount: {paymentData.amount}</p>
              {paymentData.project && <p className="text-gray-600">Project: {paymentData.project}</p>}
            </div>
            <button
              onClick={handlePayment}
              className="w-full py-3 rounded-lg font-semibold text-white bg-green-600 hover:bg-green-700 transition-all duration-200"
            >
              Complete Payment
            </button>
            <button
              onClick={() => setShowPayment(false)}
              className="w-full mt-3 py-2 rounded-lg font-medium text-gray-600 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Verification Modal */}
      <VerificationModal
        isOpen={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        onSuccess={handleVerificationSuccess}
        donorData={pendingDonorData}
      />
    </div>
  );
};

export default Donations; 