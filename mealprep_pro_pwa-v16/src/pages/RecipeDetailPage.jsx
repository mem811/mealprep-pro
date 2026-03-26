import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import pb from '../lib/pb';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import NutritionDisplay from '../components/NutritionDisplay';
import StarRating from '../components/StarRating';

const { 
  FiArrowLeft, FiHeart, FiClock, FiUsers, FiPrinter, 
  FiEdit, FiCoffee, FiCheck, FiLoader, FiZap, 
  FiAlertCircle, FiSave, FiActivity 
} = FiIcons;

export default function RecipeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [fetchingNutrition, setFetchingNutrition] = useState(false);
  const [nutError, setNutError] = useState(null);
  const [checkedIngs, setCheckedIngs] = useState({});
  
  // Manual Nutrition State (Always synced with recipe.nutrition)
  const [manualNut, setManualNut] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [savingManual, setSavingManual] = useState(false);

  useEffect(() => {
    fetchRecipe();
  }, [id]);

  const fetchRecipe = async () => {
    try {
      const record = await pb.collection('recipes').getOne(id);
      setRecipe(record);
      if (record.nutrition) {
        const nut = typeof record.nutrition === 'string' ? JSON.parse(record.nutrition) : record.nutrition;
        setManualNut(nut);
      }
    } catch (e) {
      console.error('Fetch recipe error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchNutrition = async () => {
    if (!recipe.source_url && !recipe.ingredients) {
      setNutError('Nutrition fetch requires a recipe URL or ingredients.');
      return;
    }

    setFetchingNutrition(true);
    setNutError(null);
    const apiKey = import.meta.env.VITE_SPOONACULAR_API_KEY;

    try {
      let nutritionData = null;
      
      // 1. Try Extraction API
      if (recipe.source_url) {
        const extractUrl = `https://api.spoonacular.com/recipes/extract?url=${encodeURIComponent(recipe.source_url)}&addRecipeNutrition=true&apiKey=${apiKey}`;
        const response = await fetch(extractUrl);
        
        // TEMPORARY DEBUG CODE AS REQUESTED
        console.log('Status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Has nutrition:', !!data.nutrition);
          console.log('Nutrients array:', data.nutrition?.nutrients?.slice(0, 3));

          if (data.nutrition?.nutrients) {
            nutritionData = data.nutrition.nutrients;
          }
        }
      }

      // 2. FALLBACK: Analyze Nutrition Endpoint (POST)
      if (!nutritionData && recipe.ingredients) {
        console.log('Extraction failed or no nutrition found. Calling Analyze endpoint...');
        const ingredients = typeof recipe.ingredients === 'string' ? JSON.parse(recipe.ingredients) : recipe.ingredients;
        const ingredientLines = ingredients.map(i => `${i.quantity} ${i.unit} ${i.name}`);

        const analyzeRes = await fetch(`https://api.spoonacular.com/recipes/analyze?apiKey=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: recipe.title,
            ingredients: ingredientLines
          })
        });

        console.log('Analyze Status:', analyzeRes.status);
        if (analyzeRes.ok) {
          const data = await analyzeRes.json();
          console.log('Analyze Has nutrition:', !!data.nutrition);
          if (data.nutrition?.nutrients) {
            nutritionData = data.nutrition.nutrients;
          }
        }
      }

      if (nutritionData) {
        const nutrition = {
          calories: Math.round(nutritionData.find(x => x.name === 'Calories')?.amount || 0),
          protein: Math.round(nutritionData.find(x => x.name === 'Protein')?.amount || 0),
          carbs: Math.round(nutritionData.find(x => x.name === 'Carbohydrates')?.amount || 0),
          fat: Math.round(nutritionData.find(x => x.name === 'Fat')?.amount || 0),
        };

        const updated = await pb.collection('recipes').update(id, { nutrition });
        setRecipe(updated);
        setManualNut(nutrition);
        setNutError(null);
      } else {
        throw new Error('No nutrition data found after trying all endpoints.');
      }
    } catch (err) {
      console.error('Nutrition Fetch Error:', err);
      setNutError(err.message || 'Could not fetch nutrition data.');
    } finally {
      setFetchingNutrition(false);
    }
  };

  const handleSaveManualNutrition = async () => {
    setSavingManual(true);
    try {
      const updated = await pb.collection('recipes').update(id, { nutrition: manualNut });
      setRecipe(updated);
      setNutError(null);
      alert('Nutrition saved successfully!');
    } catch (err) {
      console.error('Save manual nutrition error:', err);
      alert('Failed to save nutrition.');
    } finally {
      setSavingManual(false);
    }
  };

  const handleRate = async (newRating) => {
    if (ratingLoading) return;
    setRatingLoading(true);
    try {
      const updated = await pb.collection('recipes').update(id, { rating: newRating });
      setRecipe(updated);
    } catch (e) {
      console.error('Rating error:', e);
    } finally {
      setRatingLoading(false);
    }
  };

  const handleToggleFavorite = async () => {
    try {
      const updated = await pb.collection('recipes').update(id, { favorited: !recipe.favorited });
      setRecipe(updated);
    } catch (e) {
      console.error('Favorite error:', e);
    }
  };

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
    </div>
  );

  const ingredients = typeof recipe.ingredients === 'string' ? JSON.parse(recipe.ingredients) : (recipe.ingredients || []);
  const instructions = recipe.instructions?.split('\n').filter(Boolean) || [];
  const nutrition = typeof recipe.nutrition === 'string' ? JSON.parse(recipe.nutrition) : recipe.nutrition;

  return (
    <div className="max-w-5xl mx-auto pb-20 px-4">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 font-bold hover:text-emerald-500 transition-colors">
          <SafeIcon icon={FiArrowLeft} /> Back
        </button>
        <Link to={`/recipes/${id}/edit`} className="bg-white p-3 rounded-2xl border border-gray-100 text-gray-400 hover:text-emerald-500 transition-all flex items-center gap-2 font-bold text-sm shadow-sm">
          <SafeIcon icon={FiEdit} className="w-4 h-4" />
          <span className="hidden sm:inline">Edit Recipe</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-[3rem] overflow-hidden shadow-xl border border-gray-100">
            <div className="relative h-[400px] bg-emerald-50">
              {recipe.image_url ? (
                <img src={recipe.image_url} className="w-full h-full object-cover" alt={recipe.title} />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <SafeIcon icon={FiCoffee} className="w-24 h-24 text-emerald-100" />
                </div>
              )}
              <div className="absolute top-8 right-8 flex gap-3">
                <button onClick={handleToggleFavorite} className="bg-white/90 backdrop-blur-sm p-4 rounded-3xl text-gray-600 hover:text-emerald-500 shadow-lg transition-all">
                  <SafeIcon icon={FiHeart} className={recipe.favorited ? 'fill-emerald-500 text-emerald-500' : ''} />
                </button>
                <button onClick={() => window.print()} className="bg-white/90 backdrop-blur-sm p-4 rounded-3xl text-gray-600 hover:text-emerald-500 shadow-lg transition-all">
                  <SafeIcon icon={FiPrinter} />
                </button>
              </div>
            </div>

            <div className="p-10">
              <div className="flex flex-col gap-6 mb-10">
                <h1 className="text-4xl font-black text-gray-900 leading-tight">{recipe.title}</h1>
                <div className="flex items-center gap-8 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  <div className="flex flex-col items-center gap-2"><SafeIcon icon={FiUsers} className="w-5 h-5 text-emerald-500" /> {recipe.servings} Servings</div>
                  <div className="flex flex-col items-center gap-2"><SafeIcon icon={FiClock} className="w-5 h-5 text-emerald-500" /> 30 Min</div>
                </div>
                <div className="flex items-center gap-4 bg-gray-50 self-start px-6 py-3 rounded-2xl border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Rating</span>
                  <StarRating rating={recipe.rating} onRate={handleRate} size="md" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                    <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span> Ingredients
                  </h3>
                  <div className="space-y-4">
                    {ingredients.map((ing, i) => (
                      <div key={i} onClick={() => setCheckedIngs(prev => ({ ...prev, [i]: !prev[i] }))} className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all ${checkedIngs[i] ? 'bg-emerald-50 opacity-60' : 'bg-gray-50 hover:bg-emerald-50/50'}`}>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${checkedIngs[i] ? 'bg-emerald-500 border-emerald-500' : 'border-gray-200'}`}>
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

        <aside className="space-y-6">
          {nutrition && (nutrition.calories > 0 || nutrition.protein > 0) && (
            <NutritionDisplay nutrition={nutrition} />
          )}

          <div className="bg-white rounded-[2rem] border border-emerald-100 p-8 text-center shadow-sm">
            <div className="bg-emerald-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <SafeIcon icon={FiZap} className="w-8 h-8 text-emerald-500" />
            </div>
            <h4 className="font-bold text-gray-900 mb-2 uppercase tracking-widest text-[10px]">Nutrition Scanner</h4>
            
            {nutError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2 text-left">
                <SafeIcon icon={FiAlertCircle} className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <p className="text-[10px] font-bold text-rose-600 leading-tight uppercase tracking-wider">{nutError}</p>
              </div>
            )}

            <button 
              onClick={handleFetchNutrition} 
              disabled={fetchingNutrition} 
              className="w-full py-4 bg-emerald-500 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 mb-8"
            >
              {fetchingNutrition ? <SafeIcon icon={FiLoader} className="animate-spin" /> : <SafeIcon icon={FiZap} />}
              {fetchingNutrition ? 'Analyzing...' : 'Fetch Nutrition'}
            </button>

            {/* ALWAYS SHOW MANUAL FORM AS FALLBACK BELOW FETCH BUTTON */}
            <div className="pt-6 border-t border-gray-100 text-left space-y-4">
              <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <SafeIcon icon={FiEdit} className="text-emerald-500" /> Manual Entry Fallback
              </h5>
              <div className="grid grid-cols-2 gap-3">
                {['calories', 'protein', 'carbs', 'fat'].map(key => (
                  <div key={key}>
                    <label className="text-[10px] font-bold text-gray-400 capitalize ml-1">{key}</label>
                    <input 
                      type="number" 
                      value={manualNut[key]} 
                      onChange={e => setManualNut({ ...manualNut, [key]: Number(e.target.value) })}
                      className="w-full mt-1 px-3 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none text-xs font-bold"
                    />
                  </div>
                ))}
              </div>
              <button 
                onClick={handleSaveManualNutrition} 
                disabled={savingManual} 
                className="w-full py-3 bg-emerald-50 text-emerald-600 font-bold rounded-xl hover:bg-emerald-100 transition-all flex items-center justify-center gap-2 text-xs"
              >
                {savingManual ? <SafeIcon icon={FiLoader} className="animate-spin" /> : <SafeIcon icon={FiSave} />}
                Save Nutrition
              </button>
            </div>
          </div>

          <div className="bg-emerald-500 rounded-[2rem] p-8 text-white shadow-xl shadow-emerald-500/20">
            <h4 className="font-bold mb-2 flex items-center gap-2">
              <SafeIcon icon={FiActivity} /> Chef's Note
            </h4>
            <p className="text-sm opacity-90 leading-relaxed italic">
              "This recipe works best with fresh seasonal ingredients. Don't be afraid to adjust the seasoning to your liking!"
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}