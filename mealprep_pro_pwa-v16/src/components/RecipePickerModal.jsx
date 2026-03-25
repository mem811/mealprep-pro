import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import pb from '../lib/pb';
import { X, Search, UtensilsCrossed, Loader2, Users } from 'lucide-react';

const MULTIPLIERS = [1, 2, 3, 4];

export default function RecipePickerModal({ onClose, onSelect }) {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [multiplier, setMultiplier] = useState(1);

  const { data: recipes = [], isLoading } = useQuery({
    queryKey: ['recipes', user?.id],
    queryFn: async () => {
      const result = await pb.collection('recipes').getList(1, 200, {
        filter: `user_id="${user.id}"`,
        sort: '-created',
      });
      return result.items;
    },
    enabled: !!user,
  });

  const filtered = recipes.filter((r) => r.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-0 sm:px-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-bold text-gray-900 text-lg">Pick a Recipe</h2>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 transition-colors"><X className="text-gray-500" /></button>
        </div>
        
        <div className="px-5 pt-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              placeholder="Search recipes…" 
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-green-400 bg-gray-50 text-sm" 
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-2 space-y-2">
          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-green-400" /></div>
          ) : (
            filtered.map((recipe) => (
              <button 
                key={recipe.id} 
                onClick={() => setSelected(recipe)} 
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${selected?.id === recipe.id ? 'border-green-400 bg-green-50' : 'border-transparent bg-gray-50 hover:bg-gray-100'}`}
              >
                {recipe.image_url ? (
                  <img 
                    src={`https://images.weserv.nl/?url=${encodeURIComponent(recipe.image_url)}&w=100&h=100&fit=cover`} 
                    alt="" 
                    className="w-12 h-12 rounded-xl object-cover shrink-0" 
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center shrink-0"><UtensilsCrossed className="text-green-400" /></div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{recipe.title}</p>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><Users className="w-3 h-3" /> {recipe.servings} servings</p>
                </div>
              </button>
            ))
          )}
        </div>

        {selected && (
          <div className="px-5 py-4 border-t space-y-3">
            <div className="flex gap-2">
              {MULTIPLIERS.map((m) => (
                <button key={m} onClick={() => setMultiplier(m)} className={`flex-1 py-2 text-sm font-bold rounded-xl ${multiplier === m ? 'bg-green-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600'}`}>{m}×</button>
              ))}
            </div>
            <button onClick={() => onSelect(selected.id, multiplier)} className="w-full py-3 bg-green-500 text-white font-bold rounded-xl shadow-sm">Add {selected.title}</button>
          </div>
        )}
      </div>
    </div>
  );
}