import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Leaf } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const location = useLocation();
  const { user } = useAuth();

  const links = [
  { to: '/', label: 'Planner' },
  { to: '/recipes', label: 'Recipes' },
  { to: '/grocery-list', label: 'Grocery List' },
  { href: '/food-log', label: 'Food Log', icon: Utensils },  // ← ADD
  { to: '/food-log', label: 'Food Log' },  // ← ADD
];	

  return (
    <header className="hidden md:flex items-center justify-between px-8 py-4 bg-white border-b border-gray-100 sticky top-0 z-40">
      <Link to="/" className="flex items-center gap-2">
        <div className="w-8 h-8 bg-green-400 rounded-lg flex items-center justify-center">
          <Leaf size={18} className="text-white" />
        </div>
        <span className="font-display font-semibold text-xl text-gray-900">MealPrep Pro</span>
      </Link>
      <nav className="flex items-center gap-1">
        {links.map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              location.pathname === to
                ? 'bg-green-400 text-white'
                : 'text-gray-600 hover:bg-green-50 hover:text-green-600'
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>
      <Link to="/profile" className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-semibold text-sm">
          {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
        </div>
      </Link>
    </header>
  );
}
