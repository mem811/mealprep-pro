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
        filter: `user_id = "${user.id}"`,
        sort: '-created',
      });
      return result.items;
    },
    enabled: !!user,
  });

  const filtered = recipes.filter((r) =>
    r.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleConfirm = () => {
    if (selected) onSelect(selected.id, multiplier);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-0 sm:px-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[85vh] flex flex-col">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 text-lg">Pick a Recipe</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 pt-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search recipes…"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent bg-gray-50 text-sm placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Recipe List */}
        <div className="flex-1 overflow-y-auto px-5 py-2 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 text-green-400 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <UtensilsCrossed className="w-10 h-10 text-gray-200 mb-2" />
              <p className="text-sm text-gray-400">
                {search ? 'No matching recipes' : 'No recipes yet'}
              </p>
            </div>
          ) : (
            filtered.map((recipe) => (
              <button
                key={recipe.id}
                onClick={() => setSelected(recipe)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                  selected?.id === recipe.id
                    ? 'border-green-400 bg-green-50'
                    : 'border-transparent bg-gray-50 hover:bg-gray-100'
                }`}
              >
                {recipe.image_url ? (
                  <img
                    src={recipe.image_url}
                    alt={recipe.title}
                    className="w-12 h-12 rounded-xl object-cover shrink-0"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                    <UtensilsCrossed className="w-5 h-5 text-green-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{recipe.title}</p>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                    <Users className="w-3 h-3" />
                    {recipe.servings} servings
                  </p>
                </div>
                {selected?.id === recipe.id && (
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            ))
          )}
        </div>

        {/* Multiplier + Confirm */}
        {selected && (
          <div className="px-5 py-4 border-t border-gray-100 space-y-3">
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">Servings multiplier</p>
              <div className="flex gap-2">
                {MULTIPLIERS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setMultiplier(m)}
                    className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${
                      multiplier === m
                        ? 'bg-green-500 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {m}×
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={handleConfirm}
              className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition-colors shadow-sm"
            >
              Add {selected.title} ({multiplier}× servings)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}