"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ShoppingBasket, CheckCircle2, Circle, Trash2, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';

export default function GroceryListPage() {
  const [ingredients, setIngredients] = useState([]);
  const [checkedItems, setCheckedItems] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAggregatedList();
  }, []);

  const fetchAggregatedList = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // In a real app, we'd join meal_slots with recipes and aggregate JSONB
    // For demo, we'll fetch recipes from the user's library and mock aggregation
    const { data } = await supabase
      .from('recipes')
      .select('ingredients')
      .eq('user_id', user.id);

    if (data) {
      const allIngredients = data.flatMap(r => r.ingredients || []);
      // Basic aggregation logic
      const aggregated = allIngredients.reduce((acc, curr) => {
        const key = `${curr.name.toLowerCase()}-${curr.unit.toLowerCase()}`;
        if (acc[key]) {
          acc[key].quantity += Number(curr.quantity);
        } else {
          acc[key] = { ...curr, quantity: Number(curr.quantity) };
        }
        return acc;
      }, {});
      setIngredients(Object.values(aggregated));
    }
    setLoading(false);
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
          <p className="text-gray-500">Automatically compiled from your plan</p>
        </div>
        <button 
          onClick={() => setCheckedItems(new Set())}
          className="p-3 text-gray-400 hover:text-brand-500 hover:bg-brand-50 rounded-xl transition-all"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </header>

      <div className="card divide-y divide-gray-50">
        {ingredients.length > 0 ? (
          ingredients.map((item, idx) => {
            const isChecked = checkedItems.has(item.name);
            return (
              <motion.div 
                key={idx}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`p-5 flex items-center justify-between group cursor-pointer transition-colors ${
                  isChecked ? 'bg-gray-50/50' : 'hover:bg-brand-50/30'
                }`}
                onClick={() => toggleItem(item.name)}
              >
                <div className="flex items-center gap-4">
                  <div className={`transition-colors ${isChecked ? 'text-brand-500' : 'text-gray-300'}`}>
                    {isChecked ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                  </div>
                  <div>
                    <span className={`text-lg font-medium transition-all ${
                      isChecked ? 'text-gray-400 line-through' : 'text-gray-900'
                    }`}>
                      {item.name}
                    </span>
                    <p className="text-xs font-bold text-brand-600 uppercase tracking-widest mt-0.5">
                      {item.quantity} {item.unit}
                    </p>
                  </div>
                </div>
                <div className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded">
                  Pantry
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="p-20 flex flex-col items-center justify-center text-gray-400">
            <ShoppingBasket className="w-16 h-16 mb-4 opacity-20" />
            <p className="font-medium text-lg">Your list is empty</p>
            <p className="text-sm">Add some recipes to your planner first</p>
          </div>
        )}
      </div>

      {ingredients.length > 0 && (
        <button className="w-full bg-brand-500 text-white py-4 rounded-2xl font-bold shadow-xl shadow-brand-500/20 hover:bg-brand-600 transition-all flex items-center justify-center gap-2">
          <Trash2 className="w-5 h-5" />
          Clear Completed Items
        </button>
      )}
    </div>
  );
}