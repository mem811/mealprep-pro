import { useState, useEffect } from 'react';
import pb from '../lib/pb';

// --- Unit normalization map ---
const UNIT_NORMALIZE = {
  teaspoons: 'teaspoon', tsp: 'teaspoon', tsps: 'teaspoon',
  tablespoons: 'tablespoon', tbsp: 'tablespoon', tbsps: 'tablespoon', tbs: 'tablespoon',
  cups: 'cup',
  ounces: 'oz', ounce: 'oz',
  pounds: 'lb', pound: 'lb',
  milliliters: 'ml', milliliter: 'ml', mls: 'ml',
  liters: 'liter', litres: 'liter', l: 'liter',
  grams: 'g', gram: 'g', grammes: 'g',
  kilograms: 'kg', kilogram: 'kg',
  inches: 'inch',
  cloves: 'clove',
  slices: 'slice',
  pieces: 'piece',
  sprigs: 'sprig',
};

function normalizeUnit(unit) {
  if (!unit) return '';
  const lower = unit.toLowerCase().trim();
  return UNIT_NORMALIZE[lower] || lower;
}

function normalizeName(name) {
  if (!name) return '';
  let n = name.toLowerCase().trim();
  if (n.endsWith('es') && n.length > 4) n = n.slice(0, -2);
  else if (n.endsWith('s') && n.length > 3) n = n.slice(0, -1);
  return n;
}

function toTitleCase(str) {
  return str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
}

function pluralizeUnit(unit, qty) {
  if (!unit || qty <= 1) return unit;
  const irregular = { oz: 'oz', lb: 'lb', g: 'g', kg: 'kg', ml: 'ml' };
  if (irregular[unit]) return unit;
  if (unit.endsWith('s')) return unit;
  return unit + 's';
}

function formatQty(qty) {
  if (qty === Math.floor(qty)) return String(qty);
  return parseFloat(qty.toFixed(2)).toString();
}

// --- Gram conversions (g → cup) for common ingredients ---
const GRAM_CONVERSIONS = {
  flour:          { gPerCup: 120,  unit: 'cup' },
  'all-purpose flour': { gPerCup: 120, unit: 'cup' },
  'bread flour':  { gPerCup: 120,  unit: 'cup' },
  'cake flour':   { gPerCup: 100,  unit: 'cup' },
  sugar:          { gPerCup: 200,  unit: 'cup' },
  'granulated sugar': { gPerCup: 200, unit: 'cup' },
  'white sugar':  { gPerCup: 200,  unit: 'cup' },
  'brown sugar':  { gPerCup: 220,  unit: 'cup' },
  'powdered sugar': { gPerCup: 120, unit: 'cup' },
  'icing sugar':  { gPerCup: 120,  unit: 'cup' },
  'confectioners sugar': { gPerCup: 120, unit: 'cup' },
  butter:         { gPerCup: 227,  unit: 'cup' },
  milk:           { gPerCup: 240,  unit: 'cup' },
  water:          { gPerCup: 240,  unit: 'cup' },
  cream:          { gPerCup: 240,  unit: 'cup' },
  'heavy cream':  { gPerCup: 240,  unit: 'cup' },
  'sour cream':   { gPerCup: 240,  unit: 'cup' },
  yogurt:         { gPerCup: 240,  unit: 'cup' },
  oil:            { gPerCup: 218,  unit: 'cup' },
  'olive oil':    { gPerCup: 218,  unit: 'cup' },
  'vegetable oil': { gPerCup: 218, unit: 'cup' },
  honey:          { gPerCup: 340,  unit: 'cup' },
  'cocoa powder': { gPerCup: 100,  unit: 'cup' },
  oats:           { gPerCup: 90,   unit: 'cup' },
  'rolled oats':  { gPerCup: 90,   unit: 'cup' },
  rice:           { gPerCup: 185,  unit: 'cup' },
  'white rice':   { gPerCup: 185,  unit: 'cup' },
  'brown rice':   { gPerCup: 185,  unit: 'cup' },
};

// ml → cup (liquids sometimes stored as ml)
const ML_CONVERSIONS = {
  milk:          240,
  water:         240,
  cream:         240,
  'heavy cream': 240,
  oil:           240,
  'olive oil':   240,
  'vegetable oil': 240,
  honey:         340,
};

