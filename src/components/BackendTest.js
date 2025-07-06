import React, { useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const BackendTest = () => {
  const [testResults, setTestResults] = useState({});
  const [loading, setLoading] = useState(false);

  const runTest = async (testName, testFunction) => {
    setLoading(true);
    try {
      const result = await testFunction();
      setTestResults(prev => ({
        ...prev,
        [testName]: { success: true, data: result }
      }));
      toast.success(`${testName} passed!`);
    } catch (error) {
      console.error(`${testName} failed:`, error);
      setTestResults(prev => ({
        ...prev,
        [testName]: { 
          success: false, 
          error: error.response?.data?.message || error.message 
        }
      }));
      toast.error(`${testName} failed: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const tests = {
    'Backend Connectivity': async () => {
      const response = await api.get('/api/health');
      return response.data;
    },

    'Alumni Search by Reg Number': async () => {
      const response = await api.get('/api/donors/search/123456789');
      return response.data;
    },

    'Alumni Search by Phone': async () => {
      const response = await api.get('/api/donors/search/phone/+2348012345678');
      return response.data;
    },

    'Alumni Search by Email': async () => {
      const response = await api.get('/api/donors/search/email/test@example.com');
      return response.data;
    },

    'Create Non-Alumni Donor': async () => {
      const donorData = {
        name: 'Test',
        surname: 'User',
        other_name: 'John',
        gender: 'male',
        country: 'Nigeria',
        state: 'Lagos',
        city: 'Victoria Island',
        address: '123 Test St',
        email: 'test.user@example.com',
        phone: '+2348012345678',
        donor_type: 'non_addressable_alumni'
      };
      const response = await api.post('/api/donors', donorData);
      return response.data;
    },

    'Send Email Verification': async () => {
      const response = await api.post('/api/verification/send-email', {
        email: 'test@example.com',
        donor_id: 1
      });
      return response.data;
    },

    'Verify Email Code': async () => {
      const response = await api.post('/api/verification/verify-email', {
        email: 'test@example.com',
        code: '123456'
      });
      return response.data;
    },

    'Device Session Login': async () => {
      const response = await api.post('/api/session/login-with-donor', {
        email_or_phone: 'test@example.com'
      });
      return response.data;
    },

    'Check Session': async () => {
      const response = await api.get('/api/session/check');
      return response.data;
    },

    'Load Faculties': async () => {
      const response = await api.get('/api/faculty-vision?entry_year=1999&graduation_year=2004');
      return response.data;
    },

    'Load Departments': async () => {
      const response = await api.get('/api/department-vision?faculty_id=1&entry_year=1999&graduation_year=2004');
      return response.data;
    },

    'Load Projects': async () => {
      const response = await api.get('/api/projects');
      return response.data;
    },

    'Initialize Payment': async () => {
      const response = await api.post('/api/payments/initialize', {
        email: 'test@example.com',
        amount: 100000, // ₦1000 in kobo
        metadata: {
          donor_id: 1,
          frequency: 'onetime',
          endowment: 'no',
          project_id: null
        }
      });
      return response.data;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Backend Integration Test
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(tests).map(([testName, testFunction]) => (
              <div key={testName} className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">{testName}</h3>
                
                <button
                  onClick={() => runTest(testName, testFunction)}
                  disabled={loading}
                  className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors text-sm"
                >
                  {loading ? 'Testing...' : 'Run Test'}
                </button>

                {testResults[testName] && (
                  <div className="mt-3 p-3 rounded-lg text-sm">
                    {testResults[testName].success ? (
                      <div className="bg-green-50 text-green-800">
                        <div className="font-semibold">✅ Success</div>
                        <pre className="mt-1 text-xs overflow-auto">
                          {JSON.stringify(testResults[testName].data, null, 2)}
                        </pre>
                      </div>
                    ) : (
                      <div className="bg-red-50 text-red-800">
                        <div className="font-semibold">❌ Failed</div>
                        <div className="mt-1">{testResults[testName].error}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Test Instructions:</h3>
            <ul className="text-blue-800 text-sm space-y-1">
              <li>• Click "Run Test" to test each backend endpoint</li>
              <li>• Green results indicate successful API calls</li>
              <li>• Red results show errors that need fixing</li>
              <li>• Check browser console for detailed error logs</li>
              <li>• Some tests may fail if backend is not running or data doesn't exist</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BackendTest; 