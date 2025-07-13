// All backend URLs should use the environment variable REACT_APP_API_BASE_URL for the base URL.
// Hardcoded localhost URLs are only for local backend discovery/testing.
import React, { useState } from 'react';
import axios from 'axios';
import api from '../services/api';

const BackendTest = () => {
  const [testRegNumber, setTestRegNumber] = useState('123-32233');
  const [testResults, setTestResults] = useState([]);
  const [testing, setTesting] = useState(false);

  const addResult = (test, status, message, data = null) => {
    setTestResults(prev => [...prev, {
      test,
      status,
      message,
      data,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const testBackendConnection = async () => {
    setTesting(true);
    setTestResults([]);
    
    // Remove the possibleUrls array and backend discovery logic that uses hardcoded localhost URLs.
    // Use only process.env.REACT_APP_API_BASE_URL for backend URL.
    const baseUrl = process.env.REACT_APP_API_BASE_URL;

    if (!baseUrl) {
      addResult('Backend Status', 'Failed', 'REACT_APP_API_BASE_URL environment variable not set. Please set it in your .env file.');
      setTesting(false);
      return;
    }

    try {
      addResult('Backend Discovery', 'Testing', `Checking ${baseUrl}...`);
      const testApi = axios.create({ baseURL: baseUrl, timeout: 3000 });
      
      // Try common Laravel endpoints that likely exist
      const response = await testApi.get('/api/projects');
      addResult('Backend Discovery', 'Success', `Backend found at ${baseUrl}`, response.data);
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        // Server is running but needs auth - this is good!
        addResult('Backend Discovery', 'Success', `Backend found at ${baseUrl} (requires auth)`, { status: error.response.status });
      } else {
        addResult('Backend Discovery', 'Failed', `${baseUrl}: ${error.message}`);
      }
    }

    try {
      // Test 1: Basic API connection (using projects endpoint)
      addResult('API Connection', 'Testing', 'Checking if backend is reachable...');
      const response = await api.get('/api/projects');
      addResult('API Connection', 'Success', 'Backend is reachable', response.data);
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        addResult('API Connection', 'Success', 'Backend is reachable (requires authentication)', { status: error.response.status });
      } else {
        addResult('API Connection', 'Failed', `Error: ${error.message}`, error.response?.data);
      }
    }

    try {
      // Test 2: Alumni search endpoint
      addResult('Alumni Search', 'Testing', `Searching for reg number: ${testRegNumber}`);
      const response = await api.get(`/api/donors/search/${testRegNumber}`);
      addResult('Alumni Search', 'Success', 'Search completed', response.data);
    } catch (error) {
      addResult('Alumni Search', 'Failed', `Error: ${error.message}`, error.response?.data);
    }

    try {
      // Test 3: Check if donors search endpoint exists
      addResult('Donors Search Endpoint', 'Testing', 'Checking if donors search endpoint exists...');
      const response = await api.get('/api/donors/search/test');
      addResult('Donors Search Endpoint', 'Success', 'Donors search endpoint is available', response.data);
    } catch (error) {
      if (error.response?.status === 404) {
        addResult('Donors Search Endpoint', 'Failed', 'Donors search endpoint not found (404)', error.response?.data);
      } else if (error.response?.status === 401 || error.response?.status === 403) {
        addResult('Donors Search Endpoint', 'Success', 'Donors search endpoint exists (requires auth)', { status: error.response.status });
      } else {
        addResult('Donors Search Endpoint', 'Failed', `Error: ${error.message}`, error.response?.data);
      }
    }

    setTesting(false);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">🔧 Backend Connection Test</h2>
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Test Registration Number:
        </label>
        <input
          type="text"
          value={testRegNumber}
          onChange={(e) => setTestRegNumber(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter registration number to test"
        />
      </div>

      <div className="flex gap-4 mb-6">
        <button
          onClick={testBackendConnection}
          disabled={testing}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {testing ? 'Testing...' : 'Run Tests'}
        </button>
        <button
          onClick={clearResults}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
        >
          Clear Results
        </button>
      </div>

      {testResults.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Test Results:</h3>
          {testResults.map((result, index) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  result.status === 'Success' ? 'bg-green-100 text-green-800' :
                  result.status === 'Failed' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {result.status}
                </span>
                <span className="font-medium text-gray-800">{result.test}</span>
                <span className="text-xs text-gray-500">{result.timestamp}</span>
              </div>
              <p className="text-sm text-gray-600 mb-2">{result.message}</p>
              {result.data && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                    View Response Data
                  </summary>
                  <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h4 className="font-medium text-yellow-800 mb-2">💡 Troubleshooting Tips:</h4>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• If API Connection fails: Check if backend server is running</li>
          <li>• If Alumni Search fails: Check if test data exists in database</li>
          <li>• If Donors Table is empty: Add test alumni records to database</li>
          <li>• Check browser console for detailed error messages</li>
        </ul>
      </div>
    </div>
  );
};

export default BackendTest; 