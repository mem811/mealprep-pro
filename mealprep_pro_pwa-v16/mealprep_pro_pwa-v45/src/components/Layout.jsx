import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import BottomNav from './BottomNav';

export default function Layout() {
  return (
    <div className="min-h-screen bg-[#f8faf9] flex flex-col">
      <Navbar />
      <main className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}