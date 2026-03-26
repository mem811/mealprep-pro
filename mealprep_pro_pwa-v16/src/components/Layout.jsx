import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiCalendar, FiBookOpen, FiShoppingCart, FiUser, FiBox } = FiIcons;

export default function Layout() {
  const location = useLocation();
  
  const navItems = [
    { to: '/', icon: FiCalendar, label: 'Planner' },
    { to: '/recipes', icon: FiBookOpen, label: 'Library' },
    { to: '/groceries', icon: FiShoppingCart, label: 'Groceries' },
    { to: '/profile', icon: FiUser, label: 'Profile' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0 md:pl-64">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-10 px-2">
          <div className="bg-emerald-500 p-2 rounded-xl text-white">
            <SafeIcon icon={FiBox} className="w-6 h-6" />
          </div>
          <span className="text-xl font-bold text-gray-800">MealPrep Pro</span>
        </div>
        
        <nav className="flex-1 space-y-1">
          {navItems.map(({ to, icon, label }) => (
            <Link 
              key={to} 
              to={to} 
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                location.pathname === to 
                  ? 'bg-emerald-50 text-emerald-600 font-semibold' 
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <SafeIcon icon={icon} className="w-5 h-5" />
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4 md:p-8">
        <Outlet />
      </main>

      {/* Bottom Nav - Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex items-center justify-around h-20 px-4 z-50">
        {navItems.map(({ to, icon, label }) => (
          <Link 
            key={to} 
            to={to} 
            className={`flex flex-col items-center gap-1 ${
              location.pathname === to ? 'text-emerald-500' : 'text-gray-400'
            }`}
          >
            <SafeIcon icon={icon} className="w-6 h-6" />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}