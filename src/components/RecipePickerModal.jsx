import React, { useState, useEffect, useRef } from 'react';
import pb from '../lib/pb';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiX, FiSearch, FiPlus, FiMinus, FiCoffee } = FiIcons;

export default function RecipePickerModal({ isOpen, onClose, onSelect }) {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [multiplier, setMultiplier] = useState(1);
  const [selected, setSelected] = useState(null);
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setSelected(null);
    setMultiplier(1);
    setSearch('');
    fetchRecipes();
  }, [isOpen]);

  const fetchRecipes = async () => {
    setLoading(true);
    try {
      const userId = pb.authStore.model?.id;
      if (!userId) return;
      const res = await pb.collection('recipes').getList(1, 50, {
        filter: `user="${userId}"`,
        sort: '-created',
      });
      setRecipes(res.items);
    } catch (e) {
      console.error('Failed to fetch recipes:', e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const filtered = recipes.filter(r => r.title?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div 
      ref={overlayRef} 
      onClick={(e) => e.target === overlayRef.current && onClose()}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
    >
      <div className="bg-white w-full sm:max-w-lg sm:rounded-[2rem] rounded-t-[2rem] shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Add to Plan</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <SafeIcon icon={FiX} className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4">
          <div className="relative">
            <SafeIcon icon={FiSearch} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search your library..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-2 space-y-2">
          {loading ? (
            <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div></div>
          ) : filtered.map(recipe => (
            <button 
              key={recipe.id}
              onClick={() => setSelected(selected?.id === recipe.id ? null : recipe)}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                selected?.id === recipe.id ? 'border-emerald-500 bg-emerald-50' : 'border-gray-50 bg-white hover:border-emerald-100'
              }`}
            >
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-emerald-100 flex-shrink-0">
                {recipe.image_url ? <img src={recipe.image_url} className="w-full h-full object-cover" /> : <SafeIcon icon={FiCoffee} className="w-full h-full p-3 text-emerald-500" />}
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900">{recipe.title}</p>
                <p className="text-xs text-gray-500">{recipe.servings} servings</p>
              </div>
            </button>
          ))}
        </div>

        {selected && (
          <div className="p-6 border-t border-gray-100 bg-gray-50 sm:rounded-b-[2rem]">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold text-gray-700">Scaling</span>
              <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-xl shadow-sm">
                <button onClick={() => setMultiplier(Math.max(0.5, multiplier - 0.5))} className="text-emerald-500"><SafeIcon icon={FiMinus} /></button>
                <span className="font-bold w-12 text-center">{multiplier}x</span>
                <button onClick={() => setMultiplier(multiplier + 0.5)} className="text-emerald-500"><SafeIcon icon={FiPlus} /></button>
              </div>
            </div>
            <button 
              onClick={() => { onSelect({ recipe: selected, servings_multiplier: multiplier }); onClose(); }}
              className="w-full py-4 bg-emerald-500 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all"
            >
              Confirm Selection
            </button>
          </div>
        )}
      </div>
    </div>
  );
}