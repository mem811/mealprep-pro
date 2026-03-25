import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { motion } from 'framer-motion';

const { FiMail, FiLock, FiArrowRight, FiBox, FiUser } = FiIcons;

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const { error: authError } = isLogin 
      ? await login(email, password)
      : await register(email, password, name);

    if (authError) setError(authError.message || 'Authentication failed');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-xl border border-gray-100 w-full max-w-md"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="bg-emerald-500 p-4 rounded-3xl shadow-lg shadow-emerald-500/30 mb-4">
            <SafeIcon icon={FiBox} className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{isLogin ? 'Welcome Back' : 'Get Started'}</h1>
          <p className="text-gray-500 text-sm mt-1">Plan your healthy week today</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase px-1">Full Name</label>
              <div className="relative">
                <SafeIcon icon={FiUser} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input required type="text" className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-transparent focus:bg-white focus:border-emerald-500 rounded-2xl outline-none transition-all" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase px-1">Email</label>
            <div className="relative">
              <SafeIcon icon={FiMail} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input required type="email" className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-transparent focus:bg-white focus:border-emerald-500 rounded-2xl outline-none transition-all" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase px-1">Password</label>
            <div className="relative">
              <SafeIcon icon={FiLock} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input required type="password" placeholder="••••••••" className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-transparent focus:bg-white focus:border-emerald-500 rounded-2xl outline-none transition-all" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>

          {error && <p className="text-red-500 text-xs px-1 font-medium">{error}</p>}

          <button 
            disabled={loading}
            className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 group"
          >
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
            <SafeIcon icon={FiArrowRight} className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="w-full mt-6 text-sm font-semibold text-emerald-600 hover:text-emerald-700">
          {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
        </button>
      </motion.div>
    </div>
  );
}