import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import pb from '../lib/pb';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  User, Crown, ChevronRight, LogOut, CheckCircle,
  ShieldCheck, Loader2, Trash2
} from 'lucide-react';
import { getUserGoals, saveUserGoals } from "../lib/userGoals";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [goals, setGoals] = useState({ calories: "", protein: "", carbs: "", fat: "", ww_points: "" });
  const [savingGoals, setSavingGoals] = useState(false);
  const [goalsSaved, setGoalsSaved] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      const res = await fetch('/api/delete-account', {
        method: 'POST',
        headers: { Authorization: `Bearer ${pb.authStore.token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not delete your account. Please try again.');
      qc.clear();
      await logout();
      navigate('/', { replace: true });
    } catch (err) {
      setDeleteError(err.message);
      setDeleting(false);
    }
  };

  useEffect(() => {
    getUserGoals().then((g) => {
      if (g) setGoals({ calories: g.calories || "", protein: g.protein || "", carbs: g.carbs || "", fat: g.fat || "", ww_points: g.ww_points || "" });
    });
  }, []);

  const { data: recipeCount = 0 } = useQuery({
    queryKey: ['recipe-count', user?.id],
    queryFn: async () => {
      const result = await pb.collection('recipes').getList(1, 1, {
        filter: `user_id = "${user.id}"`,
      });
      return result.totalItems;
    },
    enabled: !!user,
  });

  const isPro = user?.plan === 'pro';

  const handleUpgrade = async (interval = 'monthly') => {
    setCheckoutLoading(true);
    setCheckoutError('');
    try {
      const priceId = interval === 'yearly'
        ? import.meta.env.VITE_STRIPE_PRO_YEARLY_PRICE_ID
        : import.meta.env.VITE_STRIPE_PRO_MONTHLY_PRICE_ID;

      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId,
          userId: user.id,
          userEmail: user.email,
        }),
      });
      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      } else {
        setCheckoutError('Could not start checkout. Please try again.');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setCheckoutError('Something went wrong. Please try again.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  async function handleSaveGoals(e) {
    e.preventDefault();
    try {
      setSavingGoals(true);
      await saveUserGoals({
        calories: Number(goals.calories) || 0,
        protein: Number(goals.protein) || 0,
        carbs: Number(goals.carbs) || 0,
        fat: Number(goals.fat) || 0, 
        ww_points: Number(goals.ww_points) || 0,
      });
      setGoalsSaved(true);
      setTimeout(() => setGoalsSaved(false), 2000);
    } catch (e) {
      alert(e?.message || "Failed to save goals.");
    } finally {
      setSavingGoals(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-28">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your account and plan</p>
      </div>

      {/* User Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center">
            <User className="w-7 h-7 text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-gray-900 text-lg truncate">{user?.name || 'User'}</h2>
            <p className="text-sm text-gray-500 truncate">{user?.email}</p>
          </div>
          <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${isPro ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
            {isPro ? <Crown className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
            {isPro ? 'Pro' : 'Free'}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-3xl font-bold text-green-500">{recipeCount}</p>
          <p className="text-sm text-gray-500 mt-1">Recipes saved</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-3xl font-bold text-green-500">{isPro ? '∞' : `${15 - recipeCount}`}</p>
          <p className="text-sm text-gray-500 mt-1">{isPro ? 'Unlimited' : 'Slots left'}</p>
        </div>
      </div>

      {/* Pro Upgrade */}
      {!isPro && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Crown className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-gray-900">Upgrade to Pro</h3>
          </div>
          <div className="space-y-2 mb-4">
            {['Unlimited recipes', 'Import from any recipe URL', 'Nutrition estimates per serving', 'Priority support'].map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm text-gray-700">
                <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                {f}
              </div>
            ))}
          </div>

          {checkoutError && (
            <p className="text-red-500 text-sm mb-3 text-center">{checkoutError}</p>
          )}

          <button
            onClick={() => handleUpgrade('monthly')}
            disabled={checkoutLoading}
            className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-bold rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 mb-2"
          >
            {checkoutLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Loading...</>
            ) : (
              <><Crown className="w-4 h-4" /> Try Pro free for 14 days → $6/mo</>
            )}
          </button>

          <button
            onClick={() => handleUpgrade('yearly')}
            disabled={checkoutLoading}
            className="w-full py-3 border border-amber-400 text-amber-700 hover:bg-amber-50 disabled:opacity-60 font-semibold rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
          >
            Save 30% with yearly — $50/yr
          </button>

          <p className="text-xs text-gray-400 text-center mt-2">No credit card required for trial</p>
        </div>
      )}

      {isPro && (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <Crown className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">You're on Pro!</h3>
              <p className="text-sm text-gray-500">All features unlocked</p>
            </div>
          </div>
        </div>
      )}

      {/* Nutritional Goals */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
        <div className="text-sm font-semibold text-gray-900 mb-4">🎯 Daily Nutritional Goals</div>
        <form onSubmit={handleSaveGoals} className="grid grid-cols-2 gap-3">
          {[["Calories", "calories", "kcal"], ["Protein", "protein", "g"], ["Carbs", "carbs", "g"], ["Fat", "fat", "g"], ["WW Points", "ww_points", "pts"]].map(([label, key, unit]) => (
            <label key={key} className="text-xs font-semibold text-gray-600">
              {label} ({unit})
              <input
                type="number"
                className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                value={goals[key]}
                onChange={(e) => setGoals((p) => ({ ...p, [key]: e.target.value }))}
                placeholder={`e.g. ${key === "calories" ? "2000" : key === "protein" ? "150" : key === "carbs" ? "200" : "65"}`}
              />
            </label>
          ))}
          <div className="col-span-2 flex justify-end mt-1">
            <button type="submit" disabled={savingGoals}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
              {savingGoals ? "Saving..." : goalsSaved ? "✓ Saved!" : "Save Goals"}
            </button>
          </div>
        </form>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-red-200 hover:bg-red-50 transition-all group"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center group-hover:bg-red-100 transition-colors">
            <LogOut className="w-4.5 h-4.5 text-red-500" />
          </div>
          <span className="text-sm font-semibold text-gray-700 group-hover:text-red-600 transition-colors">
            Sign Out
          </span>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-red-400 transition-colors" />
      </button>

      {/* Delete account */}
      {!showDelete ? (
        <button
          onClick={() => setShowDelete(true)}
          className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-gray-400 hover:text-red-600 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Delete my account
        </button>
      ) : (
        <div className="p-5 bg-red-50 border border-red-200 rounded-2xl space-y-3">
          <p className="text-sm font-bold text-red-700">Delete your account permanently?</p>
          <p className="text-sm text-red-700">
            This deletes all your recipes, meal plans, grocery lists, food log and goals. It can't be undone.
            {isPro && ' Your Pro subscription will be cancelled and you will not be charged again.'}
          </p>
          <label className="block text-sm text-red-700">
            Type <strong>DELETE</strong> to confirm
            <input
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              className="mt-1.5 w-full px-3 py-2 rounded-xl border border-red-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-300"
              autoComplete="off"
            />
          </label>
          {deleteError && <p className="text-sm font-medium text-red-600">{deleteError}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => { setShowDelete(false); setDeleteText(''); setDeleteError(''); }}
              disabled={deleting}
              className="flex-1 py-2.5 rounded-xl bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteAccount}
              disabled={deleteText !== 'DELETE' || deleting}
              className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {deleting ? (<><Loader2 className="w-4 h-4 animate-spin" />Deleting...</>) : 'Delete account'}
            </button>
          </div>
        </div>
      )}

      <p className="text-center text-xs text-gray-400">
        <a href="/privacy" className="hover:underline">Privacy</a> · <a href="/terms" className="hover:underline">Terms</a> · <a href="/contact" className="hover:underline">Contact us</a>
      </p>
    </div>
  );
}
