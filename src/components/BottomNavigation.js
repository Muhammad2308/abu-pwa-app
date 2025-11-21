import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  HomeIcon,
  FolderIcon,
  UserGroupIcon,
  UserIcon,
  CurrencyDollarIcon,
  XMarkIcon,
  PencilIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import abuLogo from '../assets/abu_logo.png';

const Sidebar = ({ isOpen, onClose, onEditProfile, onSettings }) => {
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
          className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <img src={abuLogo} alt="ABU Logo" className="h-8 w-auto" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-gray-800 leading-tight">ABU Endowment</span>
                <span className="text-[10px] font-bold text-gray-600 leading-none">& Crowd Funding</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Close menu"
            >
              <XMarkIcon className="h-6 w-6 text-gray-600" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 overflow-y-auto py-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <button
                  key={item.path}
                  onClick={() => handleLinkClick(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-primary-600 border-r-4 border-primary-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className={`h-6 w-6 ${isActive ? 'text-primary-600' : 'text-gray-500'}`} />
                  <span className="text-base font-medium">{item.name}</span>
                </button>
              );
            })}
            
            {/* Divider */}
            <div className="border-t border-gray-200 my-2"></div>
            
            {/* Edit Profile */}
            <button
              onClick={() => {
                if (onEditProfile) onEditProfile();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors text-gray-700 hover:bg-gray-50"
            >
              <PencilIcon className="h-6 w-6 text-blue-600" />
              <span className="text-base font-medium">Edit Profile</span>
            </button>
            
            {/* Settings */}
            <button
              onClick={() => {
                if (onSettings) onSettings();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors text-gray-700 hover:bg-gray-50"
            >
              <Cog6ToothIcon className="h-6 w-6 text-gray-500" />
              <span className="text-base font-medium">Settings</span>
            </button>
          </nav>
        </div>
      </div>
    </>
  );
};

export default Sidebar; 