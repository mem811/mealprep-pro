import { useState, useEffect, useRef } from 'react';
import pb from '../lib/pb';
import { X, Search, Plus, Minus, ChefHat } from 'lucide-react';

const getProxiedImage = (url) => {
  if (!url) return null;
  return `https://images.weserv.nl/?url=${encodeURIComponent(url)}`;
};

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
        filter: `user = "${userId}"`,
        sort: '-created',
      });
      setRecipes(res.items);
    } catch (e) {
      console.error('Failed to fetch recipes:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  const handleSelect = () => {
    if (!selected) return;
    onSelect({ recipe: selected, servings_multiplier: multiplier });
    onClose();
  };

  const filtered = recipes.filter(r =>
    r.title?.toLowerCase().includes(search.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
    >
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Pick a Recipe</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-gray-500 hover:text-gray-700"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-gray-100">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search recipes…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
            />
          </div>
        </div>

        {/* Recipe list */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <ChefHat size={36} className="mb-2 text-gray-300" />
              <p className="text-sm font-medium">No recipes found</p>
              {search && (
                <p className="text-xs mt-1">Try a different search term</p>
              )}
            </div>
          )}

          {!loading && filtered.map(recipe => {
            const isSelected = selected?.id === recipe.id;
            let tags = recipe.tags;
            if (typeof tags === 'string') {
              try { tags = JSON.parse(tags); } catch { tags = []; }
            }

            return (
              <button
                key={recipe.id}
                type="button"
                onClick={() => setSelected(isSelected ? null : recipe)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                  isSelected
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'
                }`}
              >
                {/* Image */}
                <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-green-50 flex items-center justify-center">
                  {recipe.image_url ? (
                    <img
                      src={getProxiedImage(recipe.image_url)}
                      alt={recipe.title}
                      className="w-full h-full object-cover"
                      onError={e => {
                        e.target.style.display = 'none';
                        e.target.parentElement.classList.add('placeholder-shown');
                      }}
                    />
                  ) : (
                    <ChefHat size={22} className="text-green-400" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{recipe.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{recipe.servings} serving{recipe.servings !== 1 ? 's' : ''}</p>
                  {Array.isArray(tags) && tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {tags.slice(0, 2).map(tag => (
                        <span key={tag} className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected checkmark */}
                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Serving multiplier + confirm */}
        {selected && (
          <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">Serving multiplier</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMultiplier(m => Math.max(0.5, m - 0.5))}
                  className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
                >
                  <Minus size={14} />
                </button>
                <span className="text-sm font-bold text-gray-900 w-8 text-center">{multiplier}×</span>
                <button
                  type="button"
                  onClick={() => setMultiplier(m => m + 0.5)}
                  className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSelect}
              className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors text-sm"
            >
              Add {selected.title} to plan
            </button>
          </div>
        )}

        {!selected && (
          <div className="px-5 py-4 border-t border-gray-100">
            <p className="text-center text-sm text-gray-400">Select a recipe above to add it to your plan</p>
          </div>
        )}
      </div>
    </div>
  );
}