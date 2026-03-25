"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Plus, Clock, Users, ChevronRight, Star } from 'lucide-react';
import Link from 'next/link';

export default function RecipesPage() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchRecipes();
  }, []);

  const fetchRecipes = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error) setRecipes(data);
    setLoading(false);
  };

  const filteredRecipes = recipes.filter(r => 
    r.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Recipe Library</h1>
          <p className="text-gray-500">All your saved creations in one place</p>
        </div>
        <div className="relative flex-1 md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text"
            placeholder="Search recipes..."
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/recipes/new" className="group">
          <div className="h-full border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center p-8 text-gray-400 group-hover:border-brand-500 group-hover:bg-brand-50 transition-all">
            <div className="bg-gray-100 p-4 rounded-full mb-4 group-hover:bg-brand-500 group-hover:text-white transition-colors">
              <Plus className="w-8 h-8" />
            </div>
            <span className="text-lg font-bold text-gray-600 group-hover:text-brand-600">Add New Recipe</span>
            <p className="text-sm text-center mt-2 px-4">Create a custom recipe or import from a URL</p>
          </div>
        </Link>

        {filteredRecipes.map((recipe) => (
          <Link key={recipe.id} href={`/recipes/${recipe.id}`} className="group">
            <div className="card h-full flex flex-col hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="relative h-48 w-full overflow-hidden">
                <img 
                  src={recipe.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop&q=80'} 
                  alt={recipe.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute top-3 right-3">
                  <button className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-sm text-brand-500">
                    <Star className="w-4 h-4 fill-current" />
                  </button>
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1">{recipe.title}</h3>
                <div className="flex items-center gap-4 text-sm text-gray-500 mt-auto">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{recipe.servings} Servings</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>25m</span>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}