function tryConvertToUS(name, qty, unit) {
  const normUnit = normalizeUnit(unit);
  const lowerName = name.toLowerCase().trim();

  // g → cup conversion
  if (normUnit === 'g' || normUnit === 'gram') {
    const conv = GRAM_CONVERSIONS[lowerName];
    if (conv) {
      const cups = qty / conv.gPerCup;
      return { qty: cups, unit: 'cup', converted: true };
    }
  }

  // ml → cup conversion
  if (normUnit === 'ml') {
    const mlPerCup = ML_CONVERSIONS[lowerName] || 240;
    const cups = qty / mlPerCup;
    return { qty: cups, unit: 'cup', converted: true };
  }

  return { qty, unit: normUnit || unit, converted: false };
}

// --- Category detection ---
const CATEGORIES = {
  Produce: ['tomato', 'onion', 'garlic', 'lettuce', 'spinach', 'carrot', 'celery', 'pepper', 'cucumber', 'broccoli', 'zucchini', 'mushroom', 'potato', 'sweet potato', 'avocado', 'lemon', 'lime', 'apple', 'banana', 'berry', 'strawberry', 'blueberry', 'raspberry', 'orange', 'mango', 'pineapple', 'grape', 'kale', 'cabbage', 'corn', 'pea', 'bean', 'herb', 'basil', 'parsley', 'cilantro', 'mint', 'thyme', 'rosemary', 'ginger', 'scallion', 'leek', 'shallot', 'arugula', 'asparagus', 'beet', 'cauliflower', 'eggplant', 'radish', 'turnip', 'squash', 'pumpkin'],
  'Dairy & Eggs': ['milk', 'cream', 'butter', 'cheese', 'yogurt', 'egg', 'sour cream', 'heavy cream', 'cream cheese', 'parmesan', 'mozzarella', 'cheddar', 'ricotta', 'cottage cheese', 'half and half', 'ghee'],
  'Meat & Seafood': ['chicken', 'beef', 'pork', 'turkey', 'lamb', 'salmon', 'tuna', 'shrimp', 'fish', 'bacon', 'sausage', 'ham', 'steak', 'ground beef', 'ground turkey', 'duck', 'crab', 'lobster', 'scallop', 'anchovy', 'sardine', 'tilapia', 'cod', 'halibut'],
  Pantry: ['flour', 'sugar', 'salt', 'pepper', 'oil', 'vinegar', 'sauce', 'paste', 'stock', 'broth', 'rice', 'pasta', 'bread', 'crumb', 'oat', 'cereal', 'honey', 'syrup', 'cocoa', 'chocolate', 'vanilla', 'baking', 'yeast', 'powder', 'spice', 'cumin', 'paprika', 'turmeric', 'cinnamon', 'oregano', 'soy sauce', 'olive oil', 'coconut', 'almond', 'walnut', 'pecan', 'cashew', 'peanut', 'sesame', 'lentil', 'chickpea', 'quinoa', 'tortilla', 'cracker', 'chip', 'nut', 'seed', 'dried', 'canned', 'tomato paste', 'mustard', 'ketchup', 'mayo', 'worcestershire'],
};

function categorize(name) {
  const lower = name.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORIES)) {
    if (keywords.some(k => lower.includes(k))) return cat;
  }
  return 'Other';
}

function getWeekRange() {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = d => d.toISOString().split('T')[0];
  return { weekStart: fmt(monday), weekEnd: fmt(sunday) };
}

