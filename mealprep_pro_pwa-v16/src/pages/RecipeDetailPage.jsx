import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import pb from '../lib/pb';
import {
  ArrowLeft, Bookmark, BookmarkCheck, Pencil, Printer,
  Clock, Users, Globe, ChefHat, Check, Loader2
} from 'lucide-react';

const getProxiedImage = (url) => {
  if (!url) return null;
  return `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=1200&h=600&fit=cover&q=85`;
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

  useEffect(() => {
    const fetchRecipe = async () => {
      try {
        setLoading(true);
        const record = await pb.collection('recipes').getOne(id);
        setRecipe(record);
        setFavorited(record.favorited || false);
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
  const proxiedImage = getProxiedImage(recipe.image_url);

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
          .print-layout {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 2rem !important;
          }
          .print-hero {
            width: 160px !important;
            height: 120px !important;
            object-fit: cover !important;
            border-radius: 8px !important;
          }
          .recipe-card-print {
            box-shadow: none !important;
            border: none !important;
          }
        }
        @media screen {
          .print-only { display: none; }
        }
      `}</style>

      <div className="min-h-screen bg-gray-50" ref={printRef}>

        {/* Back button & actions — no-print on screen, but visible */}
        <div className="no-print sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-green-600 transition-colors font-medium text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleFavorite}
              disabled={favLoading}
              className={`p-2 rounded-full transition-all ${favorited ? 'text-green-600 bg-green-50' : 'text-gray-400 hover:text-green-500 hover:bg-green-50'}`}
              title={favorited ? 'Remove from favorites' : 'Add to favorites'}
            >
              {favorited ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
            </button>
            <Link
              to={`/recipes/${id}/edit`}
              className="p-2 rounded-full text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-all"
              title="Edit recipe"
            >
              <Pencil className="w-5 h-5" />
            </Link>
            <button
              onClick={handlePrint}
              className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
              title="Print recipe"
            >
              <Printer className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Hero Section */}
        <div className="relative w-full h-72 sm:h-96 md:h-[480px] bg-gray-200 overflow-hidden no-print">
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
          {/* Dark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
          {/* Title overlay */}
          <div className="absolute bottom-0 left-0 right-0 px-6 pb-6 pt-12">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white leading-tight drop-shadow-lg">
              {recipe.title}
            </h1>
          </div>
        </div>

        {/* Print header (only visible when printing) */}
        <div className="print-only p-6 border-b">
          <div className="flex items-start gap-4">
            {proxiedImage && (
              <img src={proxiedImage} alt={recipe.title} className="print-hero" />
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{recipe.title}</h1>
              {sourceName && <p className="text-sm text-gray-500 mt-1">{sourceName}</p>}
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-wrap items-center gap-3">
              {/* Servings with scaler */}
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

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
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
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 print-layout">

          {/* Ingredients */}
          <div className="recipe-card-print mb-8 md:mb-0">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Ingredients</h2>
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
              {/* Check all / uncheck all */}
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
          <div className="recipe-card-print">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Instructions</h2>
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

        {/* Bottom padding */}
        <div className="h-12 no-print" />
      </div>
    </>
  );
}