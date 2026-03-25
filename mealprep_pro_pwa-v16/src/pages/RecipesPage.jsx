import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import pb from '../lib/pb';
import { Link } from 'react-router-dom';
import { 
  Plus, Search, Trash2, Edit2, Loader2, UtensilsCrossed, Clock, Users, Tag, Lock 
} from 'lucide-react';

const FREE_LIMIT = 15;

export default function RecipesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const isPro = user?.plan === 'pro';

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

  const deleteRecipe = useMutation({
    mutationFn: (id) => pb.collection('recipes').delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recipes', user?.id] }),
  });

  const filtered = recipes.filter((r) => 
    r.title.toLowerCase().includes(search.toLowerCase()) || 
    (r.tags || []).some((t) => t.toLowerCase().includes(search.toLowerCase()))
  );

  const atLimit = !isPro && recipes.length >= FREE_LIMIT;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>
            My Recipes
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {recipes.length} recipe{recipes.length !== 1 ? 's' : ''}
            {!isPro && <span className="text-gray-400"> · {FREE_LIMIT - recipes.length} free slots left</span>}
          </p>
        </div>
        {atLimit ? (
          <Link to="/profile" className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-2xl transition-colors shadow-sm">
            <Lock className="w-4 h-4" /> Upgrade
          </Link>
        ) : (
          <Link to="/recipes/new" className="flex items-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-2xl transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> New Recipe
          </Link>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input 
          type="text" 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          placeholder="Search recipes or tags…" 
          className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-400 bg-white text-sm placeholder:text-gray-400" 
        />
      </div>

      {/* Recipe List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-7 h-7 text-green-400 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-green-50 rounded-3xl flex items-center justify-center mb-4">
            <UtensilsCrossed className="w-8 h-8 text-green-300" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-1">
            {search ? 'No recipes found' : 'No recipes yet'}
          </h3>
          <p className="text-sm text-gray-400 mb-6">
            {search ? 'Try a different search term' : 'Add your first recipe to get started'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((recipe) => (
            <Link 
              key={recipe.id} 
              to={`/recipes/${recipe.id}`} 
              className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-green-200 transition-all duration-200 overflow-hidden flex"
            >
              {recipe.image_url ? (
                <img 
                  src={`https://images.weserv.nl/?url=${encodeURIComponent(recipe.image_url)}&w=200&h=200&fit=cover`} 
                  alt={recipe.title} 
                  className="w-24 h-24 object-cover shrink-0" 
                  onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} 
                />
              ) : null}
              <div className="w-24 h-24 bg-green-50 flex items-center justify-center shrink-0" style={{ display: recipe.image_url ? 'none' : 'flex' }}>
                <UtensilsCrossed className="w-8 h-8 text-green-200" />
              </div>
              <div className="flex-1 p-4 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-gray-900 text-sm leading-snug group-hover:text-green-600 transition-colors truncate">
                    {recipe.title}
                  </h3>
                  <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (confirm('Delete this recipe?')) deleteRecipe.mutate(recipe.id); }} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {recipe.servings} servings</span>
                  {recipe.ingredients?.length > 0 && (
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {recipe.ingredients.length} items</span>
                  )}
                </div>
                {recipe.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {recipe.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="flex items-center gap-0.5 text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">
                        <Tag className="w-2.5 h-2.5" /> {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}