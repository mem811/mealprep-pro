import React, { useState, useEffect, useCallback, useMemo } from 'react';
import pb from '../lib/pb';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { motion, AnimatePresence } from 'framer-motion';
import RecipePickerModal from '../components/RecipePickerModal';
import { Link, useNavigate } from 'react-router-dom';

const { FiChevronLeft, FiChevronRight, FiPlus, FiCoffee, FiTrash2 } = FiIcons;

const MEAL_SLOTS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];

export default function PlannerPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const navigate = useNavigate();
  const [mealSlots, setMealSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeCell, setActiveCell] = useState(null);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  const todayCardStyle = { background: 'linear-gradient(135deg, #10b981, #059669)' };
  const slotCardStyle = { backgroundColor: 'rgba(255,255,255,0.15)' };
  const nothingTextStyle = { color: 'rgba(255,255,255,0.5)' };
  const recipeThumbStyle = { backgroundColor: 'rgba(255,255,255,0.2)' };

  const mealPlan = useMemo(() => {
    const map = {};
    mealSlots.forEach(slot => {
      const key = `${slot.date}__${slot.slot}`;
      if (!map[key]) map[key] = [];
      map[key].push(slot);
    });
    return map;
  }, [mealSlots]);

  const fetchMealPlan = useCallback(async () => {
    setLoading(true);
    try {
      const userId = pb.authStore.model?.id;
      if (!userId) return;
      const res = await pb.collection('meal_slots').getList(1, 200, {
        filter: `meal_plan.user="${userId}" && date >= "${format(weekStart, 'yyyy-MM-dd')}" && date <= "${format(addDays(weekStart, 6), 'yyyy-MM-dd')}"`,
        expand: 'recipe',
      });
      setMealSlots(res.items);
    } catch (e) {
      console.error('Fetch plan error:', e);
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    fetchMealPlan();
  }, [fetchMealPlan]);

  const handleDeleteSlot = async (slotId) => {
    try {
      await pb.collection('meal_slots').delete(slotId);
      setMealSlots(prev => prev.filter(s => s.id !== slotId));
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Delete failed: ' + err.message);
    }
  };

  const handleAddMeal = async ({ recipe, servings_multiplier }) => {
    if (!activeCell) return;
    try {
      const userId = pb.authStore.model?.id;
      const { date, slot } = activeCell;
      let mealPlanId;
      const plans = await pb.collection('meal_plans').getList(1, 1, {
        filter: `user="${userId}" && week_start_date="${format(weekStart, 'yyyy-MM-dd')}"`
      });
      if (plans.items.length > 0) {
        mealPlanId = plans.items[0].id;
      } else {
        const newPlan = await pb.collection('meal_plans').create({
          user: userId,
          week_start_date: format(weekStart, 'yyyy-MM-dd')
        });
        mealPlanId = newPlan.id;
      }
      await pb.collection('meal_slots').create({
        meal_plan: mealPlanId,
        user_id: userId,
        date,
        slot,
        recipe: recipe.id,
        servings_multiplier
      });
      fetchMealPlan();
    } catch (e) {
      console.error('Add meal error:', e);
    }
  };

  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const todayMeals = MEAL_SLOTS.map(slot => ({
    slot,
    items: mealPlan[`${todayKey}__${slot}`] || []
  }));

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Weekly Planner</h1>
          <p className="text-gray-500">Plan your meals for the week</p>
        </div>
        <div className="flex items-center bg-white rounded-2xl shadow-sm border border-gray-100 p-1">
          <button onClick={() => setCurrentDate(addDays(currentDate, -7))} className="p-2 hover:bg-gray-50 rounded-xl">
            <SafeIcon icon={FiChevronLeft} className="w-5 h-5 text-gray-400" />
          </button>
          <span className="px-4 font-bold text-sm text-gray-700">
            {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d')}
          </span>
          <button onClick={() => setCurrentDate(addDays(currentDate, 7))} className="p-2 hover:bg-gray-50 rounded-xl">
            <SafeIcon icon={FiChevronRight} className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </header>

    {/* TODAY SUMMARY CARD */}
<div className="rounded-3xl p-6 text-white shadow-lg" style={todayCardStyle}>
  <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
    <div className="flex-shrink-0">
      <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest mb-1">Today</p>
      <h2 className="text-2xl font-bold">{format(new Date(), 'EEEE, MMMM d')}</h2>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full md:w-auto">
      {todayMeals.map(({ slot, items }) => (
        <div key={slot} className="rounded-2xl p-3" style={slotCardStyle}>
          <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-wider mb-2">{slot}</p>
          {items.length === 0 ? (
            <p className="text-xs italic" style={nothingTextStyle}>Nothing planned</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {items.map(item => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={() => {
                    const recipeId = item.recipe || item.expand?.recipe?.id;
                    if (recipeId) navigate(`/recipes/${recipeId}`);
                  }}
                >
                  <div className="w-7 h-7 rounded-lg overflow-hidden flex-shrink-0" style={recipeThumbStyle}>
                    {item.expand?.recipe?.image_url ? (
                      <img src={item.expand.recipe.image_url} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <SafeIcon icon={FiCoffee} className="w-3 h-3 text-white opacity-60" />
                      </div>
                    )}
                  </div>
                  <p className="text-white text-[11px] font-semibold leading-tight line-clamp-2">
                    {item.expand?.recipe?.title}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
</div>

      {/* Date header row */}
      <div className="grid grid-cols-7 gap-2 md:gap-4">
        {days.map((day) => (
          <div
            key={day.toString()}
            className="flex flex-col items-center min-w-[3.5rem] p-3 rounded-2xl transition-all border"
            style={
              isSameDay(day, new Date())
                ? { backgroundColor: '#d1fae5', color: '#065f46', borderColor: '#6ee7b7' }
                : { backgroundColor: '#ffffff', color: '#4b5563', borderColor: '#f3f4f6' }
            }
          >
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">{format(day, 'EEE')}</span>
            <span className="text-lg font-bold">{format(day, 'd')}</span>
          </div>
        ))}
      </div>

      {/* Meal grid */}
      <div className="space-y-8">
        {MEAL_SLOTS.map((slot) => (
          <section key={slot}>
            <div className="flex items-center gap-2 mb-4">
              <SafeIcon icon={FiCoffee} className="w-4 h-4 text-emerald-500" />
              <h3 className="font-bold text-gray-800 uppercase tracking-widest text-[10px]">{slot}</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
              {days.map((day) => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const slots = mealPlan[`${dateKey}__${slot}`] || [];
                return (
                  <div
                    key={day.toString()}
                    className="min-h-[140px] md:h-52 group rounded-xl"
                    style={isSameDay(day, new Date()) ? { backgroundColor: 'rgba(209, 250, 229, 0.4)' } : {}}
                  >
                    <div className="h-full flex flex-col gap-2">
                      <AnimatePresence>
                        {slots.map(item => (
                          <motion.div
                            key={item.id}
                            initial= opacity: 0, scale: 0.95 
                            animate= opacity: 1, scale: 1 
                            exit= opacity: 0, scale: 0.95, height: 0 
                            className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden relative group/card flex-shrink-0 w-full max-w-[180px]"
                          >
                            <div
                              className="flex items-center gap-2 p-2 cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                const recipeId = item.recipe || item.expand?.recipe?.id;
                                if (recipeId) navigate(`/recipes/${recipeId}`);
                              }}
                            >
                              <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-emerald-50 flex items-center justify-center">
                                {item.expand?.recipe?.image_url ? (
                                  <img src={item.expand.recipe.image_url} className="w-full h-full object-cover" loading="lazy" />
                                ) : (
                                  <SafeIcon icon={FiCoffee} className="w-4 h-4 text-emerald-200" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-[9px] text-gray-900 leading-tight truncate hover:text-emerald-600">
                                  {item.expand?.recipe?.title}
                                </h4>
                                <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded-sm">
                                  {item.servings_multiplier}x
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDeleteSlot(item.id);
                              }}
                              className="absolute top-1 right-1 p-1 text-red-400 hover:bg-red-50 rounded-md opacity-0 group-hover/card:opacity-100 transition-opacity"
                            >
                              <SafeIcon icon={FiTrash2} className="w-3.5 h-3.5" />
                            </button>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      <button
                        onClick={() => { setActiveCell({ date: dateKey, slot }); setModalOpen(true); }}
                        className={`w-full ${slots.length > 0 ? 'py-2 mt-auto' : 'h-full'} border-2 border-dashed border-gray-100 rounded-xl flex items-center justify-center text-gray-300 hover:border-emerald-500 hover:text-emerald-500 hover:bg-emerald-50/50 transition-all`}
                      >
                        <SafeIcon icon={FiPlus} className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      <RecipePickerModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSelect={handleAddMeal} />
    </div>
  );
}
