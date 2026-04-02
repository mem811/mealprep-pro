import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import pb from '../lib/pb';
import {
  ArrowLeft, Bookmark, BookmarkCheck, Pencil, Printer,
  Clock, Users, Globe, ChefHat, Check, Loader2, Zap, Star, Save
} from 'lucide-react';

function getRecipeImage(recipe) {
  if (recipe.image_file) {
    return pb.getFileUrl(recipe, recipe.image_file, { thumb: '400x300' });
  }
  if (recipe.image_url) {
    return `https://images.weserv.nl/?url=${encodeURIComponent(recipe.image_url)}&w=400&fit=cover&q=80&n=-1`;
  }
  return null;
}

const toTitleCase = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const parseIngredients = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
};

const parseTags = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
};

const parseNutrition = (raw) => {
  if (!raw) return null;
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return null; }
};

const parseInstructions = (raw) => {
  if (!raw) return [];
  const text = typeof raw === 'string' ? raw : String(raw);
  return text
    .split(/\n+/)
    .map(s => s.replace(/^\d+\.\s*/, '').trim())
    .filter(Boolean);
};

const getSourceName = (url) => {
  if (!url) return null;
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    return hostname;
  } catch { return url; }
};

export default function RecipeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const printRef = useRef(null);

  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [favorited, setFavorited] = useState(false);
  const [favLoading, setFavLoading] = useState(false);
  const [checkedIngredients, setCheckedIngredients] = useState({});
  const [checkedSteps, setCheckedSteps] = useState({});
  const [servingsMultiplier, setServingsMultiplier] = useState(1);
  const [imgError, setImgError] = useState(false);

  // Nutrition state
  const [nutrition, setNutrition] = useState(null);
  const [fetchingNutrition, setFetchingNutrition] = useState(false);
  const [nutritionError, setNutritionError] = useState('');
  const [manualNutrition, setManualNutrition] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });

  // Rating state
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);

  useEffect(() => {
    const fetchRecipe = async () => {
      try {
        setLoading(true);
        const record = await pb.collection('recipes').getOne(id);
        setRecipe(record);
        setFavorited(record.favorited || false);
        setNutrition(parseNutrition(record.nutrition));
        setRating(record.rating || 0);
      } catch (e) {
        setError('Recipe not found.');
      } finally {
        setLoading(false);
      }
    };
    fetchRecipe();
  }, [id]);

  const toggleFavorite = async () => {
    if (!recipe) return;
    setFavLoading(true);
    try {
      const updated = await pb.collection('recipes').update(recipe.id, { favorited: !favorited });
      setFavorited(updated.favorited);
    } catch (e) {
      console.error(e);
    } finally {
      setFavLoading(false);
    }
  };

  const toggleIngredient = (idx) => {
    setCheckedIngredients(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const toggleStep = (idx) => {
    setCheckedSteps(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handlePrint = () => {
    window.print();
  };

 const handleFetchNutrition = async () => {
  if (!recipe) return;
  setFetchingNutrition(true);
  setNutritionError('');

  try {
    if (!recipe.source_url) {
      setNutritionError('No source URL. Use manual entry below.');
      setFetchingNutrition(false);
      return;
    }

    const res = await fetch(
      'https://n8n.srv1052955.hstgr.cloud/webhook/5ea8e8c8-94bf-41e7-8ffa-5dd843cdfe13',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: recipe.source_url }),
      }
    );

    if (!res.ok) throw new Error(`Fetch error: ${res.status}`);
    const data = await res.json();
    const result = Array.isArray(data) ? data[0] : data;

       if (result.nutrition) {
      const raw = typeof result.nutrition === 'string' ? JSON.parse(result.nutrition) : result.nutrition;
      console.log('Parsed nutrition:', raw);
      const n = {
        calories: Math.round(raw.calories || 0),
        protein: Math.round(raw.protein || 0),
        carbs: Math.round(raw.carbs || 0),
        fat: Math.round(raw.fat || 0),
      };

      await pb.collection('recipes').update(recipe.id, { nutrition: JSON.stringify(n) });
      setNutrition(n);
    } else {
      setNutritionError('No nutrition found. Use manual entry below.');
    }
  } catch (err) {
    console.error('Nutrition fetch error:', err);
    setNutritionError('Failed to fetch nutrition. Try manual entry.');
  } finally {
    setFetchingNutrition(false);
  }
};

  const handleSaveManualNutrition = async () => {
    try {
      await pb.collection('recipes').update(recipe.id, { nutrition: JSON.stringify(manualNutrition) });
      setNutrition(manualNutrition);
    } catch (err) {
      console.error('Save nutrition error:', err);
    }
  };

  const handleRating = async (value) => {
    setRating(value);
    try {
      await pb.collection('recipes').update(recipe.id, { rating: value });
    } catch (err) {
      console.error('Rating error:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="max-w-xl mx-auto p-8 text-center">
        <p className="text-red-500 mb-4">{error || 'Recipe not found.'}</p>
        <Link to="/recipes" className="text-green-600 hover:underline">← Back to Recipes</Link>
      </div>
    );
  }

  const ingredients = parseIngredients(recipe.ingredients);
  const tags = parseTags(recipe.tags);
  const steps = parseInstructions(recipe.instructions);
  const sourceName = getSourceName(recipe.source_url);
  const proxiedImg = getRecipeImage(recipe);

  const scaledQty = (qty) => {
    const num = parseFloat(qty);
    if (isNaN(num)) return qty;
    const result = num * servingsMultiplier;
    return result % 1 === 0 ? result : parseFloat(result.toFixed(2));
  };

  return (
    <>
      {/* Print Styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white !important; }
        }
        @media screen {
          .print-only { display: none; }
        }
      `}</style>

      <div className="min-h-screen bg-gray-50" ref={printRef}>

        {/* Back button & actions */}
        <div className="no-print sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-green-600 transition-colors font-medium text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <Link
            to={`/recipes/${id}/edit`}
            className="flex items-center gap-2 text-gray-500 hover:text-blue-500 border border-gray-200 rounded-xl px-3 py-1.5 text-sm font-medium hover:bg-blue-50 transition-colors"
          >
            <Pencil className="w-4 h-4" />
            Edit Recipe
          </Link>
        </div>

        {/* Two Column Layout: Hero + Sidebar */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left Column */}
            <div className="lg:col-span-2">

              {/* Hero Image */}
              <div className="relative w-full h-72 sm:h-96 bg-gray-200 rounded-2xl overflow-hidden">
                {proxiedImage && !imgError ? (
                  <img
                    src={proxiedImage}
                    alt={recipe.title}
                    className="w-full h-full object-cover"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-100 to-green-200">
                    <ChefHat className="w-20 h-20 text-green-400" />
                  </div>
                )}
                {/* Action buttons on image */}
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  <button
                    onClick={toggleFavorite}
                    disabled={favLoading}
                    className={`p-2.5 rounded-full shadow-md transition-all ${favorited ? 'bg-green-500 text-white' : 'bg-white/90 text-gray-500 hover:text-green-500'}`}
                  >
                    {favorited ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={handlePrint}
                    className="p-2.5 rounded-full bg-white/90 text-gray-500 hover:text-gray-700 shadow-md transition-all"
                  >
                    <Printer className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Title */}
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-5">{recipe.title}</h1>

              {/* Stats */}
              <div className="flex flex-wrap items-center gap-3 mt-3">
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-4 py-2">
                  <Users className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">
                    {recipe.servings ? recipe.servings * servingsMultiplier : '—'} servings
                  </span>
                  <div className="flex items-center gap-1 ml-1">
                    {[1, 2, 4].map(m => (
                      <button
                        key={m}
                        onClick={() => setServingsMultiplier(m)}
                        className={`text-xs px-2 py-0.5 rounded-full font-semibold transition-all ${
                          servingsMultiplier === m
                            ? 'bg-green-600 text-white'
                            : 'bg-white text-green-600 border border-green-300 hover:bg-green-100'
                        }`}
                      >
                        {m}×
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-4 py-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600 font-medium">30 min</span>
                </div>
                {sourceName && (
                  <a
                    href={recipe.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-4 py-2 hover:bg-gray-100 transition-colors"
                  >
                    <Globe className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600 font-medium">{sourceName}</span>
                  </a>
                )}
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2 mt-4">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Rating</span>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => handleRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-0.5 transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-5 h-5 ${
                          star <= (hoverRating || rating)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {tags.map((tag, i) => (
                    <span
                      key={i}
                      className="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full border border-green-200"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Ingredients & Instructions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">

                {/* Ingredients */}
                <div>
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                      <h2 className="text-lg font-bold text-green-700 flex items-center gap-2">
                        <span className="w-1 h-5 bg-green-500 rounded-full"></span>
                        Ingredients
                      </h2>
                      <span className="text-xs text-gray-400 font-medium">{ingredients.length} items</span>
                    </div>
                    {ingredients.length === 0 ? (
                      <p className="px-6 py-4 text-gray-400 text-sm">No ingredients listed.</p>
                    ) : (
                      <ul className="divide-y divide-gray-50">
                        {ingredients.map((ing, idx) => {
                          const checked = !!checkedIngredients[idx];
                          return (
                            <li
                              key={idx}
                              onClick={() => toggleIngredient(idx)}
                              className={`flex items-center gap-3 px-6 py-3.5 cursor-pointer transition-colors hover:bg-gray-50 ${checked ? 'opacity-50' : ''}`}
                            >
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                checked
                                  ? 'bg-green-500 border-green-500'
                                  : 'border-gray-300 hover:border-green-400'
                              }`}>
                                {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                              </div>
                              <span className={`text-sm text-gray-800 flex-1 ${checked ? 'line-through text-gray-400' : ''}`}>
                                <span className="font-semibold text-gray-900">
                                  {scaledQty(ing.quantity)}{ing.unit ? ` ${ing.unit}` : ''}
                                </span>
                                {' '}
                                {toTitleCase(ing.name)}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {ingredients.length > 0 && (
                      <div className="px-6 py-3 border-t border-gray-50 no-print">
                        <button
                          onClick={() => {
                            const allChecked = ingredients.every((_, i) => checkedIngredients[i]);
                            if (allChecked) {
                              setCheckedIngredients({});
                            } else {
                              const all = {};
                              ingredients.forEach((_, i) => { all[i] = true; });
                              setCheckedIngredients(all);
                            }
                          }}
                          className="text-xs text-green-600 hover:text-green-700 font-medium"
                        >
                          {ingredients.every((_, i) => checkedIngredients[i]) ? 'Uncheck all' : 'Check all'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Instructions */}
                <div>
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                      <h2 className="text-lg font-bold text-green-700 flex items-center gap-2">
                        <span className="w-1 h-5 bg-green-500 rounded-full"></span>
                        Instructions
                      </h2>
                      <span className="text-xs text-gray-400 font-medium">{steps.length} steps</span>
                    </div>
                    {steps.length === 0 ? (
                      <p className="px-6 py-4 text-gray-400 text-sm">No instructions listed.</p>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {steps.map((step, idx) => {
                          const done = !!checkedSteps[idx];
                          return (
                            <div
                              key={idx}
                              onClick={() => toggleStep(idx)}
                              className={`flex gap-4 px-6 py-4 cursor-pointer transition-colors hover:bg-gray-50 ${done ? 'opacity-50' : ''}`}
                            >
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm transition-all mt-0.5 ${
                                done
                                  ? 'bg-green-500 text-white'
                                  : 'bg-green-100 text-green-700'
                              }`}>
                                {done ? <Check className="w-4 h-4" strokeWidth={3} /> : idx + 1}
                              </div>
                              <p className={`text-sm text-gray-700 leading-relaxed flex-1 pt-1 ${done ? 'line-through text-gray-400' : ''}`}>
                                {step}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Right Sidebar */}
            <div className="lg:col-span-1 space-y-5">

              {/* Nutrition Card */}
{nutrition ? (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
    <div className="px-5 py-4 border-b border-gray-100">
      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Nutrition Facts</h3>
      <p className="text-xs text-gray-400">Per serving</p>
    </div>
    <div className="grid grid-cols-2 gap-4 p-5">
      <div className="text-center bg-green-50 rounded-xl py-3">
        <div className="text-xl font-bold text-green-600">{nutrition.calories}</div>
        <div className="text-xs text-gray-500 mt-0.5">Calories</div>
      </div>
      <div className="text-center bg-blue-50 rounded-xl py-3">
        <div className="text-xl font-bold text-blue-600">{nutrition.protein}g</div>
        <div className="text-xs text-gray-500 mt-0.5">Protein</div>
      </div>
      <div className="text-center bg-amber-50 rounded-xl py-3">
        <div className="text-xl font-bold text-amber-600">{nutrition.carbs}g</div>
        <div className="text-xs text-gray-500 mt-0.5">Carbs</div>
      </div>
      <div className="text-center bg-red-50 rounded-xl py-3">
        <div className="text-xl font-bold text-red-500">{nutrition.fat}g</div>
        <div className="text-xs text-gray-500 mt-0.5">Fat</div>
      </div>
    </div>
    <div className="px-5 pb-4">
      <button
        onClick={handleFetchNutrition}
        disabled={fetchingNutrition}
        className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-600 py-2 rounded-xl font-medium transition-colors text-xs"
      >
        {fetchingNutrition ? (
          <><Loader2 className="w-3 h-3 animate-spin" /> Refetching...</>
        ) : (
          <><Zap className="w-3 h-3" /> Re-fetch Nutrition</>
        )}
      </button>
    </div>
  </div>
) : (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
    <div className="p-6 text-center">
      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
        <Zap className="w-6 h-6 text-green-600" />
      </div>
      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">Nutrition Scanner</h3>
      <button
        onClick={handleFetchNutrition}
        disabled={fetchingNutrition}
        className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-semibold transition-colors disabled:opacity-60"
      >
        {fetchingNutrition ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Fetching...</>
        ) : (
          <><Zap className="w-4 h-4" /> Fetch Nutrition</>
        )}
      </button>
      {nutritionError && (
        <p className="text-red-500 text-xs mt-2 font-medium">{nutritionError}</p>
      )}
    </div>

    {/* Manual Entry */}
    <div className="px-5 pb-5 border-t border-gray-100 pt-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
        <Pencil className="w-3 h-3" /> Manual Entry Fallback
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Calories</label>
          <input
            type="number"
            value={manualNutrition.calories}
            onChange={e => setManualNutrition(prev => ({ ...prev, calories: Number(e.target.value) }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Protein</label>
          <input
            type="number"
            value={manualNutrition.protein}
            onChange={e => setManualNutrition(prev => ({ ...prev, protein: Number(e.target.value) }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Carbs</label>
          <input
            type="number"
            value={manualNutrition.carbs}
            onChange={e => setManualNutrition(prev => ({ ...prev, carbs: Number(e.target.value) }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Fat</label>
          <input
            type="number"
            value={manualNutrition.fat}
            onChange={e => setManualNutrition(prev => ({ ...prev, fat: Number(e.target.value) }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>
      </div>
      <button
        onClick={handleSaveManualNutrition}
        className="mt-3 w-full flex items-center justify-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 py-2 rounded-xl font-medium text-sm transition-colors border border-green-200"
      >
        <Save className="w-4 h-4" /> Save Nutrition
      </button>
    </div>
  </div>
)}
              {/* Chef's Note */}
              <div className="bg-green-500 rounded-2xl p-5 text-white shadow-sm">
                <h3 className="font-bold text-sm flex items-center gap-2 mb-2">
                  <span className="text-lg">✨</span> Chef's Note
                </h3>
                <p className="text-sm leading-relaxed opacity-95 italic">
  {recipe.chef_note || "No chef's note yet. Add one by editing this recipe!"}
</p>
              </div>

            </div>
          </div>
        </div>

        {/* Print header */}
        <div className="print-only p-6 border-b">
          <h1 className="text-2xl font-bold text-gray-900">{recipe.title}</h1>
          {sourceName && <p className="text-sm text-gray-500 mt-1">{sourceName}</p>}
        </div>

        {/* Bottom padding */}
        <div className="h-12 no-print" />
      </div>
    </>
  );
}
