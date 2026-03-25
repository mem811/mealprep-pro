import React, { useState, useEffect, useCallback } from 'react';
import pb from '../lib/pb';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { motion } from 'framer-motion';
import RecipePickerModal from '../components/RecipePickerModal';

const { FiChevronLeft, FiChevronRight, FiPlus, FiCoffee, FiTrash2 } = FiIcons;
const MEAL_SLOTS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];

export default function PlannerPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [mealPlan, setMealPlan] = useState({});
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeCell, setActiveCell] = useState(null);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  const fetchMealPlan = useCallback(async () => {
    setLoading(true);
    try {
      const userId = pb.authStore.model?.id;
      if (!userId) return;

      const res = await pb.collection('meal_slots').getList(1, 200, {
        filter: `meal_plan.user="${userId}" && date >= "${format(weekStart, 'yyyy-MM-dd')}" && date <= "${format(addDays(weekStart, 6), 'yyyy-MM-dd')}"`,
        expand: 'recipe',
      });

      const map = {};
      res.items.forEach(slot => {
        const key = `${slot.date}__${slot.slot}`;
        if (!map[key]) map[key] = [];
        map[key].push(slot);
      });
      setMealPlan(map);
    } catch (e) {
      console.error('Fetch plan error:', e);
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    fetchMealPlan();
  }, [fetchMealPlan]);

  const handleAddMeal = async ({ recipe, servings_multiplier }) => {
    if (!activeCell) return;
    try {
      const userId = pb.authStore.model?.id;
      const { date, slot } = activeCell;

      // Get or create meal plan for this week
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

  const removeSlot = async (id) => {
    try {
      await pb.collection('meal_slots').delete(id);
      fetchMealPlan();
    } catch (e) {
      console.error('Delete error:', e);
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
          <div 
            key={day.toString()}
            className={`flex flex-col items-center min-w-[3.5rem] p-3 rounded-2xl transition-all ${
              isSameDay(day, new Date()) 
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                : 'bg-white text-gray-600 border border-gray-100'
            }`}
          >
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
                  <div key={day.toString()} className="h-44 md:h-52 group">
                    <div className="h-full space-y-2">
                      {slots.map(item => (
                        <motion.div 
                          key={item.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-white rounded-2xl border border-gray-100 shadow-sm h-full overflow-hidden relative group/card"
                        >
                          {item.expand?.recipe?.image_url && (
                            <img src={item.expand.recipe.image_url} className="absolute inset-0 w-full h-full object-cover opacity-30" />
                          )}
                          <div className="relative p-3 h-full flex flex-col justify-between">
                            <h4 className="font-bold text-[10px] text-gray-900 leading-tight">{item.expand?.recipe?.title}</h4>
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">{item.servings_multiplier}x</span>
                              <button onClick={() => removeSlot(item.id)} className="p-1 text-red-400 hover:bg-red-50 rounded-lg opacity-0 group-hover/card:opacity-100 transition-opacity">
                                <SafeIcon icon={FiTrash2} className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                      {slots.length === 0 && (
                        <button 
                          onClick={() => { setActiveCell({ date: dateKey, slot }); setModalOpen(true); }}
                          className="w-full h-full border-2 border-dashed border-gray-100 rounded-2xl flex items-center justify-center text-gray-300 hover:border-emerald-500 hover:text-emerald-500 hover:bg-emerald-50/50 transition-all"
                        >
                          <SafeIcon icon={FiPlus} className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <RecipePickerModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        onSelect={handleAddMeal}
      />
    </div>
  );
}