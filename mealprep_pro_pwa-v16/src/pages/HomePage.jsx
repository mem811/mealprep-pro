import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import pb from '../lib/pb';
import RecipePickerModal from '../components/RecipePickerModal';
import { Plus, Trash2, ChevronLeft, ChevronRight, Loader2, UtensilsCrossed } from 'lucide-react';

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

  const weekLabel = (() => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    const opts = { month: 'short', day: 'numeric' };
    return `${weekStart.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}`;
  })();

  const { data: mealPlan, isLoading: planLoading } = useQuery({
    queryKey: ['meal-plan', user?.id, weekStartStr],
    queryFn: async () => {
      const plans = await pb.collection('meal_plans').getList(1, 1, {
        filter: `user_id = "${user.id}" && week_start_date = "${weekStartStr}"`,
      });
      if (plans.items.length > 0) return plans.items[0];
      const newPlan = await pb.collection('meal_plans').create({
        user_id: user.id,
        week_start_date: weekStartStr,
      });
      return newPlan;
    },
    enabled: !!user,
  });

  const { data: slots = [], isLoading: slotsLoading } = useQuery({
    queryKey: ['meal-slots', mealPlan?.id],
    queryFn: async () => {
      const result = await pb.collection('meal_slots').getList(1, 200, {
        filter: `meal_plan_id = "${mealPlan.id}"`,
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

  const openPicker = (day, slot) => {
    setPickerTarget({ day, slot });
    setPickerOpen(true);
  };

  const getSlotsForDayMeal = (dayIndex, slot) =>
    slots.filter((s) => s.day === dayIndex && s.slot === slot);

  if (planLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-28">
      {/* Week Navigator */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>
            Meal Planner
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{weekLabel}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setWeekOffset((w) => w - 1)}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={() => setWeekOffset(0)}
            className="px-3 py-1.5 text-xs font-semibold text-green-600 bg-green-50 hover:bg-green-100 rounded-xl transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => setWeekOffset((w) => w + 1)}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Day Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1 scrollbar-hide">
        {DAYS.map((day, i) => {
          const date = new Date(weekStart);
          date.setDate(date.getDate() + i);
          const isToday = new Date().toDateString() === date.toDateString();
          return (
            <button
              key={day}
              onClick={() => setActiveDay(i)}
              className={`flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-2xl transition-all duration-200 min-w-[56px] ${
                activeDay === i
                  ? 'bg-green-500 text-white shadow-md shadow-green-200'
                  : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
              }`}
            >
              <span className="text-xs font-medium">{day.slice(0, 3)}</span>
              <span className={`text-lg font-bold leading-tight ${isToday && activeDay !== i ? 'text-green-500' : ''}`}>
                {date.getDate()}
              </span>
              {isToday && (
                <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${activeDay === i ? 'bg-white' : 'bg-green-500'}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Meal Slots */}
      {slotsLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-green-400 animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {SLOTS.map((slot) => {
            const daySlots = getSlotsForDayMeal(activeDay, slot);
            return (
              <div key={slot} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className={`flex items-center justify-between px-4 py-3 border-b ${SLOT_COLORS[slot]}`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${SLOT_DOT[slot]}`} />
                    <span className="font-semibold text-sm">{slot}</span>
                  </div>
                  <button
                    onClick={() => openPicker(activeDay, slot)}
                    className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-white/70 hover:bg-white transition-colors shadow-sm"
                  >
                    <Plus className="w-3 h-3" />
                    Add
                  </button>
                </div>

                <div className="p-3 space-y-2">
                  {daySlots.length === 0 ? (
                    <button
                      onClick={() => openPicker(activeDay, slot)}
                      className="w-full py-4 flex flex-col items-center gap-1 text-gray-300 hover:text-gray-400 hover:bg-gray-50 rounded-xl transition-colors border-2 border-dashed border-gray-100 hover:border-gray-200"
                    >
                      <UtensilsCrossed className="w-5 h-5" />
                      <span className="text-xs font-medium">Tap to add a recipe</span>
                    </button>
                  ) : (
                    daySlots.map((s) => {
                      const recipe = s.expand?.recipe_id;
                      return (
                        <div key={s.id} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl group">
                          {recipe?.image_url ? (
                            <img
                              src={recipe.image_url}
                              alt={recipe.title}
                              className="w-10 h-10 rounded-lg object-cover shrink-0"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                              <UtensilsCrossed className="w-4 h-4 text-green-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">
                              {recipe?.title || 'Unknown Recipe'}
                            </p>
                            <p className="text-xs text-gray-400">
                              {s.servings_multiplier}× servings
                            </p>
                          </div>
                          <button
                            onClick={() => removeSlot.mutate(s.id)}
                            className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pickerOpen && pickerTarget && (
        <RecipePickerModal
          onClose={() => setPickerOpen(false)}
          onSelect={(recipeId, multiplier) => {
            addSlot.mutate({ recipeId, servingsMultiplier: multiplier });
            setPickerOpen(false);
          }}
        />
      )}
    </div>
  );
}