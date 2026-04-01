import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CalendarDays, BookOpen, ShoppingCart, User, Utensils } from 'lucide-react';

const tabs = [
  { to: '/', icon: CalendarDays, label: 'Planner' },
  { to: '/recipes', icon: BookOpen, label: 'Recipes' },
  { to: '/grocery-list', icon: ShoppingCart, label: 'Grocery' },
  { to: '/food-log', icon: Utensils, label: 'Food Log' },  // ← ADD
  { to: '/profile', icon: User, label: 'Profile' },
];

export default function BottomNav() {
  const location = useLocation();
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-40 safe-area-pb">
      <div className="flex items-center justify-around py-2">
        {tabs.map(({ to, icon: Icon, label }) => {
          const active = location.pathname === to;
          return (
            <Link key={to} to={to} className="flex flex-col items-center gap-0.5 px-3 py-1">
              <Icon size={22} className={active ? 'text-green-400' : 'text-gray-400'} />
              <span className={`text-[10px] font-medium ${active ? 'text-green-500' : 'text-gray-400'}`}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}