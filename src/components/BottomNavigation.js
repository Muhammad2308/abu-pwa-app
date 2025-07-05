import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  FolderIcon,
  UserGroupIcon,
  UserIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';

const BottomNavigation = () => {
  const location = useLocation();

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

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="max-w-md mx-auto">
        <nav className="flex justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center py-2 px-3 min-w-0 flex-1 ${
                  isActive
                    ? 'text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="h-6 w-6 mb-1" />
                <span className="text-xs font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default BottomNavigation; 