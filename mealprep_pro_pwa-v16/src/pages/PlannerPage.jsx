import React, { useState, useEffect, useCallback, useMemo } from 'react';
import pb from '../lib/pb';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { motion, AnimatePresence } from 'framer-motion';
import RecipePickerModal from '../components/RecipePickerModal';
import { Link } from 'react-router-dom';


const { FiChevronLeft, FiChevronRight, FiPlus, FiCoffee, FiTrash2, FiUsers } = FiIcons;

const MEAL_SLOTS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];

export default function PlannerPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  // Changed state to flat array to match user's requested delete handler code
  const [mealSlots, setMealSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeCell, setActiveCell] = useState(null);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  // Derived grouped view for the rendering logic
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

      // FIX: Use meal_plan.user to correctly filter by user in PocketBase
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

  // REPLACE DELETE HANDLER WITH EXACT REQUESTED CODE
  const handleDeleteSlot = async (slotId) => {
    try {
      console.log('Deleting slot id:', slotId);
      await pb.collection('meal_slots').delete(slotId);
      // This line matches your request exactly
      setMealSlots(prev => prev.filter(s => s.id !== slotId));
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Delete failed: ' + err.message);
    }
  };

  const handleAddMeal = async ({ , servings_multiplier }) => {
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
        : .id,
        servings_multiplier
      });
      fetchMealPlan();
    } catch (e) {
      console.error('Add meal error:', e);
    }
  };

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

      <div className="grid grid-cols-7 gap-2 md:gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {days.map((day) => (
          <div key={day.toString()} className={`flex flex-col items-center min-w-[3.5rem] p-3 rounded-2xl transition-all ${isSameDay(day, new Date()) ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-white text-gray-600 border border-gray-100'}`}>
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">{format(day, 'EEE')}</span>
            <span className="text-lg font-bold">{format(day, 'd')}</span>
          </div>
        ))}
      </div>

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
                  <div key={day.toString()} className="min-h-[140px] md:h-52 group">
                    <div className="h-full flex flex-col gap-2">
                      <AnimatePresence>
                        {slots.map(item => {
  console.log('Item data:', { recipe: item.recipe, expand: item.expand });
  return (
  <motion.div
                            key={item.id} 
                            initial={{ opacity: 0, scale: 0.95 }} 
                            animate={{ opacity: 1, scale: 1 }} 
                            exit={{ opacity: 0, scale: 0.95, height: 0 }}
                            className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden relative group/card flex-shrink-0"
                          >
                            <div className="flex items-center gap-2 p-2 relative z-10">
                              <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-emerald-50 flex items-center justify-center">
                                {item.expand?.recipe?.image_url ? (
                                  <img src={item.expand.recipe.image_url} className="w-full h-full object-cover" loading="lazy" />
                                ) : (
                                  <SafeIcon icon={FiCoffee} className="w-4 h-4 text-emerald-200" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <Link to={`/recipes/${item.recipe || item.expand?.recipe?.id}`}>
  <h4 className="font-bold text-[9px] text-gray-900 leading-tight truncate hover:text-emerald-600 transition-colors cursor-pointer">{item.expand?.recipe?.title}</h4>
</Link>
                                <div className="flex items-center justify-between mt-0.5">
                                  <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded-sm">{item.servings_multiplier}x</span>
                                  {/* CALL DELETE HANDLER WITH STOP PROPAGATION */}
                                  <button 
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      console.log('slot data:', item); // DEBUG LOG AS REQUESTED
                                      handleDeleteSlot(item.id);
                                    }} 
                                    className="p-1 text-red-400 hover:bg-red-50 rounded-md opacity-0 group-hover/card:opacity-100 transition-opacity"
                                  >
                                    <SafeIcon icon={FiTrash2} className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
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
