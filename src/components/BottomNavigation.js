import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  HomeIcon,
  FolderIcon,
  UserGroupIcon,
  UserIcon,
  CurrencyDollarIcon,
  XMarkIcon,
  PencilSquareIcon,
  Cog6ToothIcon,
  ArrowLeftOnRectangleIcon,
} from '@heroicons/react/24/outline';
import abuLogo from '../assets/abu_logo.png';
import { getBaseUrl } from '../services/api';

const Sidebar = ({ isOpen, onClose, onEditProfile, onSettings, user, isAuthenticated, logout }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    {
      path: '/',
      name: 'Home',
      icon: HomeIcon,
    },
    {
      path: '/projects',
      name: 'Projects',
      icon: FolderIcon,
    },
    {
      path: '/donations',
      name: 'Donations',
      icon: CurrencyDollarIcon,
    },
    {
      path: '/contacts',
      name: 'Contacts',
      icon: UserGroupIcon,
    },
    {
      path: '/profile',
      name: 'Profile',
      icon: UserIcon,
    },
  ];

  const handleLinkClick = (path) => {
    navigate(path);
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-[280px] bg-white shadow-2xl z-[70] transform transition-transform duration-300 ease-out flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        {/* Green Header Section */}
        <div className="bg-abu-green p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>

          {/* App Logo & Title */}
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-white p-1.5 rounded-xl shadow-sm">
              <img src={abuLogo} alt="ABU Logo" className="h-8 w-auto" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white leading-tight">ABU Endowment</span>
              <span className="text-[10px] font-medium text-white/80 leading-none">& Crowd Funding</span>
            </div>
          </div>

          {/* User Profile Card */}
          {isAuthenticated && user ? (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center border border-white/20 overflow-hidden">
                {user.profile_image ? (
                  <img
                    src={user.profile_image.startsWith('http') ? user.profile_image : `${getBaseUrl()}storage/${user.profile_image}`}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserIcon className="w-5 h-5 text-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">
                  {[user.name, user.surname].filter(Boolean).join(' ') || 'User'}
                </p>
                <p className="text-[10px] text-white/70 truncate">{user.email}</p>
              </div>
            </div>
          ) : (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
              <p className="text-sm font-bold text-white">Welcome, Guest</p>
              <button
                onClick={() => handleLinkClick('/login')}
                className="text-[10px] text-white/70 hover:text-white underline"
              >
                Login to your account
              </button>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto py-6 px-4">
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <button
                  key={item.path}
                  onClick={() => handleLinkClick(item.path)}
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-200 ${isActive
                      ? 'bg-abu-green-light text-abu-green font-bold'
                      : 'text-gray-600 hover:bg-gray-50'
                    }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? 'text-abu-green' : 'text-gray-400'}`} />
                  <span className="text-sm">{item.name}</span>
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-100 my-6 mx-2"></div>

          {/* Secondary Actions */}
          <div className="space-y-1">
            <button
              onClick={() => {
                if (onEditProfile) onEditProfile();
                onClose();
              }}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-gray-600 hover:bg-gray-50 transition-all duration-200"
            >
              <PencilSquareIcon className="h-5 w-5 text-gray-400" />
              <span className="text-sm">Edit Profile</span>
            </button>

            <button
              onClick={() => {
                if (onSettings) onSettings();
                onClose();
              }}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-gray-600 hover:bg-gray-50 transition-all duration-200"
            >
              <Cog6ToothIcon className="h-5 w-5 text-gray-400" />
              <span className="text-sm">Settings</span>
            </button>
          </div>
        </div>

        {/* Logout Button Footer */}
        {isAuthenticated && (
          <div className="p-4 border-t border-gray-50">
            <button
              onClick={() => {
                logout();
                onClose();
              }}
              className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-2xl bg-red-50 text-red-600 font-bold text-sm transition-all hover:bg-red-100 active:scale-[0.98]"
            >
              <ArrowLeftOnRectangleIcon className="h-5 w-5" />
              Logout
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default Sidebar;