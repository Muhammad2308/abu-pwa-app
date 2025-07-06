import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FaCreditCard } from 'react-icons/fa';
import toast from 'react-hot-toast';
import api, { paymentsAPI, getCsrfCookie } from '../services/api';

const Donations = () => {
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated, loading } = useAuth();
  const projectFromQuery = searchParams.get('project') || '';
  
  const [donationData, setDonationData] = useState({
    amount: '',
    project_id: projectFromQuery,
    name: '',
    email: '',
    phone: ''
  });
  const [availableProjects, setAvailableProjects] = useState([]);
  const [processingPayment, setProcessingPayment] = useState(false);

  // Load projects on component mount
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await api.get('/api/projects');
      setAvailableProjects(response.data.data || response.data);
    } catch (error) {
      console.error('Error loading projects:', error);
      // Set default projects if API fails
      setAvailableProjects([
        { id: 1, name: 'General Donation' },
        { id: 2, name: 'Student Scholarship' },
        { id: 3, name: 'Infrastructure Development' }
      ]);
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
        metadata: {
          name: donationData.name,
          phone: donationData.phone,
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Make a Donation</h1>
            <p className="text-gray-600">Thank you for supporting ABU Endowment</p>
          </div>

          <form onSubmit={handlePaymentSubmit} className="space-y-6">
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
              className="w-full py-3 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <FaCreditCard className="w-5 h-5" />
              {processingPayment ? 'Processing...' : 'Proceed to Payment'}
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