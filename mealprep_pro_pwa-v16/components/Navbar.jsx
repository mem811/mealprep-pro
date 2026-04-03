"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Calendar, 
  BookOpen, 
  ShoppingCart, 
  User, 
  PlusSquare,
  Utensils
} from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();

  const links = [
                  { href: '/', label: 'Planner', icon: Calendar },
                  { href: '/food-log', label: 'Food Log', icon: Utensils },  // ← ADD
                  { href: '/recipes', label: 'Recipes', icon: BookOpen },
                  { href: '/grocery-list', label: 'Groceries', icon: ShoppingCart },
                  { href: '/profile', label: 'Profile', icon: User },
                ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-10 px-2">
          <div className="bg-brand-500 p-2 rounded-lg">
            <Utensils className="text-white w-6 h-6" />
          </div>
          <span className="text-xl font-bold text-gray-800 tracking-tight">MealPrep Pro</span>
        </div>
        
        <nav className="flex-1 space-y-2">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link 
                key={link.href} 
                href={link.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-brand-50 text-brand-600 font-semibold' 
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <Link 
          href="/recipes/new"
          className="mt-auto bg-brand-500 text-white flex items-center justify-center gap-2 py-4 rounded-2xl font-bold shadow-lg shadow-brand-500/20 hover:bg-brand-600 transition-all"
        >
          <PlusSquare className="w-5 h-5" />
          Create Recipe
        </Link>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex items-center justify-around h-20 px-4 z-50">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link 
              key={link.href} 
              href={link.href}
              className={`nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon className="w-6 h-6 mb-1" />
              {link.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

import { useDarkMode } from "../lib/useDarkMode";
import { Moon, Sun } from "lucide-react";

// Inside your Navbar component:
const [isDark, toggleDark] = useDarkMode();

// The button (put this in your nav actions area):
<button
  onClick={toggleDark}
  className="w-9 h-9 rounded-2xl flex items-center justify-center border border-emerald-100 bg-white/80 hover:bg-emerald-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700 transition-colors"
  title={isDark ? "Switch to light mode" : "Switch to dark mode"}
>
  {isDark
    ? <Sun size={16} className="text-amber-400" />
    : <Moon size={16} className="text-emerald-600" />
  }
</button>
