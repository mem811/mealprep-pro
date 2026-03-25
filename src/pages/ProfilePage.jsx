import React from 'react';
import { useAuth } from '../context/AuthContext';
import pb from '../lib/pb';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiUser, FiCrown, FiChevronRight, FiLogOut, FiCheckCircle, FiShield, FiLoader, FiSettings } = FiIcons;

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: recipeCount = 0 } = useQuery({
    queryKey: ['recipe-count', user?.id],
    queryFn: async () => {
      const result = await pb.collection('recipes').getList(1, 1, {
        filter: `user="${user.id}"`,
      });
      return result.totalItems;
    },
    enabled: !!user,
  });

  const upgradeMutation = useMutation({
    mutationFn: async () => {
      await pb.collection('users').update(user.id, { plan: 'pro' });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auth-user'] });
      window.location.reload();
    },
  });

  const isPro = user?.plan === 'pro';

  const handleLogout = async () => {
    logout();
    navigate('/auth');
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <header className="flex items-center gap-6 mb-8">
        <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-emerald-500/20">
          <SafeIcon icon={FiUser} className="w-10 h-10" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{user?.name || 'Chef'}</h1>
          <p className="text-gray-500 text-sm">{user?.email}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${isPro ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
              {isPro ? 'Pro Plan' : 'Free Plan'}
            </span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm text-center">
          <p className="text-3xl font-bold text-emerald-500">{recipeCount}</p>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Recipes</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm text-center">
          <p className="text-3xl font-bold text-emerald-500">{isPro ? '∞' : 10 - recipeCount}</p>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Available</p>
        </div>
      </div>

      {!isPro && (
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-[2.5rem] p-8 text-white mb-8 relative overflow-hidden shadow-xl shadow-emerald-500/20">
          <div className="relative z-10">
            <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
              <SafeIcon icon={FiCrown} className="text-amber-300" /> Upgrade to Pro
            </h3>
            <p className="text-emerald-50 text-sm mb-6 max-w-xs opacity-90">
              Unlock unlimited recipes, nutrition tracking, and smart URL imports.
            </p>
            <button 
              onClick={() => upgradeMutation.mutate()}
              disabled={upgradeMutation.isPending}
              className="bg-white text-emerald-600 px-6 py-3 rounded-xl font-bold text-sm hover:bg-emerald-50 transition-colors flex items-center gap-2"
            >
              {upgradeMutation.isPending ? <SafeIcon icon={FiLoader} className="animate-spin" /> : 'Get Pro — $9.99'}
            </button>
          </div>
          <SafeIcon icon={FiCrown} className="absolute -right-10 -bottom-10 w-48 h-48 text-white/10 rotate-12" />
        </div>
      )}

      <div className="space-y-3">
        <button className="w-full bg-white p-5 rounded-2xl border border-gray-100 flex items-center justify-between group hover:bg-gray-50 transition-all">
          <div className="flex items-center gap-4">
            <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
              <SafeIcon icon={FiSettings} />
            </div>
            <span className="font-bold text-gray-700 text-sm">Account Settings</span>
          </div>
          <SafeIcon icon={FiChevronRight} className="text-gray-300 group-hover:text-gray-600" />
        </button>

        <button 
          onClick={handleLogout}
          className="w-full p-5 rounded-2xl flex items-center gap-4 text-red-500 font-bold hover:bg-red-50 transition-all text-sm"
        >
          <SafeIcon icon={FiLogOut} />
          Sign Out
        </button>
      </div>
    </div>
  );
}