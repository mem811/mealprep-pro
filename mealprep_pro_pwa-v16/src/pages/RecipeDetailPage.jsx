import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import pb from '../lib/pb';
import {
  ArrowLeft, Heart, Pencil, Printer,
  Clock, Users, Globe, ChefHat, Check, Loader2, Zap, Star, Save
} from 'lucide-react';

var gradientStyle = { background: "linear-gradient(135deg, #10b981, #059669)" };

var getProxiedImage = function (url) {
  if (!url) return null;
  return "https://images.weserv.nl/?url=" + encodeURIComponent(url) + "&w=1200&h=600&fit=cover&q=85";
};

var toTitleCase = function (str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

var parseIngredients = function (raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
};

var parseTags = function (raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
};

var parseNutrition = function (raw) {
  if (!raw) return null;
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return null; }
};

var parseInstructions = function (raw) {
  if (!raw) return [];
  var text = typeof raw === 'string' ? raw : String(raw);
  return text
    .split(/\n+/)
    .map(function (s) { return s.replace(/^\d+\.\s*/, '').trim(); })
    .filter(Boolean);
};

var getSourceName = function (url) {
  if (!url) return null;
  try {
    var hostname = new URL(url).hostname.replace(/^www\./, '');
    return hostname;
  } catch { return url; }
};

