import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import pb from '../lib/pb';
import {
  ArrowLeft, Bookmark, BookmarkCheck, Pencil, Printer,
  Clock, Users, Globe, ChefHat, Check, Loader2, Zap, Star, Save, Utensils, Heart, X
} from 'lucide-react';

const getProxiedImage = (url) => {
  if (!url) return null;
  return "https://images.weserv.nl/?url=" + encodeURIComponent(url) + "&w=1200&fit=inside&q=85";
};

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
  var text = typeof raw === 'string' ? raw : String(raw);
  return text
    .split(/\n+/)
    .map(function(s) { return s.replace(/^\d+\.\s*/, '').trim(); })
    .filter(Boolean);
};

const getSourceName = (url) => {
  if (!url) return null;
  try {
    var hostname = new URL(url).hostname.replace(/^www\./, '');
    return hostname;
  } catch { return url; }
};

const getWWPoints = (nutrition) => {
  if (!nutrition) return null;
  var cal = Math.abs(parseFloat(nutrition.calories) || 0);
  var fat = Math.abs(parseFloat(nutrition.fat) || 0);
  if (!cal && !fat) return null;
  return Math.max(0, Math.round(cal / 50 + fat / 12));
};

export default function RecipeDetailPage() {
  var { id } = useParams();
  var navigate = useNavigate();
  var printRef = useRef(null);

  var [recipe, setRecipe] = useState(null);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState('');
  var [favorited, setFavorited] = useState(false);
  var [favLoading, setFavLoading] = useState(false);
  var [checkedIngredients, setCheckedIngredients] = useState({});
  var [checkedSteps, setCheckedSteps] = useState({});
  var [servingsMultiplier, setServingsMultiplier] = useState(1);
  var [imgError, setImgError] = useState(false);

  // Nutrition state
  var [nutrition, setNutrition] = useState(null);
  var [fetchingNutrition, setFetchingNutrition] = useState(false);
  var [nutritionError, setNutritionError] = useState('');
  var [manualNutrition, setManualNutrition] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });

  // Rating state
  var [rating, setRating] = useState(0);
  var [hoverRating, setHoverRating] = useState(0);

  // Delete modal state
  var [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(function() {
    var fetchRecipe = async function() {
      try {
        setLoading(true);
        var record = await pb.collection('recipes').getOne(id);
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

  var toggleFavorite = async function() {
    if (!recipe) return;
    setFavLoading(true);
    try {
      var updated = await pb.collection('recipes').update(recipe.id, { favorited: !favorited });
      setFavorited(updated.favorited);
    } catch (e) {
      console.error(e);
    } finally {
      setFavLoading(false);
    }
  };

  var toggleIngredient = function(idx) {
    setCheckedIngredients(function(prev) { return Object.assign({}, prev, { [idx]: !prev[idx] }); });
  };

  var toggleStep = function(idx) {
    setCheckedSteps(function(prev) { return Object.assign({}, prev, { [idx]: !prev[idx] }); });
  };

  var handlePrint = function() {
    window.print();
  };

  var handleFetchNutrition = async function() {
    if (!recipe) return;
    setFetchingNutrition(true);
    setNutritionError('');
    var apiKey = import.meta.env.VITE_SPOONACULAR_API_KEY;
    try {
      if (recipe.source_url) {
        var res = await fetch(
          "https://api.spoonacular.com/recipes/extract?url=" + encodeURIComponent(recipe.source_url) + "&addRecipeNutrition=true&apiKey=" + apiKey
        );
        if (res.ok) {
          var data = await res.json();
          if (data.nutrition && data.nutrition.nutrients) {
            var nutrients = data.nutrition.nutrients;
            var n = {
              calories: Math.round((nutrients.find(function(x) { return x.name === 'Calories'; }) || {}).amount || 0),
              protein: Math.round((nutrients.find(function(x) { return x.name === 'Protein'; }) || {}).amount || 0),
              carbs: Math.round((nutrients.find(function(x) { return x.name === 'Carbohydrates'; }) || {}).amount || 0),
              fat: Math.round((nutrients.find(function(x) { return x.name === 'Fat'; }) || {}).amount || 0)
            };
            await pb.collection('recipes').update(recipe.id, { nutrition: JSON.stringify(n) });
            setNutrition(n);
            setFetchingNutrition(false);
            return;
          }
        }
      }
      var title = recipe.title || '';
      var nutRes = await fetch(
        "https://api.spoonacular.com/recipes/guessNutrition?title=" + encodeURIComponent(title) + "&apiKey=" + apiKey
      );
      if (nutRes.ok) {
        var nutData = await nutRes.json();
        var n2 = {
          calories: Math.round((nutData.calories ? nutData.calories.value : 0) || 0),
          protein: Math.round((nutData.protein ? nutData.protein.value : 0) || 0),
          carbs: Math.round((nutData.carbs ? nutData.carbs.value : 0) || 0),
          fat: Math.round((nutData.fat ? nutData.fat.value : 0) || 0)
        };
        await pb.collection('recipes').update(recipe.id, { nutrition: JSON.stringify(n2) });
        setNutrition(n2);
      } else {
        setNutritionError('Could not fetch nutrition data.');
      }
    } catch (e) {
      console.error(e);
      setNutritionError('Error fetching nutrition.');
    } finally {
      setFetchingNutrition(false);
    }
  };

  var handleCalcFromIngredients = async function() {
    if (!recipe) return;
    setFetchingNutrition(true);
    setNutritionError('');
    try {
      var mod = await import('../utils/fetchNutritionFromIngredients');
      var fetchNutritionFromIngredients = mod.fetchNutritionFromIngredients;
      var ingredientList = parseIngredients(recipe.ingredients);
      var servingCount = recipe.servings || 1;

      if (ingredientList.length === 0) {
        setNutritionError('No ingredients found. Add ingredients first.');
        setFetchingNutrition(false);
        return;
      }

      console.log('Calculating from', ingredientList.length, 'ingredients...');
      var result = await fetchNutritionFromIngredients(ingredientList, servingCount);
      console.log('Result:', result);

      if (result && result.perServing) {
        var n = {
          calories: result.perServing.calories,
          protein: result.perServing.protein,
          carbs: result.perServing.carbs,
          fat: result.perServing.fat,
        };
        await pb.collection('recipes').update(recipe.id, { nutrition: JSON.stringify(n) });
        setNutrition(n);
      } else {
        setNutritionError('Could not calculate nutrition. Try manual entry.');
      }
    } catch (err) {
      console.error('Calc from ingredients error:', err);
      setNutritionError('Calculation failed. Try manual entry.');
    } finally {
      setFetchingNutrition(false);
    }
  };

  var handleSaveManualNutrition = async function() {
    try {
      await pb.collection('recipes').update(recipe.id, { nutrition: JSON.stringify(manualNutrition) });
      setNutrition(manualNutrition);
    } catch (err) {
      console.error('Save nutrition error:', err);
    }
  };

  var handleSaveRating = async function(newRating) {
    setRating(newRating);
    if (!recipe) return;
    try {
      await pb.collection('recipes').update(recipe.id, { rating: newRating });
    } catch (err) {
      console.error('Rating error:', err);
    }
  };

  var handleDeleteRecipe = async function() {
    try {
      await pb.collection('recipes').delete(recipe.id);
      navigate('/app/recipes', { replace: true });
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete recipe.');
    } finally {
      setShowDeleteModal(false);
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

  var ingredients = parseIngredients(recipe.ingredients);
  var tags = parseTags(recipe.tags);
  var steps = parseInstructions(recipe.instructions);
  var sourceName = getSourceName(recipe.source_url);
  var proxiedImage = getProxiedImage(recipe.image_url);

  var scaledQty = function(qty) {
    var num = parseFloat(qty);
    if (isNaN(num)) return qty;
    var result = num * servingsMultiplier;
    return result % 1 === 0 ? result : parseFloat(result.toFixed(2));
  };

  var gradientStyle = { background: 'linear-gradient(135deg, #10b981, #059669)' };

  return (
    <>
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
            onClick={function() { navigate(-1); }}
            className="flex items-center gap-2 text-gray-600 hover:text-green-600 transition-colors font-medium text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex items-center gap-2">
            <Link
              to={"/recipes/" + id + "/edit"}
              className="flex items-center gap-2 text-gray-500 hover:text-blue-500 border border-gray-200 rounded-xl px-3 py-1.5 text-sm font-medium hover:bg-blue-50 transition-colors"
            >
              <Pencil className="w-4 h-4" />
              Edit Recipe
            </Link>
            <button
              onClick={function() { setShowDeleteModal(true); }}
              className="flex items-center gap-2 text-gray-500 hover:text-red-500 border border-gray-200 rounded-xl px-3 py-1.5 text-sm font-medium hover:bg-red-50 transition-colors"
            >
              <X className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>

        {/* Two Column Layout */}
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
                    onError={function() { setImgError(true); }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-100 to-green-200">
                    <ChefHat className="w-20 h-20 text-green-400" />
                  </div>
                )}
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  <button
                    onClick={toggleFavorite}
                    disabled={favLoading}
                    className={"p-2.5 rounded-full shadow-md transition-all " + (favorited ? 'bg-green-500 text-white' : 'bg-white/90 text-gray-500 hover:text-green-500')}
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
                    {[1, 2, 4].map(function(m) {
                      return (
                        <button
                          key={m}
                          onClick={function() { setServingsMultiplier(m); }}
                          className={"text-xs px-2 py-0.5 rounded-full font-semibold transition-all " +
                            (servingsMultiplier === m
                              ? 'bg-green-600 text-white'
                              : 'bg-white text-green-600 border border-green-300 hover:bg-green-100')}
                        >
                          {m}×
                        </button>
                      );
                    })}
                  </div>
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
                  {[1, 2, 3, 4, 5].map(function(star) {
                    return (
                      <button
                        key={star}
                        onClick={function() { handleSaveRating(star); }}
                        onMouseEnter={function() { setHoverRating(star); }}
                        onMouseLeave={function() { setHoverRating(0); }}
                        className="p-0.5 transition-transform hover:scale-110"
                      >
                        <Star
                          className={"w-5 h-5 " +
                            (star <= (hoverRating || rating)
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-gray-300')}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {tags.map(function(tag, i) {
                    return (
                      <span
                        key={i}
                        className="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full border border-green-200"
                      >
                        {tag}
                      </span>
                    );
                  })}
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
                        {ingredients.map(function(ing, idx) {
                          var checked = !!checkedIngredients[idx];
                          return (
                            <li
                              key={idx}
                              onClick={function() { toggleIngredient(idx); }}
                              className={"flex items-center gap-3 px-6 py-3.5 cursor-pointer transition-colors hover:bg-gray-50 " + (checked ? 'opacity-50' : '')}
                            >
                              <div className={"w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all " +
                                (checked ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-green-400')}>
                                {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                              </div>
                              <span className={"text-sm text-gray-800 flex-1 " + (checked ? 'line-through text-gray-400' : '')}>
                                <span className="font-semibold text-gray-900">
                                  {scaledQty(ing.quantity)}{ing.unit ? ' ' + ing.unit : ''}
                                </span>
                                {' '}
                                {toTitleCase(ing.name)}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
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
                        {steps.map(function(step, idx) {
                          var done = !!checkedSteps[idx];
                          return (
                            <div
                              key={idx}
                              onClick={function() { toggleStep(idx); }}
                              className={"flex gap-4 px-6 py-4 cursor-pointer transition-colors hover:bg-gray-50 " + (done ? 'opacity-50' : '')}
                            >
                              <div className={"w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm transition-all mt-0.5 " +
                                (done ? 'bg-green-500 text-white' : 'bg-green-100 text-green-700')}>
                                {done ? <Check className="w-4 h-4" strokeWidth={3} /> : idx + 1}
                              </div>
                              <p className={"text-sm text-gray-700 leading-relaxed flex-1 pt-1 " + (done ? 'line-through text-gray-400' : '')}>
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
                  {getWWPoints(nutrition) !== null && (
                    <div className="col-span-2 text-center bg-purple-50 rounded-xl py-3 mx-5 mb-4">
                      <div className="text-xl font-bold text-purple-600">{getWWPoints(nutrition)}</div>
                      <div className="text-xs text-gray-500 mt-0.5">WW Points (est.)</div>
                    </div>
                  )}
                  <div className="px-5 pb-4">
                    <button
                      onClick={handleFetchNutrition}
                      disabled={fetchingNutrition}
                      className="w-full flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-green-600 py-2 rounded-xl font-medium transition-colors border border-gray-200 hover:border-green-300 mb-2"
                    >
                      {fetchingNutrition ? (
                        <><Loader2 className="w-3 h-3 animate-spin" /> Re-fetching...</>
                      ) : (
                        <><Zap className="w-3 h-3" /> Re-fetch Nutrition</>
                      )}
                    </button>
                    <button
                      onClick={handleCalcFromIngredients}
                      disabled={fetchingNutrition}
                      className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-semibold transition-colors disabled:opacity-60"
                    >
                      {fetchingNutrition ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Calculating...</>
                      ) : (
                        <><Utensils className="w-4 h-4" /> Calculate from Ingredients</>
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
                      className="w-full flex items-center justify-center gap-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl px-4 py-2 hover:bg-gray-50 transition-colors disabled:opacity-60 mb-2"
                    >
                      {fetchingNutrition ? (
                        <><Loader2 size={14} className="animate-spin" /> Fetching...</>
                      ) : (
                        <><Zap size={14} /> Re-fetch Nutrition</>
                      )}
                    </button>
                    <button
                      onClick={handleCalcFromIngredients}
                      disabled={fetchingNutrition}
                      className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-semibold transition-colors disabled:opacity-60"
                    >
                      {fetchingNutrition ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Calculating...</>
                      ) : (
                        <><Utensils className="w-4 h-4" /> Calculate from Ingredients</>
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
                          onChange={function(e) { setManualNutrition(function(prev) { return Object.assign({}, prev, { calories: Number(e.target.value) }); }); }}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Protein</label>
                        <input
                          type="number"
                          value={manualNutrition.protein}
                          onChange={function(e) { setManualNutrition(function(prev) { return Object.assign({}, prev, { protein: Number(e.target.value) }); }); }}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Carbs</label>
                        <input
                          type="number"
                          value={manualNutrition.carbs}
                          onChange={function(e) { setManualNutrition(function(prev) { return Object.assign({}, prev, { carbs: Number(e.target.value) }); }); }}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Fat</label>
                        <input
                          type="number"
                          value={manualNutrition.fat}
                          onChange={function(e) { setManualNutrition(function(prev) { return Object.assign({}, prev, { fat: Number(e.target.value) }); }); }}
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
                  No chef's note yet. Add one by editing this recipe!
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

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
            <div className="bg-white rounded-[28px] shadow-2xl p-6 w-full max-w-sm text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <X size={24} className="text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Recipe?</h3>
              <p className="text-sm text-gray-500 mb-6">Are you sure you want to delete this recipe? This action cannot be undone.</p>
              <div className="flex gap-3">
                <button
                  onClick={function() { setShowDeleteModal(false); }}
                  className="flex-1 py-2.5 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  No, Keep It
                </button>
                <button
                  onClick={handleDeleteRecipe}
                  className="flex-1 py-2.5 rounded-2xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors"
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom padding */}
        <div className="h-12 no-print" />
      </div>
    </>
  );
}
