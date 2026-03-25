import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import pb from '../lib/pb';
import RecipePickerModal from '../components/RecipePickerModal';
import { 
  Plus, Trash2, ChevronLeft, ChevronRight, Loader2, UtensilsCrossed, 
  Flame, HardDrive, Wheat, Droplets 
} from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SLOTS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];

const SLOT_COLORS = {
  Breakfast: 'bg-amber-50 border-amber-200 text-amber-700',
  Lunch: 'bg-blue-50 border-blue-200 text-blue-700',
  Dinner: 'bg-purple-50 border-purple-200 text-purple-700',
  Snacks: 'bg-green-50 border-green-200 text-green-700',
};

const SLOT_DOT = {
  Breakfast: 'bg-amber-400',
  Lunch: 'bg-blue-400',
  Dinner: 'bg-purple-400',
  Snacks: 'bg-green-400',
};

function getWeekStart(offset = 0) {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1) + offset * 7;
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function formatWeekStart(date) {
  return date.toISOString().split('T')[0];
}

export default function HomePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [weekOffset, setWeekOffset] = useState(0);
  const [activeDay, setActiveDay] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState(null);

  const weekStart = getWeekStart(weekOffset);
  const weekStartStr = formatWeekStart(weekStart);

  const { data: mealPlan, isLoading: planLoading } = useQuery({
    queryKey: ['meal-plan', user?.id, weekStartStr],
    queryFn: async () => {
      const plans = await pb.collection('meal_plans').getList(1, 1, {
        filter: `user_id="${user.id}" && week_start_date="${weekStartStr}"`,
      });
      if (plans.items.length > 0) return plans.items[0];
      return await pb.collection('meal_plans').create({ user_id: user.id, week_start_date: weekStartStr });
    },
    enabled: !!user,
  });

  const { data: slots = [] } = useQuery({
    queryKey: ['meal-slots', mealPlan?.id],
    queryFn: async () => {
      const result = await pb.collection('meal_slots').getList(1, 200, {
        filter: `meal_plan_id="${mealPlan.id}"`,
        expand: 'recipe_id',
      });
      return result.items;
    },
    enabled: !!mealPlan?.id,
  });

  const addSlot = useMutation({
    mutationFn: async ({ recipeId, servingsMultiplier }) => {
      return pb.collection('meal_slots').create({
        meal_plan_id: mealPlan.id,
        day: pickerTarget.day,
        slot: pickerTarget.slot,
        recipe_id: recipeId,
        servings_multiplier: servingsMultiplier,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meal-slots', mealPlan?.id] }),
  });

  const removeSlot = useMutation({
    mutationFn: (slotId) => pb.collection('meal_slots').delete(slotId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meal-slots', mealPlan?.id] }),
  });

  const daySlots = slots.filter(s => s.day === activeDay);
  const dailyNutrition = daySlots.reduce((acc, s) => {
    const nutrition = s.expand?.recipe_id?.nutrition || { calories: 0, protein: 0, carbs: 0, fat: 0 };
    const mult = s.servings_multiplier || 1;
    return {
      calories: acc.calories + (nutrition.calories * mult),
      protein: acc.protein + (nutrition.protein * mult),
      carbs: acc.carbs + (nutrition.carbs * mult),
      fat: acc.fat + (nutrition.fat * mult),
    };
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

  if (planLoading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="animate-spin text-green-500" /></div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-28">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Meal Planner</h1>
        <div className="flex items-center gap-1">
          <button onClick={() => setWeekOffset(w => w - 1)} className="p-2 hover:bg-gray-100 rounded-xl"><ChevronLeft /></button>
          <button onClick={() => setWeekOffset(0)} className="px-3 py-1.5 text-xs font-bold text-green-600 bg-green-50 rounded-xl">Today</button>
          <button onClick={() => setWeekOffset(w => w + 1)} className="p-2 hover:bg-gray-100 rounded-xl"><ChevronRight /></button>
        </div>
      </header>

      <div className="flex gap-1.5 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {DAYS.map((day, i) => {
          const date = new Date(weekStart);
          date.setDate(date.getDate() + i);
          return (
            <button key={day} onClick={() => setActiveDay(i)} className={`flex-shrink-0 flex flex-col items-center px-4 py-3 rounded-2xl min-w-[64px] ${activeDay === i ? 'bg-green-500 text-white shadow-lg' : 'bg-white border text-gray-400'}`}>
              <span className="text-[10px] font-black uppercase mb-1">{day.slice(0, 3)}</span>
              <span className="text-xl font-black">{date.getDate()}</span>
            </button>
          );
        })}
      </div>

      <div className="bg-white border rounded-[2rem] p-6 shadow-sm mb-6 grid grid-cols-4 gap-4">
        {[
          { label: 'CAL', val: dailyNutrition.calories, icon: Flame, col: 'text-orange-500' },
          { label: 'PRO', val: dailyNutrition.protein, icon: HardDrive, col: 'text-blue-500' },
          { label: 'CHO', val: dailyNutrition.carbs, icon: Wheat, col: 'text-amber-500' },
          { label: 'FAT', val: dailyNutrition.fat, icon: Droplets, col: 'text-pink-500' },
        ].map(n => (
          <div key={n.label} className="text-center">
            <n.icon className={`w-4 h-4 mx-auto mb-2 ${n.col}`} />
            <p className="text-lg font-black text-gray-800 leading-none mb-1">{Math.round(n.val)}</p>
            <p className="text-[9px] font-black text-gray-400 tracking-wider">{n.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {SLOTS.map((slot) => {
          const slotData = daySlots.filter(s => s.slot === slot);
          return (
            <div key={slot} className="bg-white rounded-3xl border shadow-sm overflow-hidden">
              <div className={`flex items-center justify-between px-5 py-3.5 border-b ${SLOT_COLORS[slot]}`}>
                <div className="flex items-center gap-2.5">
                  <span className={`w-2.5 h-2.5 rounded-full border-2 border-white ${SLOT_DOT[slot]}`} />
                  <span className="font-black text-xs uppercase tracking-widest">{slot}</span>
                </div>
                <button onClick={() => { setPickerTarget({ day: activeDay, slot }); setPickerOpen(true); }} className="text-[10px] font-black uppercase px-3 py-1.5 rounded-xl bg-white/60 hover:bg-white transition-all">+ Add</button>
              </div>
              <div className="p-4 space-y-3">
                {slotData.length === 0 ? (
                  <p className="text-center py-6 text-xs text-gray-300 font-bold uppercase tracking-widest">No meals planned</p>
                ) : (
                  slotData.map((s) => (
                    <div key={s.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-2xl group transition-all hover:bg-white hover:shadow-md border border-transparent hover:border-gray-100">
                      {s.expand?.recipe_id?.image_url ? (
                        <img 
                          src={`https://images.weserv.nl/?url=${encodeURIComponent(s.expand.recipe_id.image_url)}&w=100&h=100&fit=cover`} 
                          alt="" 
                          className="w-14 h-14 rounded-xl object-cover" 
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-green-100 flex items-center justify-center shrink-0"><UtensilsCrossed className="text-green-400" /></div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-800 truncate">{s.expand?.recipe_id?.title}</p>
                        <p className="text-[10px] font-bold text-gray-400">{s.servings_multiplier}× portion · {Math.round((s.expand?.recipe_id?.nutrition?.calories || 0) * s.servings_multiplier)} kcal</p>
                      </div>
                      <button onClick={() => removeSlot.mutate(s.id)} className="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16} /></button>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {pickerOpen && <RecipePickerModal onClose={() => setPickerOpen(false)} onSelect={(id, m) => { addSlot.mutate({ recipeId: id, servingsMultiplier: m }); setPickerOpen(false); }} />}
    </div>
  );
}