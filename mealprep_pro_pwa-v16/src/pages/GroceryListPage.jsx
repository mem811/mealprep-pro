import { useState, useEffect, useMemo } from 'react';
import pb from '../lib/pb';

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
  'peanut butter': 'Pantry', 'almond butter': 'Pantry'
};

var CATEGORY_ICONS = {
  'Produce': '\u{1F96C}',
  'Protein': '\u{1F969}',
  'Dairy': '\u{1F95B}',
  'Baking': '\u{1F9C1}',
  'Spices': '\u{1F9C2}',
  'Pantry': '\u{1FAD9}',
  'Other': '\u{1F4E6}'
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

export default function GroceryListPage() {
  var [groceryGroups, setGroceryGroups] = useState([]);
  var [checkedItems, setCheckedItems] = useState({});
  var [loading, setLoading] = useState(true);
  var [collapsedCats, setCollapsedCats] = useState({});

  var weekDays = useMemo(function() { return getWeekDays(new Date()); }, []);
  var weekStart = fmt(weekDays[0]);
  var weekEnd = fmt(weekDays[6]);

  async function fetchGrocery() {
    try {
      setLoading(true);
      var userId = pb.authStore.model?.id;
      if (!userId) return;

      var res = await pb.collection('meal_slots').getList(1, 200, {
        filter: 'meal_plan.user = "' + userId + '" && date >= "' + weekStart + '" && date <= "' + weekEnd + '"',
        expand: 'recipe'
      });

      var itemMap = new Map();
      for (var slot of res.items) {
        var recipe = slot.expand?.recipe;
        if (!recipe) continue;
        var multiplier = slot.servings_multiplier || 1;
        var ingList = [];
        if (typeof recipe.ingredients === 'string') {
          try { ingList = JSON.parse(recipe.ingredients); } catch (err) { ingList = []; }
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
              category: categorizeItem(ing.name)
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
          grouped[cat].sort(function(a, b) { return a.name.localeCompare(b.name); });
          sorted.push({ category: cat, icon: CATEGORY_ICONS[cat], items: grouped[cat] });
        }
      }
      setGroceryGroups(sorted);
    } catch (err) {
      console.error('Grocery fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(function() {
    fetchGrocery();
  }, [weekStart, weekEnd]);

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

  function toggleCategory(cat) {
    setCollapsedCats(function(prev) {
      var copy = Object.assign({}, prev);
      copy[cat] = !prev[cat];
      return copy;
    });
  }

  var totalItems = 0;
  var totalChecked = 0;
  for (var g of groceryGroups) {
    for (var itm of g.items) {
      totalItems++;
      if (checkedItems[itm.name.toLowerCase().trim()]) totalChecked++;
    }
  }
  var pct = totalItems > 0 ? Math.round((totalChecked / totalItems) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-gray-800">Grocery List</h1>
        <button
          onClick={fetchGrocery}
          className="flex items-center gap-1 px-3 py-1.5 text-sm border border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition"
        >
          {'\u{1F504}'} Refresh
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-6">From this week's meal plan</p>

      <div className="border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600">{totalChecked + ' of ' + totalItems + ' items checked'}</span>
          <span className="text-green-600 font-medium">{pct + '%'}</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all"
            style= width: pct + '%' 
          ></div>
        </div>
      </div>

      {groceryGroups.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg mb-1">No items yet</p>
          <p className="text-sm">Add meals to your planner to generate a grocery list</p>
        </div>
      )}

      {groceryGroups.map(function(group) {
        var isCollapsed = collapsedCats[group.category];
        return (
          <div key={group.category} className="border border-gray-200 rounded-lg mb-4 overflow-hidden">
            <div
              className="flex items-center justify-between px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition"
              onClick={function() { toggleCategory(group.category); }}
            >
              <span className="font-bold text-gray-700">{group.icon + ' ' + group.category}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-green-600">{group.items.length + ' items'}</span>
                <span className="text-gray-400">{isCollapsed ? '\u25B8' : '\u25BE'}</span>
              </div>
            </div>
            {!isCollapsed && (
              <ul className="divide-y divide-gray-100">
                {group.items.map(function(item, i) {
                  var checkKey = item.name.toLowerCase().trim();
                  var isChecked = !!checkedItems[checkKey];
                  return (
                    <li
                      key={i}
                      className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={function() { toggleCheck(checkKey); }}
                    >
                      <div className={'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ' + (isChecked ? 'bg-green-500 border-green-500' : 'border-gray-300')}>
                        {isChecked && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className={'flex-1 text-sm transition-colors ' + (isChecked ? 'line-through text-gray-300' : 'text-gray-700')}>
                        {item.name}
                      </span>
                      {item.qty > 0 && (
                        <span className={'text-xs flex-shrink-0 ' + (isChecked ? 'text-gray-300' : 'text-gray-500')}>
                          {parseFloat(item.qty.toFixed(1))} {item.unit}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