export default function GroceryListPage() {
  const [ingredients, setIngredients] = useState([]);
  const [checked, setChecked] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [collapsed, setCollapsed] = useState({});

 useEffect(() => {
  fetchAndAggregate();
}, []);

const fetchAndAggregate = async () => {
  const isRefresh = !loading;
  setRefreshing(isRefresh);
  setLoading(true);
  setError('');
  try {
      const { weekStart, weekEnd } = getWeekRange();
      const userId = pb.authStore.model?.id;

      const result = await pb.collection('meal_slots').getList(1, 200, {
        filter: `meal_plan.user = "${userId}" && date >= "${weekStart}" && date <= "${weekEnd}"`,
        expand: 'recipe',
      });

      const allIngredients = [];

      for (const slot of result.items) {
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
          const rawQty = parseFloat(ing.quantity) || 0;
          const scaledQty = rawQty * multiplier;

          // Try best-effort gram/ml → US conversion
          const { qty, unit } = tryConvertToUS(ing.name, scaledQty, ing.unit || '');

          allIngredients.push({
            name: ing.name.trim(),
            qty,
            unit,
          });
        }
      }

      // Merge duplicates
      const mergeMap = new Map();

      for (const ing of allIngredients) {
        const normName = normalizeName(ing.name);
        const normUnit = normalizeUnit(ing.unit);
        const key = `${normName}||${normUnit}`;

        if (mergeMap.has(key)) {
          const existing = mergeMap.get(key);
          existing.qty += ing.qty;
        } else {
          mergeMap.set(key, {
            displayName: toTitleCase(ing.name),
            normName,
            qty: ing.qty,
            unit: ing.unit,
            normUnit,
            category: categorize(ing.name),
          });
        }
      }

      // Group same normName with different units
      const nameGroups = new Map();
      for (const [, item] of mergeMap) {
        if (!nameGroups.has(item.normName)) nameGroups.set(item.normName, []);
        nameGroups.get(item.normName).push(item);
      }

      const finalList = [];
      for (const [, variants] of nameGroups) {
        if (variants.length === 1) {
          finalList.push({ ...variants[0], hasVariants: false });
        } else {
          // Multiple units — keep separate but mark as siblings
          const displayName = variants[0].displayName;
          variants.forEach((v, i) => {
            finalList.push({ ...v, displayName, isVariant: i > 0, hasVariants: true });
          });
        }
      }

      finalList.sort((a, b) => a.displayName.localeCompare(b.displayName));
      setIngredients(finalList);
    } catch (err) {
      console.error(err);
      setError('Failed to load grocery list. Make sure you have a meal plan for this week.');
    } finally {
  setLoading(false);
  setRefreshing(false);
}
  };

  const toggleCheck = (key) => setChecked(prev => ({ ...prev, [key]: !prev[key] }));
  const toggleCollapse = (cat) => setCollapsed(prev => ({ ...prev, [cat]: !prev[cat] }));

  const grouped = ingredients.reduce((acc, ing) => {
    const cat = ing.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(ing);
    return acc;
  }, {});

  const categoryOrder = ['Produce', 'Dairy & Eggs', 'Meat & Seafood', 'Pantry', 'Other'];
  const checkedCount = Object.values(checked).filter(Boolean).length;
  const total = ingredients.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Grocery List</h1>
          <p className="text-sm text-gray-500 mt-0.5">From this week's meal plan</p>
        </div>
        <button
          onClick={fetchAndAggregate}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-green-600 border border-green-200 rounded-lg hover:bg-green-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-sm text-red-600">{error}</div>
      )}

      {/* Progress bar */}
      {total > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-5">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>{checkedCount} of {total} items checked</span>
            <span className="font-medium text-green-600">{Math.round((checkedCount / total) * 100)}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-300"
              style={{ width: `${(checkedCount / total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {ingredients.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="text-5xl mb-3">🛒</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-1">No items yet</h3>
          <p className="text-sm text-gray-400">Add recipes to your weekly meal plan to generate a grocery list.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {categoryOrder.filter(cat => grouped[cat]?.length > 0).map(cat => (
            <div key={cat} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <button
                onClick={() => toggleCollapse(cat)}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
              >
                <span className="font-semibold text-gray-800 text-sm">{cat}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{grouped[cat].length} items</span>
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${collapsed[cat] ? '' : 'rotate-180'}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {!collapsed[cat] && (
                <ul className="divide-y divide-gray-50">
                  {grouped[cat].map((ing, idx) => {
                    const key = `${ing.normName}||${ing.normUnit}||${idx}`;
                    const isChecked = checked[key];
                    const displayQty = formatQty(ing.qty);
                    const displayUnit = pluralizeUnit(ing.unit || ing.normUnit, ing.qty);

                    return (
                      <li
                        key={key}
                        className={`flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${ing.isVariant ? 'pl-9' : ''}`}
                        onClick={() => toggleCheck(key)}
                      >
                        <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isChecked ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                          {isChecked && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className={`flex-1 text-sm transition-colors ${isChecked ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                          {ing.displayName}
                        </span>
                        <span className={`text-sm font-medium transition-colors ${isChecked ? 'text-gray-300' : 'text-gray-500'}`}>
                          {displayQty} {displayUnit}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
