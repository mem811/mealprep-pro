import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import pb from '../lib/pb';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import StarRating from '../components/StarRating';

const { 
  FiPlus, FiSearch, FiCoffee, FiClock, FiUsers, FiHeart, 
  FiLayers, FiSunrise, FiSunset, FiTarget, FiZap, FiBox, 
  FiBookmark, FiLayout, FiActivity, FiBriefcase, FiAperture,
  FiWind, FiTarget: FiDumbbell, FiCloud, FiDroplet
} = FiIcons;

const FILTERS = [
  { label: 'All Recipes', icon: FiLayout },
  { label: 'Breakfast', icon: FiSunrise },
  { label: 'Lunch', icon: FiActivity },
  { label: 'Dinner', icon: FiSunset },
  { label: 'Snack', icon: FiZap },
  { label: 'Dessert', icon: FiTarget },
  { label: 'Sides', icon: FiLayers },
  { label: 'Soups', icon: FiBox },
  { label: 'Vegan', icon: FiWind },
  { label: 'Vegetarian', icon: FiAperture },
  { label: 'Gluten-Free', icon: FiDroplet },
  { label: 'High-Protein', icon: FiDumbbell },
  { label: 'Bread', icon: FiBox },
  { label: 'Favorites', icon: FiBookmark },
];

export default function RecipesPage() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('All Recipes');

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

  const handleToggleFavorite = async (e, recipe) => {
    e.preventDefault();
    e.stopPropagation();
    
    const newStatus = !recipe.favorited;
    
    setRecipes(prev => prev.map(r => 
      r.id === recipe.id ? { ...r, favorited: newStatus } : r
    ));

    try {
      await pb.collection('recipes').update(recipe.id, { 
        favorited: newStatus 
      });
    } catch (err) {
      console.error('Favorite toggle failed:', err);
      setRecipes(prev => prev.map(r => 
        r.id === recipe.id ? { ...r, favorited: !newStatus } : r
      ));
    }
  };

  const filtered = recipes.filter(r => {
    const matchesSearch = r.title?.toLowerCase().includes(search.toLowerCase());
    if (activeFilter === 'All Recipes') return matchesSearch;
    if (activeFilter === 'Favorites') return matchesSearch && r.favorited;
    
    let tags = [];
    try {
      tags = typeof r.tags === 'string' ? JSON.parse(r.tags) : (r.tags || []);
    } catch { tags = []; }
    
    return matchesSearch && tags.some(t => t.toLowerCase() === activeFilter.toLowerCase());
  });

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
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

      {/* Filter Tabs - WRAPPING ENABLED */}
      <div className="flex flex-wrap gap-3">
        {FILTERS.map((f) => (
          <button
            key={f.label}
            onClick={() => setActiveFilter(f.label)}
            className={`flex flex-col items-center justify-center min-w-[100px] p-4 rounded-[1.5rem] transition-all border ${
              activeFilter === f.label 
                ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20 scale-105 z-10' 
                : 'bg-white text-gray-400 border-gray-100 hover:border-emerald-200'
            }`}
          >
            <SafeIcon icon={f.icon} className={`w-6 h-6 mb-2 ${activeFilter === f.label ? 'text-white' : 'text-emerald-500'}`} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-center">{f.label}</span>
          </button>
        ))}
      </div>

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
              <h3 className="text-xl font-bold text-gray-900">No matches found</h3>
              <p className="text-gray-500 mt-2">Try a different filter or search term</p>
            </div>
          ) : (
            filtered.map(recipe => (
              <Link key={recipe.id} to={`/recipes/${recipe.id}`} className="group bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-500">
                <div className="relative h-56 bg-emerald-50 overflow-hidden">
                  {recipe.image_url ? (
                    <img src={recipe.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-emerald-50">
                      <SafeIcon icon={FiCoffee} className="w-14 h-14 text-emerald-100" />
                    </div>
                  )}
                  
                  <button 
                    onClick={(e) => handleToggleFavorite(e, recipe)}
                    className="absolute top-4 right-4 z-10 p-2.5 rounded-2xl bg-white/90 backdrop-blur-md shadow-lg hover:scale-110 active:scale-95 transition-all"
                  >
                    <SafeIcon 
                      icon={FiHeart} 
                      className={`w-5 h-5 transition-colors ${recipe.favorited ? 'text-rose-500 fill-rose-500' : 'text-gray-400'}`} 
                    />
                  </button>

                  <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm">
                    <div className="flex items-center gap-1.5 font-bold text-[10px] text-emerald-600 uppercase tracking-widest">
                      <SafeIcon icon={FiClock} className="w-3 h-3" /> 30m
                    </div>
                  </div>
                </div>

                <div className="p-7">
                  <h3 className="font-bold text-gray-900 mb-4 line-clamp-1 group-hover:text-emerald-600 transition-colors uppercase tracking-tight text-sm">{recipe.title}</h3>
                  
                  <div className="flex items-center justify-between">
                    <StarRating rating={recipe.rating || 0} readonly size="sm" />
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      <SafeIcon icon={FiUsers} className="w-4 h-4 text-emerald-500" /> {recipe.servings}
                    </div>
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