export default function RecipeDetailPage() {
  var { id } = useParams();
  var navigate = useNavigate();
  var printRef = useRef(null);

  var [recipe, setRecipe] = useState(null);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState('');
  var [favorite, setFavorite] = useState(false);
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

  useEffect(function () {
    var fetchRecipe = async function () {
      try {
        setLoading(true);
        var record = await pb.collection('recipes').getOne(id);
        setRecipe(record);
        setFavorite(record.favorite || false);
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

  var toggleFavorite = async function () {
    if (!recipe) return;
    setFavLoading(true);
    try {
      var newVal = !favorite;
      await pb.collection('recipes').update(recipe.id, { favorite: newVal });
      setFavorite(newVal);
    } catch (e) {
      console.error(e);
    } finally {
      setFavLoading(false);
    }
  };

  var toggleIngredient = function (idx) {
    setCheckedIngredients(function (prev) { return Object.assign({}, prev, { [idx]: !prev[idx] }); });
  };

  var toggleStep = function (idx) {
    setCheckedSteps(function (prev) { return Object.assign({}, prev, { [idx]: !prev[idx] }); });
  };

  var handlePrint = function () {
    window.print();
  };

  var handleFetchNutrition = async function () {
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
          if (data.nutrition?.nutrients) {
            var nutrients = data.nutrition.nutrients;
            var n = {
              calories: Math.round((nutrients.find(function (x) { return x.name === 'Calories'; }) || {}).amount || 0),
              protein: Math.round((nutrients.find(function (x) { return x.name === 'Protein'; }) || {}).amount || 0),
              carbs: Math.round((nutrients.find(function (x) { return x.name === 'Carbohydrates'; }) || {}).amount || 0),
              fat: Math.round((nutrients.find(function (x) { return x.name === 'Fat'; }) || {}).amount || 0)
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
          calories: Math.round(nutData.calories?.value || 0),
          protein: Math.round(nutData.protein?.value || 0),
          carbs: Math.round(nutData.carbs?.value || 0),
          fat: Math.round(nutData.fat?.value || 0)
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

  var handleSaveRating = async function (newRating) {
    setRating(newRating);
    if (!recipe) return;
    try {
      await pb.collection('recipes').update(recipe.id, { rating: newRating });
    } catch (e) {
      console.error('Save rating error:', e);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <p className="text-red-500 text-lg font-semibold mb-4">{error || 'Recipe not found.'}</p>
        <button onClick={function () { navigate('/recipes'); }} className="text-emerald-600 font-medium hover:underline">
          ← Back to Recipes
        </button>
      </div>
    );
  }

  var ingredients = parseIngredients(recipe.ingredients);
  var instructions = parseInstructions(recipe.instructions);
  var tags = parseTags(recipe.tags);
  var proxied = getProxiedImage(recipe.image_url);
  var sourceName = getSourceName(recipe.source_url);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6" ref={printRef}>

      {/* Top Bar */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={function () { navigate('/recipes'); }}
          className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 text-sm font-medium transition-colors"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <Link
          to={"/recipes/" + recipe.id + "/edit"}
          className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 text-sm font-medium border border-gray-200 px-3 py-1.5 rounded-xl transition-colors"
        >
          <Pencil size={14} />
          Edit Recipe
        </Link>
      </div>

      {/* Hero Section */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">

        {/* Image */}
        <div className="lg:col-span-3 relative rounded-3xl overflow-hidden bg-emerald-50 h-72 lg:h-96">
          {proxied && !imgError ? (
            <img
              src={proxied}
              alt={recipe.title}
              className="w-full h-full object-cover"
              onError={function () { setImgError(true); }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ChefHat size={48} className="text-emerald-300" />
            </div>
          )}

          {/* Heart + Print buttons */}
          <div className="absolute top-3 right-3 flex gap-2">
            <button
              onClick={toggleFavorite}
              disabled={favLoading}
              className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm transition-all hover:scale-110"
            >
              <Heart
                size={20}
                className={favorite ? "text-red-500 fill-red-500" : "text-gray-500"}
              />
            </button>
            <button
              onClick={handlePrint}
              className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm transition-all hover:scale-110"
            >
              <Printer size={20} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Nutrition Card */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-1">NUTRITION FACTS</h3>
            <p className="text-xs text-gray-400 mb-4">Per serving</p>

            {nutrition ? (
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-emerald-50 rounded-2xl p-3 text-center">
                  <p className="text-lg font-bold text-emerald-700">{nutrition.calories}</p>
                  <p className="text-[10px] text-gray-500 font-semibold">Calories</p>
                </div>
                <div className="bg-blue-50 rounded-2xl p-3 text-center">
                  <p className="text-lg font-bold text-blue-700">{nutrition.protein}g</p>
                  <p className="text-[10px] text-gray-500 font-semibold">Protein</p>
                </div>
                <div className="bg-yellow-50 rounded-2xl p-3 text-center">
                  <p className="text-lg font-bold text-yellow-700">{nutrition.carbs}g</p>
                  <p className="text-[10px] text-gray-500 font-semibold">Carbs</p>
                </div>
                <div className="bg-red-50 rounded-2xl p-3 text-center">
                  <p className="text-lg font-bold text-red-400">{nutrition.fat}g</p>
                  <p className="text-[10px] text-gray-500 font-semibold">Fat</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400 mb-4">No nutrition data yet.</p>
            )}

            <button
              onClick={handleFetchNutrition}
              disabled={fetchingNutrition}
              className="w-full flex items-center justify-center gap-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl px-4 py-2 hover:bg-gray-50 transition-colors"
            >
              {fetchingNutrition ? (
                <><Loader2 size={14} className="animate-spin" /> Fetching...</>
              ) : (
                <><Zap size={14} /> Re-fetch Nutrition</>
              )}
            </button>
            {nutritionError && (
              <p className="text-xs text-red-500 mt-2 text-center">{nutritionError}</p>
            )}
          </div>

          {/* Chef's Note */}
          <div className="mt-4 rounded-3xl p-5" style={gradientStyle}>
            <h3 className="text-sm font-bold text-white mb-1">✨ Chef's Note</h3>
            <p className="text-sm text-emerald-100 italic">
              {recipe.chef_note || "No chef's note yet. Add one by editing this recipe!"}
            </p>
          </div>
        </div>
      </div>

      {/* Title & Meta */}
      <h1 className="text-3xl font-bold text-gray-900 mb-4">{recipe.title}</h1>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        {recipe.servings && (
          <div className="flex items-center gap-2 text-sm text-gray-500 border border-gray-200 rounded-full px-3 py-1.5">
            <Users size={14} />
            {recipe.servings} servings
            <div className="flex gap-1 ml-1">
              {[1, 2, 4].map(function (m) {
                return (
                  <button
                    key={m}
                    onClick={function () { setServingsMultiplier(m); }}
                    style={servingsMultiplier === m ? gradientStyle : {}}
                    className={"w-7 h-7 rounded-full text-xs font-bold transition-colors " +
                      (servingsMultiplier === m
                        ? "text-white"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200")}
                  >
                    {m}x
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {recipe.prep_time > 0 && (
          <div className="flex items-center gap-1.5 text-sm text-gray-500 border border-gray-200 rounded-full px-3 py-1.5">
            <Clock size={14} />
            Prep: {recipe.prep_time} min
          </div>
        )}
        {recipe.cook_time > 0 && (
          <div className="flex items-center gap-1.5 text-sm text-gray-500 border border-gray-200 rounded-full px-3 py-1.5">
            <Clock size={14} />
            Cook: {recipe.cook_time} min
          </div>
        )}
      </div>

      {sourceName && (
        <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-4">
          <Globe size={14} />
          <a href={recipe.source_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
            {sourceName}
          </a>
        </div>
      )}

      {/* Rating */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-sm font-bold text-gray-600">RATING</span>
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map(function (s) {
            return (
              <button
                key={s}
                onClick={function () { handleSaveRating(s); }}
                onMouseEnter={function () { setHoverRating(s); }}
                onMouseLeave={function () { setHoverRating(0); }}
                className="transition-transform hover:scale-110"
              >
                <Star
                  size={22}
                  className={(hoverRating || rating) >= s ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {tags.map(function (tag, i) {
            return (
              <span key={i} className="bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full">
                {toTitleCase(tag)}
              </span>
            );
          })}
        </div>
      )}

      {/* Ingredients & Instructions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Ingredients */}
        <div>
          <div className="flex items-baseline gap-2 mb-4">
            <div className="w-1 h-6 rounded-full" style={gradientStyle} />
            <h2 className="text-xl font-bold text-emerald-700">Ingredients</h2>
            <span className="text-xs text-gray-400 font-semibold">{ingredients.length} items</span>
          </div>
          <div className="space-y-2">
            {ingredients.map(function (ing, idx) {
              var text = typeof ing === 'string' ? ing : (ing.original || ing.name || '');
              return (
                <button
                  key={idx}
                  onClick={function () { toggleIngredient(idx); }}
                  className={"w-full text-left flex items-start gap-3 p-2.5 rounded-xl transition-colors " +
                    (checkedIngredients[idx] ? "bg-emerald-50 line-through text-gray-400" : "hover:bg-gray-50")}
                >
                  <div className={"w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center mt-0.5 " +
                    (checkedIngredients[idx] ? "border-emerald-500 bg-emerald-500" : "border-gray-300")}
                  >
                    {checkedIngredients[idx] && <Check size={12} className="text-white" />}
                  </div>
                  <span className="text-sm">{text}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Instructions */}
        <div>
          <div className="flex items-baseline gap-2 mb-4">
            <div className="w-1 h-6 rounded-full" style={gradientStyle} />
            <h2 className="text-xl font-bold text-emerald-700">Instructions</h2>
            <span className="text-xs text-gray-400 font-semibold">{instructions.length} steps</span>
          </div>
          <div className="space-y-3">
            {instructions.map(function (step, idx) {
              return (
                <button
                  key={idx}
                  onClick={function () { toggleStep(idx); }}
                  className={"w-full text-left flex items-start gap-3 p-3 rounded-xl transition-colors " +
                    (checkedSteps[idx] ? "bg-emerald-50" : "hover:bg-gray-50")}
                >
                  <div
                    className={"w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold " +
                      (checkedSteps[idx] ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-500")}
                    style={checkedSteps[idx] ? gradientStyle : {}}
                  >
                    {checkedSteps[idx] ? <Check size={14} /> : idx + 1}
                  </div>
                  <span className={"text-sm leading-relaxed " + (checkedSteps[idx] ? "line-through text-gray-400" : "text-gray-700")}>
                    {step}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
