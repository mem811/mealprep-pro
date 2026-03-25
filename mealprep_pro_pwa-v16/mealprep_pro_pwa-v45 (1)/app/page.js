"use client";
import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Users, ChefHat } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MEAL_SLOTS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];

export default function PlannerPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekDays, setWeekDays] = useState([]);
  const [mealPlan, setMealPlan] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const days = Array.from({ length: 7 }).map((_, i) => addDays(start, i));
    setWeekDays(days);
    fetchMealPlan(start);
  }, [selectedDate]);

  const fetchMealPlan = async (start) => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('meal_slots')
      .select('*, recipes(title, image_url, servings)')
      .eq('user_id', user.id);

    if (!error) setMealPlan(data || []);
    setLoading(false);
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Weekly Plan</h1>
          <p className="text-gray-500">Organize your meals for the week</p>
        </div>
        <div className="flex items-center bg-white rounded-xl shadow-sm border border-gray-100 p-1">
          <button 
            onClick={() => setSelectedDate(addDays(selectedDate, -7))}
            className="p-2 hover:bg-gray-50 rounded-lg"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="px-4 font-semibold text-sm">
            {format(weekDays[0] || new Date(), 'MMM d')} - {format(weekDays[6] || new Date(), 'MMM d')}
          </span>
          <button 
            onClick={() => setSelectedDate(addDays(selectedDate, 7))}
            className="p-2 hover:bg-gray-50 rounded-lg"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Day Selector (Mobile) / Table Header (Desktop) */}
      <div className="grid grid-cols-7 gap-2 md:gap-4">
        {weekDays.map((day) => (
          <div 
            key={day.toString()} 
            className={`flex flex-col items-center p-3 rounded-2xl cursor-pointer transition-all ${
              isSameDay(day, new Date()) 
                ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30' 
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">{format(day, 'EEE')}</span>
            <span className="text-lg font-bold">{format(day, 'd')}</span>
          </div>
        ))}
      </div>

      <div className="space-y-6">
        {MEAL_SLOTS.map((slot) => (
          <section key={slot} className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-brand-500" />
              {slot}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
              {weekDays.map((day) => {
                const meal = mealPlan.find(m => 
                  m.slot === slot && 
                  format(new Date(m.date), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
                );

                return (
                  <div key={day.toString()} className="h-40 md:h-48 group">
                    {meal ? (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="card h-full relative group cursor-pointer"
                      >
                        {meal.recipes.image_url ? (
                          <img 
                            src={meal.recipes.image_url} 
                            className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity" 
                          />
                        ) : (
                          <div className="absolute inset-0 bg-brand-50 opacity-20" />
                        )}
                        <div className="relative p-4 h-full flex flex-col justify-between">
                          <h4 className="font-bold text-sm leading-tight text-gray-900 drop-shadow-sm">
                            {meal.recipes.title}
                          </h4>
                          <div className="flex items-center gap-1 text-[10px] font-bold text-brand-700 bg-brand-50/80 backdrop-blur-sm self-start px-2 py-1 rounded-full">
                            <Users className="w-3 h-3" />
                            {meal.servings_multiplier}x Serving
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <button className="w-full h-full border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-400 hover:border-brand-500 hover:text-brand-500 hover:bg-brand-50/50 transition-all">
                        <Plus className="w-6 h-6 mb-1" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Assign</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}