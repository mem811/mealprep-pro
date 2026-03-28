import { useState, useEffect, useCallback } from 'react';
import pb from '../lib/pb';
import RecipePickerModal from '../components/RecipePickerModal';
import { Plus, ChevronLeft, ChevronRight, X, Utensils } from 'lucide-react';

var MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];
var MEAL_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' };
var MEAL_COLORS = {
  breakfast: 'from-amber-50 to-orange-50 border-amber-200',
  lunch: 'from-green-50 to-emerald-50 border-green-200',
  dinner: 'from-blue-50 to-indigo-50 border-blue-200',
  snack: 'from-purple-50 to-pink-50 border-purple-200',
};

var CATEGORY_MAP = {
  'flour': 'Baking', 'sugar': 'Baking', 'granulated sugar': 'Baking', 'powdered sugar': 'Baking',
  'brown sugar': 'Baking', 'baking powder': 'Baking', 'baking soda': 'Baking', 'cornstarch': 'Baking',
  'vanilla extract': 'Baking', 'cocoa powder': 'Baking', 'chocolate chips': 'Baking', 'yeast': 'Baking',
  'butter': 'Dairy', 'milk': 'Dairy', 'cream': 'Dairy', 'cheese': 'Dairy', 'yogurt': 'Dairy',
  'sour cream': 'Dairy', 'cream cheese': 'Dairy', 'buttermilk': 'Dairy', 'heavy cream': 'Dairy',
  'egg': 'Dairy', 'eggs': 'Dairy',
  'chicken': 'Protein', 'beef': 'Protein', 'pork': 'Protein', 'shrimp': 'Protein', 'fish': 'Protein',
  'salmon': 'Protein', 'turkey': 'Protein', 'bacon': 'Protein', 'sausage': 'Protein', 'tofu': 'Protein',
  'onion': 'Produce', 'garlic': 'Produce', 'tomato': 'Produce', 'tomatoes': 'Produce',
  'lettuce': 'Produce', 'spinach': 'Produce', 'carrot': 'Produce', 'carrots': 'Produce',
  'potato': 'Produce', 'potatoes': 'Produce', 'avocado': 'Produce', 'lemon': 'Produce',
  'lime': 'Produce', 'bell pepper': 'Produce', 'celery': 'Produce', 'cucumber': 'Produce',
  'broccoli': 'Produce', 'mushrooms': 'Produce', 'ginger': 'Produce', 'cilantro': 'Produce',
  'parsley': 'Produce', 'basil': 'Produce', 'green onion': 'Produce',
  'salt': 'Spices', 'pepper': 'Spices', 'cinnamon': 'Spices', 'paprika': 'Spices',
  'cumin': 'Spices', 'oregano': 'Spices', 'thyme': 'Spices', 'nutmeg': 'Spices',
  'chili powder': 'Spices', 'cayenne': 'Spices', 'turmeric': 'Spices', 'bay leaf': 'Spices',
  'ground cinnamon': 'Spices', 'ground nutmeg': 'Spices', 'garlic powder': 'Spices',
  'onion powder': 'Spices', 'red pepper flakes': 'Spices', 'black pepper': 'Spices',
  'olive oil': 'Pantry', 'vegetable oil': 'Pantry', 'soy sauce': 'Pantry', 'vinegar': 'Pantry',
  'honey': 'Pantry', 'maple syrup': 'Pantry', 'rice': 'Pantry', 'pasta': 'Pantry',
  'bread': 'Pantry', 'tortillas': 'Pantry', 'broth': 'Pantry', 'stock': 'Pantry',
  'coconut milk': 'Pantry', 'canned tomatoes': 'Pantry', 'tomato paste': 'Pantry',
  'peanut butter': 'Pantry', 'almond butter': 'Pantry',
};

var CATEGORY_ICONS = {
  'Produce': '🥬', 'Protein': '🥩', 'Dairy': '🥛', 'Baking': '🧁',
  'Spices': '🧂', 'Pantry': '🫙', 'Other': '📦',
};

var CATEGORY_ORDER = ['Produce', 'Protein', 'Dairy', 'Baking', 'Spices', 'Pantry', 'Other'];

