import React, { useState } from 'react';
import { FaCheckCircle, FaTimesCircle, FaSpinner } from 'react-icons/fa';
import api, { donorSessionsAPI, donorsAPI } from '../services/api';
import toast from 'react-hot-toast';

const RegistrationTest = () => {
    const [testResults, setTestResults] = useState([]);
    const [isRunning, setIsRunning] = useState(false);

    const addResult = (test, status, message, data = null) => {
        setTestResults(prev => [...prev, { test, status, message, data, timestamp: new Date().toISOString() }]);
    };

    const runTests = async () => {
        setIsRunning(true);
        setTestResults([]);

        // Test 1: Check API connectivity
        try {
            await api.get('/sanctum/csrf-cookie');
            addResult('API Connectivity', 'success', 'Successfully connected to backend');
        } catch (error) {
            addResult('API Connectivity', 'error', `Failed to connect: ${error.message}`);
            setIsRunning(false);
            return;
        }

        // Test 2: Test donor creation endpoint
        const testEmail = `test_${Date.now()}@example.com`;
        const testDonorData = {
            donor_type: 'Individual',
            name: 'Test',
            surname: 'User',
            email: testEmail,
            phone: '+2348012345678',
            address: '123 Test Street',
            state: 'Kaduna',
            city: 'Zaria'
        };

        try {
            const donorResponse = await donorsAPI.create(testDonorData);
            const donorId = donorResponse.data?.data?.id || donorResponse.data?.id;

            if (donorId) {
                addResult('Donor Creation', 'success', `Donor created with ID: ${donorId}`, donorResponse.data);
            } else {
                addResult('Donor Creation', 'warning', 'Donor created but no ID returned', donorResponse.data);
            }
        } catch (error) {
            addResult('Donor Creation', 'error', `Failed: ${error.response?.data?.message || error.message}`, error.response?.data);
        }

        // Test 3: Test session registration
        const testSessionEmail = `session_${Date.now()}@example.com`;
        try {
            const sessionResponse = await donorSessionsAPI.register({
                username: testSessionEmail,
                password: 'Test123456',
                donor_id: null
            });

            if (sessionResponse.data?.success) {
                const sessionId = sessionResponse.data?.data?.session_id || sessionResponse.data?.data?.id;
                addResult('Session Registration', 'success', `Session created with ID: ${sessionId}`, sessionResponse.data);

                // Test 3b: Create donor for this session
                const sessionDonorData = {
                    donor_type: 'Individual',
                    name: 'Session',
                    surname: 'Test',
                    email: testSessionEmail,
                    phone: '+2348087654321'
                };

                try {
                    const sessionDonorResponse = await donorsAPI.create(sessionDonorData);
                    const sessionDonorId = sessionDonorResponse.data?.data?.id || sessionDonorResponse.data?.id;

                    if (sessionDonorId) {
                        addResult('Session Donor Creation', 'success', `Donor created for session: ${sessionDonorId}`, sessionDonorResponse.data);

                        // Test 3c: Link donor to session
                        try {
                            await api.put(`/api/donor-sessions/${sessionId}`, { donor_id: sessionDonorId });
                            addResult('Session-Donor Linking', 'success', `Linked donor ${sessionDonorId} to session ${sessionId}`);
                        } catch (linkError) {
                            addResult('Session-Donor Linking', 'error', `Failed to link: ${linkError.response?.data?.message || linkError.message}`);
                        }
                    } else {
                        addResult('Session Donor Creation', 'warning', 'Donor created but no ID returned');
                    }
                } catch (donorError) {
                    addResult('Session Donor Creation', 'error', `Failed: ${donorError.response?.data?.message || donorError.message}`);
                }
            } else {
                addResult('Session Registration', 'error', 'Session creation failed', sessionResponse.data);
            }
        } catch (error) {
            addResult('Session Registration', 'error', `Failed: ${error.response?.data?.message || error.message}`, error.response?.data);
        }

        // Test 4: Check donors table structure
        try {
            const donorsResponse = await api.get('/api/donors');
            const donors = donorsResponse.data?.data || donorsResponse.data || [];
            addResult('Donors Table Check', 'success', `Found ${donors.length} donors in database`, { count: donors.length });
        } catch (error) {
            addResult('Donors Table Check', 'error', `Failed to fetch donors: ${error.response?.data?.message || error.message}`);
        }

        setIsRunning(false);
        toast.success('Registration tests completed!');
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'success':
                return <FaCheckCircle className="text-green-500" />;
            case 'error':
                return <FaTimesCircle className="text-red-500" />;
            case 'warning':
                return <FaTimesCircle className="text-yellow-500" />;
            default:
                return <FaSpinner className="text-gray-500 animate-spin" />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-2xl shadow-lg p-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Registration System Test</h1>
                    <p className="text-gray-600 mb-6">Test the donor registration flow and backend connectivity</p>

                    <button
                        onClick={runTests}
                        disabled={isRunning}
                        className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mb-8"
                    >
                        {isRunning ? (
                            <>
                                <FaSpinner className="animate-spin" />
                                Running Tests...
                            </>
                        ) : (
                            'Run Tests'
                        )}
                    </button>

                    {testResults.length > 0 && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Test Results</h2>
                            {testResults.map((result, index) => (
                                <div
                                    key={index}
                                    className={`p-4 rounded-xl border-2 ${result.status === 'success'
                                            ? 'bg-green-50 border-green-200'
                                            : result.status === 'error'
                                                ? 'bg-red-50 border-red-200'
                                                : 'bg-yellow-50 border-yellow-200'
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1">{getStatusIcon(result.status)}</div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-gray-900 mb-1">{result.test}</h3>
                                            <p className="text-sm text-gray-700 mb-2">{result.message}</p>
                                            {result.data && (
                                                <details className="text-xs">
                                                    <summary className="cursor-pointer text-gray-500 hover:text-gray-700 font-medium">
                                                        View Details
                                                    </summary>
                                                    <pre className="mt-2 p-3 bg-gray-900 text-green-400 rounded-lg overflow-x-auto">
                                                        {JSON.stringify(result.data, null, 2)}
                                                    </pre>
                                                </details>
                                            )}
                                            <p className="text-xs text-gray-400 mt-2">
                                                {new Date(result.timestamp).toLocaleTimeString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {testResults.length === 0 && !isRunning && (
                        <div className="text-center py-12 text-gray-400">
                            <p>Click "Run Tests" to start testing the registration system</p>
                        </div>
                    )}
                </div>

                <div className="mt-8 bg-blue-50 border-2 border-blue-200 rounded-2xl p-6">
                    <h3 className="font-bold text-blue-900 mb-2">What This Tests:</h3>
                    <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
                        <li>Backend API connectivity</li>
                        <li>Donor creation endpoint (POST /api/donors)</li>
                        <li>Session registration endpoint (POST /api/donor-sessions/register)</li>
                        <li>Donor-to-session linking (PUT /api/donor-sessions/:id)</li>
                        <li>Donors table accessibility (GET /api/donors)</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default RegistrationTest;
