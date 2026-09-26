import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CalendarPlus, X, Minus, Plus, Check, Loader2 } from 'lucide-react';
import { addRecipeToPlan, MEAL_TYPES, MEAL_LABELS, todayLocal } from '../lib/mealPlan';

export default function AddToPlannerModal({ open, onClose, recipe, defaultMultiplier }) {
  const [date, setDate] = useState(todayLocal());
  const [meal, setMeal] = useState('dinner');
  const [multiplier, setMultiplier] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  // Fresh start each time it opens, matching the 1× / 2× / 4× you're viewing
  useEffect(() => {
    if (!open) return;
    setDate(todayLocal());
    setMeal('dinner');
    setMultiplier(Number(defaultMultiplier) || 1);
    setError(null);
    setDone(false);
  }, [open, defaultMultiplier]);

  if (!open || !recipe) return null;

  const niceDate = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  const handleAdd = async () => {
    setSaving(true);
    setError(null);
    try {
      await addRecipeToPlan({ recipeId: recipe.id, date, meal, multiplier });
      setDone(true);
    } catch (err) {
      console.error('Add to planner error:', err);
      setError(err?.message || 'Could not add it to your planner. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl">
        <div className="flex items-start justify-between px-6 pt-5 pb-3 border-b border-gray-100">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-900">Add to Planner</h2>
            <p className="text-xs text-gray-500 truncate">{recipe.title}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {done ? (
          <div className="px-6 py-10 text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-green-50 flex items-center justify-center mb-3">
              <Check className="w-7 h-7 text-green-600" />
            </div>
            <p className="font-semibold text-gray-900">Added to {MEAL_LABELS[meal]}</p>
            <p className="text-sm text-gray-500 mb-5">{niceDate}</p>
            <div className="flex gap-2 justify-center">
              <button onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Done
              </button>
              <Link to="/app" className="px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700">
                View planner
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="px-6 py-5 space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Day</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => e.target.value && setDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Meal</label>
                <div className="grid grid-cols-4 gap-2">
                  {MEAL_TYPES.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMeal(m)}
                      className={'py-2 rounded-xl text-sm font-medium border-2 transition-colors ' +
                        (meal === m ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-green-200')}
                    >
                      {MEAL_LABELS[m]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Batch size</label>
                <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-1.5">
                  <button type="button" onClick={() => setMultiplier(Math.max(0.5, multiplier - 0.5))} className="text-green-600 p-0.5" aria-label="Less">
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-semibold w-10 text-center">{multiplier}×</span>
                  <button type="button" onClick={() => setMultiplier(multiplier + 0.5)} className="text-green-600 p-0.5" aria-label="More">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>

            <div className="px-6 pb-6">
              <button
                onClick={handleAdd}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-sm disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarPlus className="w-4 h-4" />}
                {saving ? 'Adding…' : 'Add to ' + MEAL_LABELS[meal] + ' · ' + niceDate}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