function categorizeItem(name) {
  var lower = name.toLowerCase().trim();
  if (CATEGORY_MAP[lower]) return CATEGORY_MAP[lower];
  for (var keyword in CATEGORY_MAP) {
    if (lower.includes(keyword) || keyword.includes(lower)) return CATEGORY_MAP[keyword];
  }
  return 'Other';
}

function getWeekDays(baseDate) {
  var day = baseDate.getDay();
  var monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() - ((day + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, function(_, i) {
    var d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function fmt(d) {
  return d.toISOString().split('T')[0];
}

function getProxiedImage(url) {
  if (!url) return null;
  return 'https://images.weserv.nl/?url=' + encodeURIComponent(url) + '&w=80&h=80&fit=cover&q=80';
}

export default function HomePage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(fmt(new Date()));
  const [slots, setSlots] = useState({});
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeCell, setActiveCell] = useState(null);
  const [saving, setSaving] = useState(false);
  const [featuredRecipes, setFeaturedRecipes] = useState([]);
  const [groceryGroups, setGroceryGroups] = useState([]);
  const [checkedItems, setCheckedItems] = useState({});

  var today = fmt(new Date());
  var baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + weekOffset * 7);
  var weekDays = getWeekDays(baseDate);
  var weekStart = fmt(weekDays[0]);
  var weekEnd = fmt(weekDays[6]);

  var fetchSlots = useCallback(async function() {
    setLoading(true);
    try {
      var userId = pb.authStore.model?.id;
      if (!userId) return;
      var res = await pb.collection('meal_slots').getList(1, 200, {
        filter: 'meal_plan.user = "' + userId + '" && date >= "' + weekStart + '" && date <= "' + weekEnd + '"',
        expand: 'recipe',
      });
      var map = {};
      for (var slot of res.items) {
        var key = slot.date + '__' + slot.slot;
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

  useEffect(function() { fetchSlots(); }, [fetchSlots]);

  useEffect(function() {
    async function fetchRecipes() {
      try {
        var userId = pb.authStore.model?.id;
        if (!userId) return;
        var res = await pb.collection('recipes').getList(1, 6, {
          filter: 'user = "' + userId + '"',
          sort: '-created',
        });
        setFeaturedRecipes(res.items);
      } catch (e) {
        console.error('Fetch recipes error:', e);
      }
    }
    fetchRecipes();
  }, []);

  useEffect(function() {
    async function fetchGrocery() {
      try {
        var userId = pb.authStore.model?.id;
        if (!userId) return;
        var res = await pb.collection('meal_slots').getList(1, 200, {
          filter: 'meal_plan.user = "' + userId + '" && date >= "' + weekStart + '" && date <= "' + weekEnd + '"',
          expand: 'recipe',
        });
        var itemMap = new Map();
        for (var slot of res.items) {
          var recipe = slot.expand?.recipe;
          if (!recipe) continue;
          var multiplier = slot.servings_multiplier || 1;
          var ingList = [];
          if (typeof recipe.ingredients === 'string') {
            try { ingList = JSON.parse(recipe.ingredients); } catch(err) { ingList = []; }
          } else if (Array.isArray(recipe.ingredients)) {
            ingList = recipe.ingredients;
          }
          for (var ing of ingList) {
            if (!ing.name?.trim()) continue;
            var ingKey = ing.name.toLowerCase().trim();
            var qty = (parseFloat(ing.quantity) || 0) * multiplier;
            if (itemMap.has(ingKey)) {
              itemMap.get(ingKey).qty += qty;
            } else {
              itemMap.set(ingKey, {
                name: ing.name.trim(),
                qty: qty,
                unit: ing.unit || '',
                category: categorizeItem(ing.name),
              });
            }
          }
        }

      try {
      var checksRes = await pb.collection('grocery_checks').getList(1, 200, {
        filter: 'user = "' + userId + '" && week_start = "' + weekStart + '"'
        });
      var savedChecks = {};
      for (var c of checksRes.items) {
      savedChecks[c.item_key] = c.checked;
      }
        setCheckedItems(savedChecks);
        } catch (err) {
        console.log('No saved checks found');
        }

        var allItems = Array.from(itemMap.values());
        var grouped = {};
        for (var item of allItems) {
          if (!grouped[item.category]) grouped[item.category] = [];
          grouped[item.category].push(item);
        }
        var sorted = [];
        for (var cat of CATEGORY_ORDER) {
          if (grouped[cat]) {
            sorted.push({ category: cat, icon: CATEGORY_ICONS[cat], items: grouped[cat] });
          }
        }
        setGroceryGroups(sorted);
      } catch (e) {
        console.error('Fetch grocery error:', e);
      }
    }
    fetchGrocery();
  }, [weekStart, weekEnd]);

  var openModal = function(date, mealType) {
    setActiveCell({ date: date, mealType: mealType });
    setModalOpen(true);
  };

  var handleRecipeSelect = async function({ recipe, servingsMultiplier }) {
    if (!activeCell) return;
    setSaving(true);
    try {
      var userId = pb.authStore.model?.id;
      var date = activeCell.date;
      var mealType = activeCell.mealType;
      var mealPlan;
      var existing = await pb.collection('meal_plans').getList(1, 1, {
        filter: 'user = "' + userId + '" && week_start_date = "' + weekStart + '"',
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
        date: date,
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
  async function toggleCheck(itemKey) {
  var next = !checkedItems[itemKey];
  setCheckedItems(function(prev) {
    var copy = Object.assign({}, prev);
    copy[itemKey] = next;
    return copy;
  });
  try {
    var userId = pb.authStore.model?.id;
    var existing = await pb.collection('grocery_checks').getList(1, 1, {
      filter: 'user = "' + userId + '" && week_start = "' + weekStart + '" && item_key = "' + itemKey + '"'
    });
    if (existing.items.length > 0) {
      await pb.collection('grocery_checks').update(existing.items[0].id, { checked: next });
    } else {
      await pb.collection('grocery_checks').create({
        user: userId,
        week_start: weekStart,
        item_key: itemKey,
        checked: next
      });
    }
  } catch (err) {
    console.log('Error saving check: ' + err);
  }
}
  var removeSlot = async function(slotId) {
    try {
      await pb.collection('meal_slots').delete(slotId);
      await fetchSlots();
    } catch (e) {
      console.error('Remove slot error:', e);
    }
  };

  var DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var todayCardStyle = { background: 'linear-gradient(135deg, #10b981, #059669)' };
  var slotCardStyle = { backgroundColor: 'rgba(255,255,255,0.15)' };
  var nothingTextStyle = { color: 'rgba(255,255,255,0.5)' };
  var recipeThumbStyle = { backgroundColor: 'rgba(255,255,255,0.2)' };

  var todayMeals = MEAL_TYPES.map(function(meal) {
    return { meal: meal, items: slots[today + '__' + meal] || [] };
  });

  var getDayNutrition = function(date) {
    var totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    for (var meal of MEAL_TYPES) {
      var key = date + '__' + meal;
      var cellSlots = slots[key] || [];
      for (var s of cellSlots) {
        if (!s.recipe?.nutrition) continue;
        var nut = typeof s.recipe.nutrition === 'string' ? JSON.parse(s.recipe.nutrition) : s.recipe.nutrition;
        var mult = s.servings_multiplier || 1;
        totals.calories += Math.round((nut.calories || 0) * mult);
        totals.protein += Math.round((nut.protein || 0) * mult);
        totals.carbs += Math.round((nut.carbs || 0) * mult);
        totals.fat += Math.round((nut.fat || 0) * mult);
      }
    }
    return totals;
  };

  var todayNutrition = getDayNutrition(today);

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4 py-4 sm:py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Meal Planner</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} –{' '}
            {weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={function() { setWeekOffset(function(w) { return w - 1; }); }} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <ChevronLeft size={18} className="text-gray-600" />
          </button>
          <button onClick={function() { setWeekOffset(0); }} className="px-3 py-1.5 text-xs font-medium rounded-xl bg-green-50 text-green-700 hover:bg-green-100 transition-colors">
            Today
          </button>
          <button onClick={function() { setWeekOffset(function(w) { return w + 1; }); }} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <ChevronRight size={18} className="text-gray-600" />
          </button>
        </div>
      </div>

      <div className="rounded-3xl p-5 text-white shadow-lg mb-5" style={todayCardStyle}>
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex-shrink-0">
            <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest mb-0.5">Today</p>
            <h2 className="text-xl font-bold">
              {weekDays.find(function(d) { return fmt(d) === today; })?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) || 'Today'}
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 w-full md:w-auto">
            {todayMeals.map(function(tm) {
              return (
                <div key={tm.meal} className="rounded-2xl p-3" style={slotCardStyle}>
                  <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-wider mb-2">
                    {MEAL_LABELS[tm.meal]}
                  </p>
                  {tm.items.length === 0 ? (
                    <p className="text-xs italic" style={nothingTextStyle}>Nothing planned</p>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {tm.items.map(function(item) {
                        return (
                          <div key={item.slotId} className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg overflow-hidden flex-shrink-0" style={recipeThumbStyle}>
                              {item.recipe?.image_url ? (
                                <img src={item.recipe.image_url} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Utensils size={12} className="text-white opacity-60" />
                                </div>
                              )}
                            </div>
                            <p className="text-white text-[11px] font-semibold leading-tight line-clamp-2">
                              {item.recipe?.title}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        {todayNutrition.calories > 0 && (
          <div className="flex items-center justify-end gap-4 mt-3 text-emerald-100 text-xs font-bold">
            <span>🔥 {todayNutrition.calories} cal</span>
            <span>P {todayNutrition.protein}g</span>
            <span>C {todayNutrition.carbs}g</span>
            <span>F {todayNutrition.fat}g</span>
          </div>
        )}
      </div>

      <div className="flex gap-6 items-start">
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-9 h-9 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full border-separate border-spacing-1.5 table-fixed">
                  <thead>
                    <tr>
                      <th className="w-24" />
                      {weekDays.map(function(d, i) {
                        var isToday = fmt(d) === today;
                        return (
                          <th key={i} className="text-center pb-1">
                            <div className={'inline-flex flex-col items-center px-3 py-1.5 rounded-xl ' + (isToday ? 'bg-green-100 text-green-700 border border-green-300' : 'text-gray-500')}>
                              <span className="text-xs font-medium">{DAY_NAMES[i]}</span>
                              <span className={'text-base font-bold ' + (isToday ? '' : 'text-gray-800')}>
                                {d.getDate()}
                              </span>
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {MEAL_TYPES.map(function(meal) {
                      return (
                        <tr key={meal}>
                          <td className="pr-2 py-1 align-top">
                            <div className="text-right">
                              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                {MEAL_LABELS[meal]}
                              </span>
                            </div>
                          </td>
                          {weekDays.map(function(d, di) {
                            var date = fmt(d);
                            var key = date + '__' + meal;
                            var cellSlots = slots[key] || [];
                            return (
                              <td key={di} className={'align-top rounded-xl ' + (fmt(d) === today ? 'bg-green-50' : '')}>
                                <MealCell
                                  date={date}
                                  meal={meal}
                                  cellSlots={cellSlots}
                                  onAdd={function() { openModal(date, meal); }}
                                  onRemove={removeSlot}
                                  saving={saving}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                    <tr>
                      <td className="pr-2 py-1 align-top">
                        <div className="text-right">
                          <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide">Daily</span>
                        </div>
                      </td>
                      {weekDays.map(function(d, di) {
                        var nut = getDayNutrition(fmt(d));
                        if (nut.calories === 0) return <td key={di} />;
                        return (
                          <td key={di} className="align-top">
                            <div className="text-center py-2 rounded-xl bg-emerald-50 border border-emerald-100">
                              <div className="text-xs font-bold text-emerald-700">{nut.calories} cal</div>
                              <div className="text-[10px] text-emerald-500 font-medium mt-0.5">
                                P {nut.protein}g · C {nut.carbs}g · F {nut.fat}g
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="md:hidden">
                <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-hide">
                  {weekDays.map(function(d, i) {
                    var date = fmt(d);
                    var isToday = date === today;
                    var isSelected = date === selectedDay;
                    var hasAny = MEAL_TYPES.some(function(m) { return (slots[date + '__' + m] || []).length > 0; });
                    return (
                      <button
                        key={i}
                        onClick={function() { setSelectedDay(date); }}
                        className={'flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-xl transition-all ' + (isSelected ? 'bg-green-500 text-white shadow-md' : isToday ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-white text-gray-600 border border-gray-100')}
                      >
                        <span className="text-xs font-medium">{DAY_NAMES[i]}</span>
                        <span className="text-base font-bold">{d.getDate()}</span>
                        {hasAny && (
                          <div className={'w-1 h-1 rounded-full mt-0.5 ' + (isSelected ? 'bg-white' : 'bg-green-400')} />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-3">
                  {MEAL_TYPES.map(function(meal) {
                    var key = selectedDay + '__' + meal;
                    var cellSlots = slots[key] || [];
                    return (
                      <div key={meal} className={'bg-gradient-to-r ' + MEAL_COLORS[meal] + ' border rounded-2xl p-3'}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-gray-700">
                            {MEAL_LABELS[meal]}
                          </span>
                          <button
                            onClick={function() { openModal(selectedDay, meal); }}
                            className="w-7 h-7 rounded-full bg-white shadow-sm flex items-center justify-center hover:bg-green-50 transition-colors"
                          >
                            <Plus size={14} className="text-green-600" />
                          </button>
                        </div>
                        {cellSlots.length === 0 ? (
                          <p className="text-xs text-gray-400 italic">No recipes added</p>
                        ) : (
                          <div className="space-y-2">
                            {cellSlots.map(function(cs) {
                              return (
                                <MobileRecipeCard
                                  key={cs.slotId}
                                  recipe={cs.recipe}
                                  servings={cs.servings_multiplier}
                                  onRemove={function() { removeSlot(cs.slotId); }}
                                />
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {(function() {
                  var nut = getDayNutrition(selectedDay);
                  if (nut.calories === 0) return null;
                  return (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center mt-3">
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Daily Totals</p>
                      <p className="text-lg font-bold text-emerald-700">{nut.calories} cal</p>
                      <p className="text-xs text-emerald-500 font-medium">
                        P {nut.protein}g · C {nut.carbs}g · F {nut.fat}g
                      </p>
                    </div>
                  );
                })()}
              </div>
            </>
          )}
        </div>

        <div className="hidden lg:flex flex-col gap-4 w-72 flex-shrink-0 sticky top-4 self-start">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
              <h3 className="font-bold text-gray-800 text-sm">🛒 This Week's Shopping</h3>
              <a href="/grocery-list" className="text-xs text-green-600 font-medium hover:underline">See all</a>
            </div>
            {groceryGroups.length === 0 ? (
              <p className="text-xs text-gray-400 italic p-4">Add meals to generate your list</p>
            ) : (
              <div className="max-h-[500px] overflow-y-auto">
                {groceryGroups.map(function(group, gi) {
                  return (
                    <div key={gi}>
                      <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                          {group.icon} {group.category}
                        </span>
                      </div>
                      <ul className="divide-y divide-gray-50">
                        {group.items.map(function(item, i) {
                          var checkKey = item.name.toLowerCase().trim();
                          return (
                            <li
                              key={i}
                              className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors"
                              onClick={function() { toggleCheck(checkKey); }}
                            >
                              <div className={'w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ' + (checkedItems[checkKey] ? 'bg-green-500 border-green-500' : 'border-gray-300')}>
                                {checkedItems[checkKey] && (
                                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                              <span className={'flex-1 text-xs transition-colors ' + (checkedItems[checkKey] ? 'line-through text-gray-300' : 'text-gray-700')}>
                                {item.name}
                              </span>
                              {item.qty > 0 && (
                                <span className={'text-xs flex-shrink-0 ' + (checkedItems[checkKey] ? 'text-gray-300' : 'text-gray-400')}>
                                  {parseFloat(item.qty.toFixed(1))} {item.unit}
                                </span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-800 text-sm">⭐ Recent Recipes</h3>
          <a href="/recipes" className="text-xs text-green-600 font-medium hover:underline">See all</a>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {featuredRecipes.map(function(recipe) {
            var nut = null;
            if (recipe.nutrition) {
              nut = typeof recipe.nutrition === 'string' ? JSON.parse(recipe.nutrition) : recipe.nutrition;
            }
            return (
              <a
                key={recipe.id}
                href={'/recipes/' + recipe.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 hover:shadow-md transition-shadow group"
                title={recipe.title}
              >
                <div className="w-full aspect-square rounded-xl overflow-hidden bg-emerald-50 mb-2 relative">
                  {recipe.image_url ? (
                    <img src={recipe.image_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt={recipe.title} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Utensils size={24} className="text-emerald-300" />
                    </div>
                  )}
                  <div className="absolute bottom-1.5 left-1.5 flex gap-1">
                    {nut && nut.calories > 0 && (
                      <span className="bg-white/90 backdrop-blur-sm text-[9px] font-bold text-emerald-700 px-1.5 py-0.5 rounded-full">
                        🔥 {nut.calories}
                      </span>
                    )}
                    {recipe.cook_time && (
                      <span className="bg-white/90 backdrop-blur-sm text-[9px] font-bold text-gray-600 px-1.5 py-0.5 rounded-full">
                        ⏱ {recipe.cook_time}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs font-semibold text-gray-800 line-clamp-2">{recipe.title}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{recipe.servings} servings</p>
              </a>
            );
          })}
        </div>
      </div>

      <RecipePickerModal
        isOpen={modalOpen}
        onClose={function() { setModalOpen(false); setActiveCell(null); }}
        onSelect={handleRecipeSelect}
      />
    </div>
  );
}

function MealCell({ date, meal, cellSlots, onAdd, onRemove, saving }) {
  return (
    <div className="min-h-[70px] bg-white border border-gray-100 rounded-xl p-1.5 flex flex-col gap-1 group hover:border-green-200 transition-colors">
      {cellSlots.map(function(cs) {
        return (
          <DesktopRecipeCard
            key={cs.slotId}
            recipe={cs.recipe}
            servings={cs.servings_multiplier}
            onRemove={function() { onRemove(cs.slotId); }}
          />
        );
      })}
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
  var proxied = !imgError && recipe.image_url ? getProxiedImage(recipe.image_url) : null;

  return (
    <a href={'/recipes/' + recipe.id} className="flex flex-col items-center gap-1 bg-gray-50 rounded-lg p-1.5 group/card relative hover:bg-green-50 transition-colors" title={recipe.title}>
      {proxied ? (
        <img
          src={proxied}
          alt={recipe.title}
          className="w-full h-12 rounded-md object-cover"
          onError={function() { setImgError(true); }}
        />
      ) : (
        <div className="w-full h-12 rounded-md bg-green-100 flex items-center justify-center">
          <Utensils size={16} className="text-green-500" />
        </div>
      )}
      <span className="text-[10px] text-gray-700 font-medium leading-tight text-center line-clamp-1 w-full">
        {recipe.title}
      </span>
      {servings > 1 && (
        <span className="text-[9px] text-green-600 font-semibold">{servings}x</span>
      )}
      <button 
        onClick={function(e) { e.preventDefault(); e.stopPropagation(); onRemove(); }}
        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white hidden group-hover/card:flex items-center justify-center shadow-sm"
      >
        <X size={9} strokeWidth={3} />
      </button>
    </a>
  );
}

function MobileRecipeCard({ recipe, servings, onRemove }) {
  const [imgError, setImgError] = useState(false);
  if (!recipe) return null;
  var proxied = !imgError && recipe.image_url ? getProxiedImage(recipe.image_url) : null;

  return (
    <a href={'/recipes/' + recipe.id} className="flex items-center gap-2 bg-white rounded-xl px-2.5 py-2 shadow-sm hover:bg-green-50 transition-colors">
      {proxied ? (
        <img
          src={proxied}
          alt={recipe.title}
          className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
          onError={function() { setImgError(true); }}
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
        onClick={function(e) { e.preventDefault(); e.stopPropagation(); onRemove(); }}
        className="w-6 h-6 rounded-full hover:bg-red-50 flex items-center justify-center transition-colors flex-shrink-0"
      >
        <X size={13} className="text-red-400" />
      </button>
    </a>
  );
}
