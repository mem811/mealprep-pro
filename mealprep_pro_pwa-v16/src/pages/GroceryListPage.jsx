import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import pb from '../lib/pb';
import { ShoppingCart, Check, Loader2, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';

const CATEGORIES = {
  Produce: ['lettuce', 'tomato', 'onion', 'garlic', 'pepper', 'carrot', 'celery', 'spinach', 'kale', 'broccoli', 'cucumber', 'zucchini', 'potato', 'sweet potato', 'mushroom', 'lemon', 'lime', 'apple', 'banana', 'berry', 'avocado', 'herb', 'basil', 'cilantro', 'parsley', 'thyme', 'rosemary', 'ginger', 'scallion', 'shallot', 'arugula'],
  Meat: ['chicken', 'beef', 'pork', 'turkey', 'salmon', 'tuna', 'shrimp', 'fish', 'lamb', 'steak', 'bacon', 'sausage', 'ground', 'breast', 'thigh'],
  Dairy: ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'egg', 'mozzarella', 'parmesan', 'cheddar', 'ricotta', 'feta', 'half-and-half', 'sour cream'],
  Pantry: ['flour', 'sugar', 'salt', 'oil', 'vinegar', 'sauce', 'pasta', 'rice', 'bread', 'can', 'bean', 'lentil', 'stock', 'broth', 'honey', 'syrup', 'spice', 'cumin', 'paprika', 'oregano', 'soy', 'mustard', 'mayo', 'ketchup', 'hot sauce', 'noodle', 'oat', 'cereal', 'nut', 'almond', 'cashew', 'walnut', 'peanut'],
};

function categorize(name) {
  const lower = name.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORIES)) {
    if (keywords.some((k) => lower.includes(k))) return cat;
  }
  return 'Other';
}

function getWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0];
}

export default function GroceryListPage() {
  const { user } = useAuth();
  const [checked, setChecked] = useState({});
  const [collapsed, setCollapsed] = useState({});

  const weekStartStr = getWeekStart();

  const { data: groceries = {}, isLoading, refetch } = useQuery({
    queryKey: ['grocery-list', user?.id, weekStartStr],
    queryFn: async () => {
      const plans = await pb.collection('meal_plans').getList(1, 1, {
        filter: `user_id = "${user.id}" && week_start_date = "${weekStartStr}"`,
      });
      if (!plans.items.length) return {};

      const slots = await pb.collection('meal_slots').getList(1, 200, {
        filter: `meal_plan_id = "${plans.items[0].id}"`,
        expand: 'recipe_id',
      });

      const aggregated = {};
      for (const slot of slots.items) {
        const recipe = slot.expand?.recipe_id;
        if (!recipe?.ingredients) continue;
        const mult = slot.servings_multiplier || 1;
        for (const ing of recipe.ingredients) {
          if (!ing.name?.trim()) continue;
          const key = `${ing.name.toLowerCase().trim()}__${ing.unit || ''}`;
          if (aggregated[key]) {
            const existing = aggregated[key];
            const existingNum = parseFloat(existing.quantity) || 0;
            const newNum = (parseFloat(ing.quantity) || 0) * mult;
            existing.quantity = (existingNum + newNum).toString();
          } else {
            aggregated[key] = {
              name: ing.name.trim(),
              quantity: ((parseFloat(ing.quantity) || 0) * mult).toString(),
              unit: ing.unit || '',
              category: categorize(ing.name),
            };
          }
        }
      }

      const byCategory = {};
      for (const item of Object.values(aggregated)) {
        if (!byCategory[item.category]) byCategory[item.category] = [];
        byCategory[item.category].push(item);
      }

      return byCategory;
    },
    enabled: !!user,
  });

  const toggleCheck = (key) => setChecked((p) => ({ ...p, [key]: !p[key] }));
  const toggleCollapse = (cat) => setCollapsed((p) => ({ ...p, [cat]: !p[cat] }));

  const allItems = Object.values(groceries).flat();
  const checkedCount = allItems.filter((i) => checked[`${i.name}__${i.unit}`]).length;

  const categoryOrder = ['Produce', 'Meat', 'Dairy', 'Pantry', 'Other'];
  const sortedCategories = categoryOrder.filter((c) => groceries[c]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-28">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>
            Grocery List
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            This week · {checkedCount}/{allItems.length} items checked
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
          title="Refresh"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-7 h-7 text-green-400 animate-spin" />
        </div>
      ) : allItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-green-50 rounded-3xl flex items-center justify-center mb-4">
            <ShoppingCart className="w-8 h-8 text-green-300" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-1">No items yet</h3>
          <p className="text-sm text-gray-400">Add recipes to your weekly plan to generate a grocery list.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedCategories.map((cat) => {
            const items = groceries[cat] || [];
            const isCollapsed = collapsed[cat];
            const catChecked = items.filter((i) => checked[`${i.name}__${i.unit}`]).length;

            const catColors = {
              Produce: 'text-emerald-600 bg-emerald-50',
              Meat: 'text-red-600 bg-red-50',
              Dairy: 'text-blue-600 bg-blue-50',
              Pantry: 'text-amber-600 bg-amber-50',
              Other: 'text-gray-600 bg-gray-100',
            };

            return (
              <div key={cat} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleCollapse(cat)}
                  className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${catColors[cat]}`}>{cat}</span>
                    <span className="text-sm text-gray-400">{catChecked}/{items.length}</span>
                  </div>
                  {isCollapsed ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  )}
                </button>

                {!isCollapsed && (
                  <div className="divide-y divide-gray-50">
                    {items.map((item) => {
                      const key = `${item.name}__${item.unit}`;
                      const isChecked = checked[key];
                      const qty = parseFloat(item.quantity);
                      const qtyStr = qty && qty > 0
                        ? (qty % 1 === 0 ? qty.toString() : qty.toFixed(1))
                        : '';

                      return (
                        <button
                          key={key}
                          onClick={() => toggleCheck(key)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                        >
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                            isChecked
                              ? 'bg-green-500 border-green-500'
                              : 'border-gray-300 hover:border-green-400'
                          }`}>
                            {isChecked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                          </div>
                          <span className={`flex-1 text-sm font-medium transition-all ${
                            isChecked ? 'line-through text-gray-300' : 'text-gray-700'
                          }`}>
                            {item.name}
                          </span>
                          {(qtyStr || item.unit) && (
                            <span className={`text-xs font-semibold transition-all ${
                              isChecked ? 'text-gray-300' : 'text-gray-500'
                            }`}>
                              {qtyStr}{item.unit ? ` ${item.unit}` : ''}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {checkedCount > 0 && (
            <button
              onClick={() => setChecked({})}
              className="w-full py-3 text-sm text-gray-400 hover:text-gray-600 font-medium transition-colors"
            >
              Clear all checks
            </button>
          )}
        </div>
      )}
    </div>
  );
}