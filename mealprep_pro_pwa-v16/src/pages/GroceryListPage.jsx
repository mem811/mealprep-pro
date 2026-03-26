import React, { useState, useEffect } from 'react';
import pb from '../lib/pb';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { motion, AnimatePresence } from 'framer-motion';

const { FiShoppingBag, FiCheckCircle, FiCircle, FiRotateCcw, FiTrash2, FiPrinter, FiChevronDown, FiInfo } = FiIcons;

const CATEGORIES = {
  Produce: ['tomato', 'onion', 'garlic', 'lettuce', 'spinach', 'carrot', 'pepper', 'cucumber', 'broccoli', 'kale', 'apple', 'banana', 'lemon', 'lime', 'herb', 'basil', 'parsley', 'cilantro'],
  Dairy: ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'egg', 'parmesan', 'mozzarella'],
  'Meat & Seafood': ['chicken', 'beef', 'pork', 'turkey', 'fish', 'salmon', 'shrimp', 'steak', 'bacon'],
  Bakery: ['bread', 'bun', 'tortilla', 'wrap', 'bagel', 'croissant', 'flour'],
  Pantry: ['oil', 'vinegar', 'sugar', 'salt', 'spice', 'sauce', 'pasta', 'rice', 'honey', 'syrup', 'canned', 'stock', 'broth'],
  Frozen: ['frozen', 'ice cream', 'peas', 'corn', 'pizza'],
  Beverages: ['water', 'soda', 'juice', 'coffee', 'tea', 'wine', 'beer'],
  Other: []
};

function categorize(name) {
  const lower = name.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORIES)) {
    if (keywords.some(k => lower.includes(k))) return cat;
  }
  return 'Other';
}

