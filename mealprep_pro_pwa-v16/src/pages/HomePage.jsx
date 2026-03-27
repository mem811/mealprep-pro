import { useState, useEffect, useCallback } from 'react';
import pb from '../lib/pb';
import RecipePickerModal from '../components/RecipePickerModal';
import { Plus, ChevronLeft, ChevronRight, X, Utensils } from 'lucide-react';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' };
const MEAL_COLORS = {
  breakfast: 'from-amber-50 to-orange-50 border-amber-200',
  lunch:     'from-green-50 to-emerald-50 border-green-200',
  dinner:    'from-blue-50 to-indigo-50 border-blue-200',
  snack:     'from-purple-50 to-pink-50 border-purple-200',
};
const MEAL_ICONS = { breakfast: '', lunch: '', dinner: '', snack: '' };


function getWeekDays(baseDate) {
  const day = baseDate.getDay();
  const monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() - ((day + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function fmt(d) {
  return d.toISOString().split('T')[0];
}

function getProxiedImage(url) {
  if (!url) return null;
  return `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=80&h=80&fit=cover&q=80`;
}

export default function HomePage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(fmt(new Date()));
  const [slots, setSlots] = useState({});
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeCell, setActiveCell] = useState(null); // { date, mealType }
  const [saving, setSaving] = useState(false);

  const [featuredRecipes, setFeaturedRecipes] = useState([]);
  const [groceryItems, setGroceryItems] = useState([]);
  const [checkedItems, setCheckedItems] = useState({});

  const today = fmt(new Date());
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + weekOffset * 7);
  const weekDays = getWeekDays(baseDate);
  const weekStart = fmt(weekDays[0]);
  const weekEnd = fmt(weekDays[6]);

  const fetchSlots = useCallback(async () => {
    setLoading(true);
    try {
      const userId = pb.authStore.model?.id;
      if (!userId) return;
      const res = await pb.collection('meal_slots').getList(1, 200, {
        filter: `meal_plan.user = "${userId}" && date >= "${weekStart}" && date <= "${weekEnd}"`,
        expand: 'recipe',
      });
      const map = {};
      for (const slot of res.items) {
        const key = `${slot.date}__${slot.slot}`;
        if (!map[key]) map[key] = [];
        map[key].push({
          slotId: slot.id,
          recipe: slot.expand?.recipe || null,
          servings_multiplier: slot.servings_multiplier || 1,
        });
      }
      setSlots(map);
    } catch (e) {
      console.error('Fetch slots error:', e);
    } finally {
      setLoading(false);
    }
  }, [weekStart, weekEnd]);

  useEffect(() => { fetchSlots(); }, [fetchSlots]);

useEffect(() => {
  const fetchRecipes = async () => {
    try {
      const userId = pb.authStore.model?.id;
      if (!userId) return;
      const res = await pb.collection('recipes').getList(1, 6, {
        filter: `user = "${userId}"`,
        sort: '-created',
      });
      setFeaturedRecipes(res.items);
    } catch (e) {
      console.error('Fetch recipes error:', e);
    }
  };
  fetchRecipes();
}, []);

useEffect(() => {
  const fetchGrocery = async () => {
    try {
      const userId = pb.authStore.model?.id;
      if (!userId) return;
      const res = await pb.collection('meal_slots').getList(1, 200, {
        filter: `meal_plan.user = "${userId}" && date >= "${weekStart}" && date <= "${weekEnd}"`,
        expand: 'recipe',
      });
      const itemMap = new Map();
      for (const slot of res.items) {
        const recipe = slot.expand?.recipe;
        if (!recipe) continue;
        const multiplier = slot.servings_multiplier || 1;
        let ingList = [];
        if (typeof recipe.ingredients === 'string') {
          try { ingList = JSON.parse(recipe.ingredients); } catch { ingList = []; }
        } else if (Array.isArray(recipe.ingredients)) {
          ingList = recipe.ingredients;
        }
        for (const ing of ingList) {
          if (!ing.name?.trim()) continue;
          const key = ing.name.toLowerCase().trim();
          const qty = (parseFloat(ing.quantity) || 0) * multiplier;
          if (itemMap.has(key)) {
            itemMap.get(key).qty += qty;
          } else {
            itemMap.set(key, { name: ing.name.trim(), qty, unit: ing.unit || '' });
          }
        }
      }
      setGroceryItems(Array.from(itemMap.values()).slice(0, 12));
    } catch (e) {
      console.error('Fetch grocery error:', e);
    }
  };
  fetchGrocery();
}, [weekStart, weekEnd]);

  const openModal = (date, mealType) => {
    setActiveCell({ date, mealType });
    setModalOpen(true);
  };

  const handleRecipeSelect = async ({ recipe, servingsMultiplier }) => {
    if (!activeCell) return;
    setSaving(true);
    try {
      const userId = pb.authStore.model?.id;
      const { date, mealType } = activeCell;

      // Get or create meal_plan for this week
      let mealPlan;
      const existing = await pb.collection('meal_plans').getList(1, 1, {
        filter: `user = "${userId}" && week_start_date = "${weekStart}"`,
      });
      if (existing.items.length > 0) {
        mealPlan = existing.items[0];
      } else {
        mealPlan = await pb.collection('meal_plans').create({
          user: userId,
          week_start_date: weekStart,
        });
      }

      await pb.collection('meal_slots').create({
        meal_plan: mealPlan.id,
        date,
        slot: mealType,
        recipe: recipe.id,
        servings_multiplier: servingsMultiplier,
      });

      await fetchSlots();
    } catch (e) {
      console.error('Save slot error:', e);
    } finally {
      setSaving(false);
      setModalOpen(false);
      setActiveCell(null);
    }
  };

  const removeSlot = async (slotId) => {
    try {
      await pb.collection('meal_slots').delete(slotId);
      await fetchSlots();
    } catch (e) {
      console.error('Remove slot error:', e);
    }
  };

  const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const todayCardStyle = { background: 'linear-gradient(135deg, #10b981, #059669)' };
  const slotCardStyle = { backgroundColor: 'rgba(255,255,255,0.15)' };
  const nothingTextStyle = { color: 'rgba(255,255,255,0.5)' };
  const recipeThumbStyle = { backgroundColor: 'rgba(255,255,255,0.2)' };
  const todayMeals = MEAL_TYPES.map(meal => ({
    meal,
    items: slots[`${today}__${meal}`] || []
  }));

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4 py-4 sm:py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Meal Planner</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} –{' '}
            {weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekOffset(w => w - 1)}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft size={18} className="text-gray-600" />
          </button>
          <button
            onClick={() => setWeekOffset(0)}
            className="px-3 py-1.5 text-xs font-medium rounded-xl bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => setWeekOffset(w => w + 1)}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <ChevronRight size={18} className="text-gray-600" />
          </button>
        </div>
      </div>
{/* TODAY SUMMARY CARD */}
<div className="rounded-3xl p-5 text-white shadow-lg mb-5" style={todayCardStyle}>
  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
    <div className="flex-shrink-0">
      <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest mb-0.5">Today</p>
      <h2 className="text-xl font-bold">
        {weekDays.find(d => fmt(d) === today)?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) || 'Today'}
      </h2>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 w-full md:w-auto">
      {todayMeals.map(({ meal, items }) => (
        <div key={meal} className="rounded-2xl p-3" style={slotCardStyle}>
          <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-wider mb-2">
            {MEAL_LABELS[meal]}
          </p>
          {items.length === 0 ? (
            <p className="text-xs italic" style={nothingTextStyle}>Nothing planned</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {items.map(({ slotId, recipe }) => (
                <div key={slotId} className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg overflow-hidden flex-shrink-0" style={recipeThumbStyle}>
                    {recipe?.image_url ? (
                      <img src={recipe.image_url} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Utensils size={12} className="text-white opacity-60" />
                      </div>
                    )}
                  </div>
                  <p className="text-white text-[11px] font-semibold leading-tight line-clamp-2">
                    {recipe?.title}
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
      < div className="flex gap-6 items-start">
       <div className="flex-1 min-w-0">
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-9 h-9 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        /* DESKTOP: full weekly grid */
        <>
          <div className="hidden md:block overflow-x-auto">
           <table className="w-full border-separate border-spacing-1.5 table-fixed">
              <thead>
                <tr>
                  <th className="w-24" />
                  {weekDays.map((d, i) => {
                    const isToday = fmt(d) === today;
                    return (
                      <th key={i} className="text-center pb-1">
                       <div className={`inline-flex flex-col items-center px-3 py-1.5 rounded-xl ${isToday ? 'bg-green-100 text-green-700 border border-green-300' : 'text-gray-500'}`}>
                          <span className="text-xs font-medium">{DAY_NAMES[i]}</span>
                          <span className={`text-base font-bold ${isToday ? '' : 'text-gray-800'}`}>
                            {d.getDate()}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {MEAL_TYPES.map(meal => (
                  <tr key={meal}>
                    <td className="pr-2 py-1 align-top">
                      <div className="text-right">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          {MEAL_LABELS[meal]}
                        </span>
                      </div>
                    </td>
                    {weekDays.map((d, di) => {
                      const date = fmt(d);
                      const key = `${date}__${meal}`;
                      const cellSlots = slots[key] || [];
                      return (
                        <td key={di} className={`align-top rounded-xl ${fmt(d) === today ? 'bg-green-50' : ''}`}>
                          <MealCell
                            date={date}
                            meal={meal}
                            cellSlots={cellSlots}
                            onAdd={() => openModal(date, meal)}
                            onRemove={removeSlot}
                            saving={saving}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBILE: day selector + vertical meal cards */}
          <div className="md:hidden">
            {/* Day strip */}
            <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-hide">
              {weekDays.map((d, i) => {
                const date = fmt(d);
                const isToday = date === today;
                const isSelected = date === selectedDay;
                const hasAny = MEAL_TYPES.some(m => (slots[`${date}__${m}`] || []).length > 0);
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDay(date)}
                    className={`flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-xl transition-all ${
                      isSelected
                        ? 'bg-green-500 text-white shadow-md'
                        : isToday
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-white text-gray-600 border border-gray-100'
                    }`}
                  >
                    <span className="text-xs font-medium">{DAY_NAMES[i]}</span>
                    <span className="text-base font-bold">{d.getDate()}</span>
                    {hasAny && (
                      <div className={`w-1 h-1 rounded-full mt-0.5 ${isSelected ? 'bg-white' : 'bg-green-400'}`} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Meal cards for selected day */}
            <div className="space-y-3">
              {MEAL_TYPES.map(meal => {
                const key = `${selectedDay}__${meal}`;
                const cellSlots = slots[key] || [];
                return (
                  <div key={meal} className={`bg-gradient-to-r ${MEAL_COLORS[meal]} border rounded-2xl p-3`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700">
                        {MEAL_LABELS[meal]}
                      </span>
                      <button
                        onClick={() => openModal(selectedDay, meal)}
                        className="w-7 h-7 rounded-full bg-white shadow-sm flex items-center justify-center hover:bg-green-50 transition-colors"
                      >
                        <Plus size={14} className="text-green-600" />
                      </button>
                    </div>
                    {cellSlots.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">No recipes added</p>
                    ) : (
                      <div className="space-y-2">
                        {cellSlots.map(({ slotId, recipe, servings_multiplier }) => (
                          <MobileRecipeCard
                            key={slotId}
                            recipe={recipe}
                            servings={servings_multiplier}
                            onRemove={() => removeSlot(slotId)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
             </>
    )}
  </div>  {/* closes flex-1 main column */}

  {/* Sidebar */}
  <div className="hidden lg:flex flex-col gap-4 w-72 flex-shrink-0">
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
        <h3 className="font-bold text-gray-800 text-sm">🛒 This Week's Shopping</h3>
        <a href="/grocery-list" className="text-xs text-green-600 font-medium hover:underline">See all</a>
      </div>
      {groceryItems.length === 0 ? (
        <p className="text-xs text-gray-400 italic p-4">Add meals to generate your list</p>
      ) : (
        <ul className="divide-y divide-gray-50">
          {groceryItems.map((item, i) => (
            <li
              key={i}
              className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setCheckedItems(prev => ({ ...prev, [i]: !prev[i] }))}
            >
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${checkedItems[i] ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                {checkedItems[i] && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className={`flex-1 text-xs transition-colors ${checkedItems[i] ? 'line-through text-gray-300' : 'text-gray-700'}`}>
                {item.name}
              </span>
              {item.qty > 0 && (
                <span className={`text-xs flex-shrink-0 ${checkedItems[i] ? 'text-gray-300' : 'text-gray-400'}`}>
                  {parseFloat(item.qty.toFixed(1))} {item.unit}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>

    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
        <h3 className="font-bold text-gray-800 text-sm">⭐ Recent Recipes</h3>
        <a href="/recipes" className="text-xs text-green-600 font-medium hover:underline">See all</a>
      </div>
      <div className="divide-y divide-gray-50">
        {featuredRecipes.map(recipe => (
          <a
            key={recipe.id}
            href={`/recipes/${recipe.id}`}
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
          >
            <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 bg-emerald-50 flex items-center justify-center">
              {recipe.image_url ? (
                <img src={recipe.image_url} className="w-full h-full object-cover" alt={recipe.title} />
              ) : (
                <Utensils size={14} className="text-emerald-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-800 truncate">{recipe.title}</p>
              <p className="text-[10px] text-gray-400">{recipe.servings} servings</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  </div>

</div>  {/* closes flex gap-6 wrapper */}

      )}

      <RecipePickerModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setActiveCell(null);
        onSelect={handleRecipeSelect}
      />
    </div>
  );
}

function MealCell({ date, meal, cellSlots, onAdd, onRemove, saving }) {
  return (
    <div className="min-h-[70px] bg-white border border-gray-100 rounded-xl p-1.5 flex flex-col gap-1 group hover:border-green-200 transition-colors">
      {cellSlots.map(({ slotId, recipe, servings_multiplier }) => (
        <DesktopRecipeCard
          key={slotId}
          recipe={recipe}
          servings={servings_multiplier}
          onRemove={() => onRemove(slotId)}
        />
      ))}
      <button
        onClick={onAdd}
        disabled={saving}
        className="flex items-center justify-center w-full mt-auto py-1 rounded-lg border border-dashed border-gray-200 hover:border-green-400 hover:bg-green-50 transition-colors group/btn"
      >
        <Plus size={14} className="text-gray-300 group-hover/btn:text-green-500 transition-colors" />
      </button>
    </div>
  );
}

function DesktopRecipeCard({ recipe, servings, onRemove }) {
  const [imgError, setImgError] = useState(false);
  if (!recipe) return null;
  const proxied = !imgError && recipe.image_url ? getProxiedImage(recipe.image_url) : null;

  return (
    <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-1.5 py-1 group/card relative">
      {proxied ? (
        <img
          src={proxied}
          alt={recipe.title}
          className="w-7 h-7 rounded-md object-cover flex-shrink-0"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="w-7 h-7 rounded-md bg-green-100 flex items-center justify-center flex-shrink-0">
          <Utensils size={12} className="text-green-500" />
        </div>
      )}
     <span className="text-xs text-gray-700 font-medium leading-tight flex-1 line-clamp-2" title={recipe.title}>
        {recipe.title}
      </span>
      {servings > 1 && (
        <span className="text-[10px] text-green-600 font-semibold flex-shrink-0">{servings}x</span>
      )}
      <button
        onClick={onRemove}
        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white hidden group-hover/card:flex items-center justify-center shadow-sm"
      >
        <X size={9} strokeWidth={3} />
      </button>
    </div>
  );
}

function MobileRecipeCard({ recipe, servings, onRemove }) {
  const [imgError, setImgError] = useState(false);
  if (!recipe) return null;
  const proxied = !imgError && recipe.image_url ? getProxiedImage(recipe.image_url) : null;

  return (
    <div className="flex items-center gap-2 bg-white rounded-xl px-2.5 py-2 shadow-sm">
      {proxied ? (
        <img
          src={proxied}
          alt={recipe.title}
          className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
          <Utensils size={14} className="text-green-500" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{recipe.title}</p>
        {servings > 1 && (
          <p className="text-xs text-green-600">{servings}x serving</p>
        )}
      </div>
      <button
        onClick={onRemove}
        className="w-6 h-6 rounded-full hover:bg-red-50 flex items-center justify-center transition-colors flex-shrink-0"
      >
        <X size={13} className="text-red-400" />
      </button>
    </div>
  );
}
