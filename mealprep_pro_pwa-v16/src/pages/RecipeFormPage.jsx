import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import pb from '../lib/pb';
import { Plus, Trash2, ArrowLeft, Loader2, Download, Lock, X, ChefHat } from 'lucide-react';

const TAG_OPTIONS = [
  'Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert', 'Sides', 'Soups',
  'Vegetarian', 'Vegan', 'Gluten-Free', 'High-Protein', 'Low-Carb',
  'Quick (under 30 min)', 'Meal Prep', 'Bread'
];

const UNITS = ['cup', 'tbsp', 'tsp', 'oz', 'lb', 'g', 'kg', 'ml', 'l', 'piece', 'slice', 'clove', 'bunch', 'can', 'package', 'pinch', 'to taste'];

export default function RecipeFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [title, setTitle] = useState('');
  const [servings, setServings] = useState(4);
  const [instructions, setInstructions] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [tags, setTags] = useState([]);
  const [ingredients, setIngredients] = useState([{ name: '', quantity: '', unit: 'cup' }]);

  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(isEdit);
  const [error, setError] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [duplicateRecipe, setDuplicateRecipe] = useState(null);

  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState(null);
  const [nutrition, setNutrition] = useState(null);

  const userPlan = pb.authStore.model?.plan || 'free';
  const isPro = userPlan === 'pro';

  useEffect(() => {
    if (isEdit) {
      (async () => {
        try {
          const record = await pb.collection('recipes').getOne(id);
          setTitle(record.title || '');
          setServings(record.servings || 4);
          setInstructions(record.instructions || '');
          setImageUrl(record.image_url || '');
          setSourceUrl(record.source_url || '');

          let parsedTags = [];
          if (typeof record.tags === 'string') {
            try { parsedTags = JSON.parse(record.tags); } catch { parsedTags = []; }
          } else if (Array.isArray(record.tags)) {
            parsedTags = record.tags;
          }
          setTags(parsedTags);

          let parsedIngredients = [];
          if (typeof record.ingredients === 'string') {
            try { parsedIngredients = JSON.parse(record.ingredients); } catch { parsedIngredients = []; }
          } else if (Array.isArray(record.ingredients)) {
            parsedIngredients = record.ingredients;
          }
          if (parsedIngredients.length > 0) {
            setIngredients(parsedIngredients);
          }
        } catch (err) {
          console.error('Error loading recipe:', err);
          setError('Failed to load recipe.');
        } finally {
          setPageLoading(false);
        }
      })();
    }
  }, [id, isEdit]);

  const handleIngredientChange = (index, field, value) => {
    setIngredients((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addIngredient = () => {
    setIngredients((prev) => [...prev, { name: '', quantity: '', unit: 'cup' }]);
  };

  const removeIngredient = (index) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleTag = (tag) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleImport = async () => {
    if (!isPro) {
      setImportError('Recipe import is a Pro feature. Upgrade to unlock it.');
      return;
    }
    if (!importUrl.trim()) {
      setImportError('Please enter a URL.');
      return;
    }
    setImporting(true);
    setImportError(null);

  
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
  const res = await fetch(
    'https://n8n.srv1052955.hstgr.cloud/webhook/5ea8e8c8-94bf-41e7-8ffa-5dd843cdfe13',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: importUrl.trim() }),
      signal: controller.signal
    }
  );
  clearTimeout(timeout);
  if (!res.ok) throw new Error(`Import error: ${res.status}`);
  const data = await res.json();
    

      setTitle(data.title || '');
setServings(data.servings || 4);
setImageUrl(data.image_url || '');
setSourceUrl(data.source_url || importUrl.trim());

if (data.ingredients?.length) {
  setIngredients(
    data.ingredients.map((ing) => {
      if (typeof ing === 'string') {
        // n8n returns ingredients as strings like "1 cup flour"
        return { name: ing, quantity: '', unit: '' };
      }
      return { name: ing.name || '', quantity: String(ing.quantity || ''), unit: ing.unit || '' };
    })
  );
}
// n8n doesn't return nutrition - user can fetch it from the recipe detail page

if (data.instructions) {
  // n8n returns instructions as a newline-separated string
    if (data.instructions) {
      setInstructions(data.instructions);
    }

    setImportUrl('');
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      setImportError('Request timed out. Please try again.');
    } else {
      setImportError('Failed to import recipe. Check the URL and try again.');
    }
    console.error('Import error:', err);
  } finally {
    setImporting(false);
  }
};

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    setDuplicateRecipe(null);

    if (!title.trim()) {
      setSubmitError('Recipe title is required.');
      return;
    }

    if (sourceUrl && !isEdit) {
      try {
        const dupeCheck = await pb.collection('recipes').getList(1, 1, {
          filter: `user = "${pb.authStore.model.id}" && source_url = "${sourceUrl}"`,
        });
        if (dupeCheck.items.length > 0) {
          setDuplicateRecipe(dupeCheck.items[0]);
          return;
        }
      } catch (err) {
        console.error('Duplicate check error:', err);
      }
    }

    setLoading(true);
    try {
      const data = {
  user: pb.authStore.model.id,
  title: title.trim(),
  servings: Number(servings),
  instructions: instructions.trim(),
  ingredients: JSON.stringify(ingredients.filter((i) => i.name.trim())),
  tags: JSON.stringify(tags),
  ...(imageUrl ? { image_url: imageUrl } : {}),
  ...(sourceUrl ? { source_url: sourceUrl } : {}),
  ...(nutrition ? { nutrition } : {}),
};

      console.log('Recipe data being sent:', JSON.stringify(data));

      if (isEdit) {
  await pb.collection('recipes').update(id, data);
} else {
  // Check for duplicate recipe by source URL
  if (data.source_url) {
    const userId = pb.authStore.model.id;
    const existing = await pb.collection('recipes').getList(1, 1, {
      filter: `user = "${userId}" && source_url = "${data.source_url}"`,
    });
    if (existing.items.length > 0) {
      setSubmitError('This recipe is already in your collection!');
      setLoading(false);
      return;
    }
  }
  await pb.collection('recipes').create(data);
}

      navigate('/recipes');
    } catch (err) {
      console.error('Full error:', err.response);
      setSubmitError(
        err?.response?.message || err?.message || 'Failed to save recipe.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-green-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/recipes" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowLeft size={20} className="text-gray-600" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? 'Edit Recipe' : 'Add Recipe'}
        </h1>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-4 text-sm">{error}</div>
      )}

      {/* Import from URL */}
      <div className={`mb-6 p-4 rounded-2xl border ${isPro ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
        <div className="flex items-center gap-2 mb-3">
          <Download size={18} className={isPro ? 'text-green-600' : 'text-gray-400'} />
          <span className="font-semibold text-gray-800 text-sm">Import from URL</span>
          {!isPro && (
            <span className="ml-auto flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
              <Lock size={11} /> Pro
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <input
            type="url"
            placeholder="Paste recipe URL..."
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
            disabled={!isPro}
          />
          <button
            type="button"
            onClick={handleImport}
            disabled={importing}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-colors ${
              isPro
                ? 'bg-green-500 hover:bg-green-600 text-white'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {importing ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Import
          </button>
        </div>
        {importError && (
          <p className="text-red-500 text-xs mt-2">{importError}</p>
        )}
        {!isPro && (
          <p className="text-xs text-gray-400 mt-2">Upgrade to Pro to import recipes from any URL.</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Title */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Recipe Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Avocado Toast"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"
            required
          />
        </div>

        {/* Servings */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Servings</label>
          <input
            type="number"
            min="1"
            value={servings}
            onChange={(e) => setServings(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"
          />
        </div>

        {/* Image URL */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Image URL</label>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://..."
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"
          />
          {imageUrl && (
            <div className="mt-2 h-32 rounded-xl overflow-hidden bg-gray-100">
              <img
                src={`https://images.weserv.nl/?url=${encodeURIComponent(imageUrl)}&w=400&h=200&fit=cover&q=80`}
                alt="Preview"
                className="w-full h-full object-cover"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
          )}
        </div>

        {/* Source URL */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Source URL</label>
          <input
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://..."
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tags</label>
          <div className="flex flex-wrap gap-2 p-3 border border-gray-200 rounded-xl bg-white min-h-[48px]">
            {tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className="hover:text-green-900 transition-colors"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            {tags.length === 0 && (
              <span className="text-gray-400 text-xs self-center">Select tags below...</span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {TAG_OPTIONS.filter((t) => !tags.includes(t)).map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-green-700 transition-colors border border-gray-200"
              >
                + {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Ingredients */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Ingredients</label>
          <div className="space-y-2">
            {ingredients.map((ing, index) => (
              <div key={index} className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Quantity"
                  value={ing.quantity}
                  onChange={(e) => handleIngredientChange(index, 'quantity', e.target.value)}
                  className="w-20 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
                <select
                  value={ing.unit}
                  onChange={(e) => handleIngredientChange(index, 'unit', e.target.value)}
                  className="w-24 px-2 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Ingredient name"
                  value={ing.name}
                  onChange={(e) => handleIngredientChange(index, 'name', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
                {ingredients.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeIngredient(index)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addIngredient}
            className="mt-2 flex items-center gap-2 text-green-600 hover:text-green-700 text-sm font-medium px-3 py-2 hover:bg-green-50 rounded-xl transition-colors"
          >
            <Plus size={16} />
            Add Ingredient
          </button>
        </div>

        {/* Instructions */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Instructions</label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Write the steps..."
            rows={6}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 text-sm resize-none"
          />
        </div>

        {/* Submit Error / Duplicate Warning */}
        {duplicateRecipe && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-sm">
            <p className="font-semibold mb-1">Looks like you already have this recipe!</p>
            <Link
              to={`/recipes/${duplicateRecipe.id}`}
              className="text-green-600 underline font-medium"
            >
              View existing recipe →
            </Link>
          </div>
        )}

        {submitError && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm">{submitError}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-semibold transition-colors disabled:opacity-60"
        >
          {loading ? (
            <><Loader2 size={18} className="animate-spin" /> Saving...</>
          ) : (
            <><ChefHat size={18} /> {isEdit ? 'Update Recipe' : 'Save Recipe'}</>
          )}
        </button>
      </form>
    </div>
  );
}