export default function GroceryListPage() {
  const [ingredients, setIngredients] = useState([]);
  const [recipeFrequency, setRecipeFrequency] = useState({});
  const [checkedItems, setCheckedItems] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState({});

  useEffect(() => {
    fetchAggregatedList();
  }, []);

  const fetchAggregatedList = async () => {
    setLoading(true);
    try {
      const userId = pb.authStore.model?.id;
      if (!userId) return;
      const res = await pb.collection('meal_slots').getList(1, 200, {
        filter: `meal_plan.user="${userId}"`,
        expand: 'recipe',
      });

      const aggregated = {};
      const uniqueRecipes = new Map(); // Track unique recipe info and counts
      const processedRecipeIds = new Set(); // For Fix 5: Count ingredients once per unique recipe

      res.items.forEach(slot => {
        const recipe = slot.expand?.recipe;
        if (!recipe) return;

        // Track frequency for Fix 5
        const count = uniqueRecipes.get(recipe.id)?.count || 0;
        uniqueRecipes.set(recipe.id, { 
          title: recipe.title, 
          count: count + 1 
        });

        // Fix 5: If we've already added this recipe's ingredients, skip
        if (processedRecipeIds.has(recipe.id)) return;
        processedRecipeIds.add(recipe.id);

        let ingList = [];
        try {
          ingList = typeof recipe.ingredients === 'string' ? JSON.parse(recipe.ingredients) : (recipe.ingredients || []);
        } catch { ingList = []; }

        ingList.forEach(ing => {
          const name = (ing.name || '').toLowerCase().trim();
          if (!name) return; // Fix 1: Skip blank ingredients

          const unit = (ing.unit || '').toLowerCase().trim() || 'pcs';
          // Since we count once per recipe, we use the base multiplier (could be 1 or recipe default)
          const qty = (parseFloat(ing.quantity) || 0); 
          const key = `${name}-${unit}`;

          if (aggregated[key]) {
            aggregated[key].quantity += qty;
          } else {
            aggregated[key] = { 
              name: ing.name, 
              quantity: qty, 
              unit, 
              category: categorize(ing.name) 
            };
          }
        });
      });

      setIngredients(Object.values(aggregated));
      setRecipeFrequency(Object.fromEntries(uniqueRecipes));
    } catch (e) {
      console.error('Grocery error:', e);
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (name) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(name)) newChecked.delete(name);
    else newChecked.add(name);
    setCheckedItems(newChecked);
  };

  const toggleCollapse = (cat) => {
    setCollapsed(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const grouped = ingredients.reduce((acc, ing) => {
    if (!acc[ing.category]) acc[ing.category] = [];
    acc[ing.category].push(ing);
    return acc;
  }, {});

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-20 px-4">
      <style>{`
        @media print {
          nav, aside, button, header, .no-print { display: none !important; }
          body { background: white !important; padding: 0 !important; }
          .print-list { display: block !important; width: 100% !important; margin: 0 !important; }
          .category-block { break-inside: avoid; border-bottom: 1px solid #eee; padding: 20px 0; }
        }
      `}</style>

      <header className="flex items-center justify-between no-print">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Grocery List</h1>
          <p className="text-gray-500">Optimized for your weekly meal plan</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handlePrint} className="p-3 text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all">
            <SafeIcon icon={FiPrinter} className="w-5 h-5" />
          </button>
          <button onClick={() => setCheckedItems(new Set())} className="p-3 text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all">
            <SafeIcon icon={FiRotateCcw} className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Fix 5: Recipe Frequency Note */}
      {Object.keys(recipeFrequency).length > 0 && (
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm no-print">
          <h4 className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
            <SafeIcon icon={FiInfo} className="text-emerald-500" /> Planned Recipes
          </h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(recipeFrequency).map(([id, info]) => (
              <span key={id} className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border border-emerald-100">
                {info.title} {info.count > 1 ? `(×${info.count} this week)` : ''}
              </span>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 mt-4 italic font-medium">
            * Ingredients are counted once per unique recipe to avoid over-shopping duplicates.
          </p>
        </div>
      )}

      <div className="print-list space-y-4">
        {loading ? (
          <div className="p-20 flex justify-center no-print"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div></div>
        ) : ingredients.length > 0 ? (
          Object.entries(grouped).map(([cat, items]) => {
            const checkedCount = items.filter(i => checkedItems.has(i.name)).length;
            const isCollapsed = collapsed[cat];
            
            return (
              <div key={cat} className="category-block bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                <button 
                  onClick={() => toggleCollapse(cat)}
                  className="w-full flex items-center justify-between p-6 bg-gray-50/50 hover:bg-gray-50 transition-colors no-print"
                >
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-gray-900">{cat}</h3>
                    <span className="text-[10px] font-bold bg-white px-2 py-1 rounded-full text-emerald-600 border border-emerald-100 uppercase tracking-widest">
                      {checkedCount}/{items.length}
                    </span>
                  </div>
                  <SafeIcon icon={FiChevronDown} className={`w-5 h-5 text-gray-400 transition-transform ${isCollapsed ? '' : 'rotate-180'}`} />
                </button>
                
                <div className="hidden print:block p-4 border-b">
                  <h3 className="text-xl font-bold uppercase tracking-widest text-emerald-600">{cat}</h3>
                </div>

                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="overflow-hidden divide-y divide-gray-50"
                    >
                      {items.map((item, idx) => {
                        const isChecked = checkedItems.has(item.name);
                        return (
                          <div 
                            key={idx} 
                            className={`p-5 flex items-center justify-between group cursor-pointer transition-colors ${isChecked ? 'bg-gray-50/50' : 'hover:bg-emerald-50/30'}`} 
                            onClick={() => toggleItem(item.name)}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`transition-colors no-print ${isChecked ? 'text-emerald-500' : 'text-gray-300'}`}>
                                {isChecked ? <SafeIcon icon={FiCheckCircle} className="w-6 h-6" /> : <SafeIcon icon={FiCircle} className="w-6 h-6" />}
                              </div>
                              <div className="print:flex print:items-center print:gap-3">
                                <div className="hidden print:block w-4 h-4 border border-gray-300 rounded flex-shrink-0" />
                                <div>
                                  <span className={`text-lg font-medium transition-all ${isChecked ? 'text-gray-400 line-through' : 'text-gray-900'} print:text-base`}>
                                    {item.name}
                                  </span>
                                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mt-0.5">
                                    {parseFloat(item.quantity.toFixed(2))} {item.unit}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        ) : (
          <div className="p-20 flex flex-col items-center justify-center text-gray-400 text-center no-print">
            <SafeIcon icon={FiShoppingBag} className="w-16 h-16 mb-4 opacity-20" />
            <p className="font-medium text-lg">Empty List</p>
            <p className="text-sm">Assign recipes to your planner to see items</p>
          </div>
        )}
      </div>

      {ingredients.length > 0 && (
        <button 
          onClick={() => {
            if(confirm('Clear all items from your checklist?')) setCheckedItems(new Set());
          }}
          className="w-full bg-white border-2 border-gray-100 text-gray-400 py-4 rounded-2xl font-bold hover:bg-rose-50 hover:text-rose-500 hover:border-rose-100 transition-all flex items-center justify-center gap-2 no-print"
        >
          <SafeIcon icon={FiTrash2} className="w-5 h-5" />
          Reset Checklist
        </button>
      )}
    </div>
  );
}