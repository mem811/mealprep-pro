import React, { useState, useEffect } from 'react';
import pb from '../lib/pb';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { motion } from 'framer-motion';

const { FiShoppingBag, FiCheckCircle, FiCircle, FiRotateCcw, FiTrash2 } = FiIcons;

// Unit normalization map
const UNIT_NORMALIZE = {
  teaspoons: 'tsp', tsp: 'tsp', tsps: 'tsp',
  tablespoons: 'tbsp', tbsp: 'tbsp', tbsps: 'tbsp',
  cups: 'cup', cup: 'cup', ounces: 'oz', oz: 'oz',
  grams: 'g', g: 'g', kilograms: 'kg', kg: 'kg',
  milliliters: 'ml', ml: 'ml', pieces: 'pcs', pcs: 'pcs'
};

export default function GroceryListPage() {
  const [ingredients, setIngredients] = useState([]);
  const [checkedItems, setCheckedItems] = useState(new Set());
  const [loading, setLoading] = useState(true);

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
      res.items.forEach(slot => {
        const recipe = slot.expand?.recipe;
        if (!recipe) return;

        let ingList = [];
        try {
          ingList = typeof recipe.ingredients === 'string' ? JSON.parse(recipe.ingredients) : (recipe.ingredients || []);
        } catch { ingList = []; }

        ingList.forEach(ing => {
          const name = (ing.name || '').toLowerCase().trim();
          const rawUnit = (ing.unit || '').toLowerCase().trim();
          const unit = UNIT_NORMALIZE[rawUnit] || rawUnit || 'pcs';
          const qty = (parseFloat(ing.quantity) || 0) * (slot.servings_multiplier || 1);

          const key = `${name}-${unit}`;
          if (aggregated[key]) {
            aggregated[key].quantity += qty;
          } else {
            aggregated[key] = { name: ing.name, quantity: qty, unit };
          }
        });
      });

      setIngredients(Object.values(aggregated));
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

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Grocery List</h1>
          <p className="text-gray-500">Aggregated from your current plan</p>
        </div>
        <button onClick={() => setCheckedItems(new Set())} className="p-3 text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all">
          <SafeIcon icon={FiRotateCcw} className="w-5 h-5" />
        </button>
      </header>

      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
        {loading ? (
          <div className="p-20 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div></div>
        ) : ingredients.length > 0 ? (
          ingredients.map((item, idx) => {
            const isChecked = checkedItems.has(item.name);
            return (
              <motion.div 
                key={idx} 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }}
                className={`p-5 flex items-center justify-between group cursor-pointer transition-colors ${isChecked ? 'bg-gray-50/50' : 'hover:bg-emerald-50/30'}`}
                onClick={() => toggleItem(item.name)}
              >
                <div className="flex items-center gap-4">
                  <div className={`transition-colors ${isChecked ? 'text-emerald-500' : 'text-gray-300'}`}>
                    {isChecked ? <SafeIcon icon={FiCheckCircle} className="w-6 h-6" /> : <SafeIcon icon={FiCircle} className="w-6 h-6" />}
                  </div>
                  <div>
                    <span className={`text-lg font-medium transition-all ${isChecked ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                      {item.name}
                    </span>
                    <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mt-0.5">
                      {parseFloat(item.quantity.toFixed(2))} {item.unit}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="p-20 flex flex-col items-center justify-center text-gray-400 text-center">
            <SafeIcon icon={FiShoppingBag} className="w-16 h-16 mb-4 opacity-20" />
            <p className="font-medium text-lg">Empty List</p>
            <p className="text-sm">Assign recipes to your planner to see items</p>
          </div>
        )}
      </div>

      {ingredients.length > 0 && (
        <button className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold shadow-xl shadow-emerald-500/20 hover:bg-emerald-600 transition-all flex items-center justify-center gap-2">
          <SafeIcon icon={FiTrash2} className="w-5 h-5" />
          Clear Checklist
        </button>
      )}
    </div>
  );
}