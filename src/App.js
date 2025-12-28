import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import './index.css';

export const GOOGLE_CLIENT_ID = '470253699627-a50centdev8a3ahhq0e01oiakatu3qh4.apps.googleusercontent.com';

const Home = lazy(() => import('./pages/Home'));
const Projects = lazy(() => import('./pages/Projects'));
const Contacts = lazy(() => import('./pages/Contacts'));
const Profile = lazy(() => import('./pages/Profile'));
const Donations = lazy(() => import('./pages/Donations'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const AddressableAlumni = lazy(() => import('./pages/register/AddressableAlumni'));
const NonAddressableAlumni = lazy(() => import('./pages/register/NonAddressableAlumni'));
const Friends = lazy(() => import('./pages/register/Friends'));
const RegistrationTest = lazy(() => import('./components/RegistrationTest'));


function App() {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={<div className="flex justify-center items-center h-screen"><div className="loading-spinner"></div></div>}>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/register/addressable_alumni" element={<AddressableAlumni />} />
            <Route path="/register/non_addressable_alumni" element={<NonAddressableAlumni />} />
            <Route path="/register/friends" element={<Friends />} />

            {/* Home route - accessible without auth */}
            <Route
              path="/"
              element={
                <ProtectedRoute requireAuth={false}>
                  <Layout><Home /></Layout>
                </ProtectedRoute>
              }
            />
            {/* Protected routes */}
            <Route
              path="/projects"
              element={
                <ProtectedRoute>
                  <Layout><Projects /></Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/contacts"
              element={
                <ProtectedRoute>
                  <Layout><Contacts /></Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Layout><Profile /></Layout>
                </ProtectedRoute>
              }
            />
            {/* Donations page - accessible without auth for new user registration */}
            <Route
              path="/donations"
              element={
                <Layout><Donations /></Layout>
              }
            />
            {/* Registration Test - Development only */}
            <Route
              path="/test-registration"
              element={<RegistrationTest />}
            />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}

export default App;
