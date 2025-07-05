import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import './index.css';

const Home = lazy(() => import('./pages/Home'));
const Projects = lazy(() => import('./pages/Projects'));
const Contacts = lazy(() => import('./pages/Contacts'));
const Profile = lazy(() => import('./pages/Profile'));
const Donations = lazy(() => import('./pages/Donations'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const AddressableAlumni = lazy(() => import('./pages/register/AddressableAlumni'));
const NonAddressableAlumni = lazy(() => import('./pages/register/NonAddressableAlumni'));
const Friends = lazy(() => import('./pages/register/Friends'));

function App() {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={<div className="flex justify-center items-center h-screen"><div className="loading-spinner"></div></div>}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/register/addressable_alumni" element={<AddressableAlumni />} />
            <Route path="/register/non_addressable_alumni" element={<NonAddressableAlumni />} />
            <Route path="/register/friends" element={<Friends />} />
            <Route path="/" element={<Layout><Home /></Layout>} />
            <Route path="/projects" element={<Layout><Projects /></Layout>} />
            <Route path="/contacts" element={<Layout><Contacts /></Layout>} />
            <Route path="/profile" element={<Layout><Profile /></Layout>} />
            <Route path="/donations" element={<Layout><Donations /></Layout>} />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}

export default App;
