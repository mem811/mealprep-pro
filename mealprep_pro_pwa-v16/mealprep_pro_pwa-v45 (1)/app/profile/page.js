"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Crown, LogOut, Settings, Bell, CreditCard, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        setProfile(data);
      }
    };
    getUser();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/auth';
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <header className="flex items-center gap-6">
        <div className="w-24 h-24 bg-brand-500 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-brand-500/20">
          <User className="w-12 h-12" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{user?.email?.split('@')[0]}</h1>
          <p className="text-gray-500">{user?.email}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${
              profile?.plan === 'pro' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
            }`}>
              {profile?.plan || 'Free'} Plan
            </span>
          </div>
        </div>
      </header>

      {profile?.plan !== 'pro' && (
        <div className="bg-gradient-to-br from-brand-500 to-brand-600 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl shadow-brand-500/40">
          <div className="relative z-10">
            <h3 className="text-2xl font-bold mb-2 flex items-center gap-2">
              <Crown className="w-6 h-6 text-amber-300" />
              Upgrade to Pro
            </h3>
            <p className="text-brand-50 mb-6 text-sm max-w-sm leading-relaxed">
              Unlock unlimited recipes, nutrition estimates, and smart recipe import from any website.
            </p>
            <button className="bg-white text-brand-600 px-8 py-3 rounded-xl font-bold hover:bg-brand-50 transition-colors">
              Upgrade Now — $9.99/mo
            </button>
          </div>
          <Crown className="absolute -right-10 -bottom-10 w-64 h-64 text-white/10 rotate-12" />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        <button className="card p-5 flex items-center justify-between hover:bg-gray-50 transition-colors group">
          <div className="flex items-center gap-4">
            <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
              <Bell className="w-5 h-5" />
            </div>
            <span className="font-bold text-gray-700">Notifications</span>
          </div>
          <Settings className="w-5 h-5 text-gray-300 group-hover:text-gray-600 transition-colors" />
        </button>

        <button className="card p-5 flex items-center justify-between hover:bg-gray-50 transition-colors group">
          <div className="flex items-center gap-4">
            <div className="bg-purple-50 p-2 rounded-lg text-purple-600">
              <CreditCard className="w-5 h-5" />
            </div>
            <span className="font-bold text-gray-700">Billing & Subscription</span>
          </div>
          <Settings className="w-5 h-5 text-gray-300 group-hover:text-gray-600 transition-colors" />
        </button>

        <button className="card p-5 flex items-center justify-between hover:bg-gray-50 transition-colors group">
          <div className="flex items-center gap-4">
            <div className="bg-green-50 p-2 rounded-lg text-green-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="font-bold text-gray-700">Privacy & Security</span>
          </div>
          <Settings className="w-5 h-5 text-gray-300 group-hover:text-gray-600 transition-colors" />
        </button>

        <button 
          onClick={handleSignOut}
          className="mt-4 p-5 flex items-center gap-4 text-red-500 font-bold hover:bg-red-50 rounded-2xl transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Log Out
        </button>
      </div>
    </div>
  );
}