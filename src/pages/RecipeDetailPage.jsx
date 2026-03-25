import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import pb from '../lib/pb';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiArrowLeft, FiHeart, FiClock, FiUsers, FiPrinter, FiEdit, FiCoffee, FiCheck } = FiIcons;

export default function RecipeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkedIngs, setCheckedIngs] = useState({});

  useEffect(() => {
    const fetchRecipe = async () => {
      try {
        const record = await pb.collection('recipes').getOne(id);
        setRecipe(record);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchRecipe();
  }, [id]);

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
    </div>
  );

  if (!recipe) return (
    <div className="text-center py-20">
      <h2 className="text-2xl font-bold text-gray-900">Recipe not found</h2>
      <Link to="/recipes" className="text-emerald-500 mt-4 inline-block font-bold">Back to Library</Link>
    </div>
  );

  const ingredients = typeof recipe.ingredients === 'string' ? JSON.parse(recipe.ingredients) : (recipe.ingredients || []);
  const instructions = recipe.instructions?.split('\n').filter(Boolean) || [];

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-2 text-gray-500 font-bold hover:text-emerald-500 transition-colors">
        <SafeIcon icon={FiArrowLeft} /> Back to Library
      </button>

      <div className="bg-white rounded-[3rem] overflow-hidden shadow-xl shadow-emerald-500/5 border border-gray-100">
        <div className="relative h-[400px] bg-emerald-50">
          {recipe.image_url ? (
            <img src={recipe.image_url} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"><SafeIcon icon={FiCoffee} className="w-24 h-24 text-emerald-100" /></div>
          )}
          <div className="absolute top-8 right-8 flex gap-3">
            <button className="bg-white/90 backdrop-blur-sm p-4 rounded-3xl text-gray-600 hover:text-emerald-500 shadow-lg transition-all">
              <SafeIcon icon={FiHeart} className={recipe.favorited ? 'fill-emerald-500 text-emerald-500' : ''} />
            </button>
            <button className="bg-white/90 backdrop-blur-sm p-4 rounded-3xl text-gray-600 hover:text-emerald-500 shadow-lg transition-all">
              <SafeIcon icon={FiPrinter} />
            </button>
          </div>
        </div>

        <div className="p-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
            <h1 className="text-4xl font-black text-gray-900 leading-tight flex-1">{recipe.title}</h1>
            <div className="flex items-center gap-8 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              <div className="flex flex-col items-center gap-2"><SafeIcon icon={FiUsers} className="w-5 h-5 text-emerald-500" /> {recipe.servings} Servings</div>
              <div className="flex flex-col items-center gap-2"><SafeIcon icon={FiClock} className="w-5 h-5 text-emerald-500" /> 30 Min</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span> Ingredients
              </h3>
              <div className="space-y-4">
                {ingredients.map((ing, i) => (
                  <div 
                    key={i} 
                    onClick={() => setCheckedIngs(prev => ({...prev, [i]: !prev[i]}))}
                    className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all ${checkedIngs[i] ? 'bg-emerald-50 opacity-60' : 'bg-gray-50 hover:bg-emerald-50/50'}`}
                  >
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${checkedIngs[i] ? 'bg-emerald-500 border-emerald-500' : 'border-gray-200'}`}>
                      {checkedIngs[i] && <SafeIcon icon={FiCheck} className="w-3 h-3 text-white" />}
                    </div>
                    <p className={`text-sm font-medium ${checkedIngs[i] ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                      <span className="font-bold text-gray-900">{ing.quantity} {ing.unit}</span> {ing.name}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span> Instructions
              </h3>
              <div className="space-y-8">
                {instructions.map((step, i) => (
                  <div key={i} className="flex gap-6">
                    <span className="text-4xl font-black text-emerald-500/20">{i + 1}</span>
                    <p className="text-gray-600 leading-relaxed text-sm pt-2">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}