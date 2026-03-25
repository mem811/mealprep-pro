import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import pb from '../lib/pb';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiPlus, FiSearch, FiCoffee, FiClock, FiUsers, FiStar, FiHeart } = FiIcons;

export default function RecipesPage() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchRecipes();
  }, []);

  const fetchRecipes = async () => {
    try {
      const userId = pb.authStore.model?.id;
      if (!userId) return;
      const res = await pb.collection('recipes').getList(1, 100, {
        filter: `user="${userId}"`,
        sort: '-created',
      });
      setRecipes(res.items);
    } catch (e) {
      console.error('Fetch recipes error:', e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = recipes.filter(r => r.title?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Your Library</h1>
          <p className="text-gray-500 font-medium">{recipes.length} culinary masterpieces</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <SafeIcon icon={FiSearch} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search recipes..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-emerald-500/20 outline-none w-full md:w-64"
            />
          </div>
          <Link to="/recipes/new" className="bg-emerald-500 text-white p-3.5 rounded-2xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all">
            <SafeIcon icon={FiPlus} className="w-5 h-5" />
          </Link>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-white rounded-[2.5rem] border border-gray-100">
              <div className="bg-emerald-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <SafeIcon icon={FiCoffee} className="w-10 h-10 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">No recipes yet</h3>
              <p className="text-gray-500 mt-2">Start your collection by adding a new recipe</p>
            </div>
          ) : (
            filtered.map(recipe => (
              <Link key={recipe.id} to={`/recipes/${recipe.id}`} className="group bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-500">
                <div className="relative h-56 bg-emerald-50 overflow-hidden">
                  {recipe.image_url ? (
                    <img src={recipe.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><SafeIcon icon={FiCoffee} className="w-14 h-14 text-emerald-100" /></div>
                  )}
                  {recipe.favorited && (
                    <div className="absolute top-5 right-5 bg-white/90 backdrop-blur-sm p-2.5 rounded-full text-emerald-500 shadow-sm">
                      <SafeIcon icon={FiHeart} className="w-4 h-4 fill-current" />
                    </div>
                  )}
                </div>
                <div className="p-7">
                  <h3 className="font-bold text-gray-900 mb-4 line-clamp-1 group-hover:text-emerald-600 transition-colors">{recipe.title}</h3>
                  <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    <div className="flex items-center gap-2"><SafeIcon icon={FiUsers} className="w-4 h-4" /> {recipe.servings} Servings</div>
                    <div className="flex items-center gap-2"><SafeIcon icon={FiClock} className="w-4 h-4" /> 30 MIN</div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}