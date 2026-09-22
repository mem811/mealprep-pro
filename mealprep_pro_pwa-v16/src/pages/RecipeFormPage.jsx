import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import pb from '../lib/pb';
import { Plus, Trash2, ArrowLeft, Loader2, Download, Lock, X, ChefHat, Clock, ClipboardPaste, ChevronDown, ChevronUp } from 'lucide-react';
import { fetchNutritionFromIngredients } from '../utils/fetchNutritionFromIngredients';
import { parseRecipeText, parseBookmarkletPayload, parseIngredientLine, normalizeUnit, parseNutritionObject, decideNutrition } from '../lib/recipeParse';
import SaveButtonInstall from '../components/SaveButtonInstall';

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
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [instructions, setInstructions] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
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

  const [importNotice, setImportNotice] = useState(null);

  // Ingredients as they were when an existing recipe was opened, so a save
  // can tell whether published nutrition still applies
  const originalIngredientsKey = useRef(null);
  const ingredientsKey = (list) => JSON.stringify(
    (list || [])
      .filter((i) => i && i.name && i.name.trim())
      .map((i) => [i.name.trim().toLowerCase(), String(i.quantity ?? '').trim(), i.unit || ''])
  );
  const readNutrition = (raw) => {
    if (!raw) return null;
    if (typeof raw === 'object') return raw;
    try { return JSON.parse(raw); } catch { return null; }
  };
  // Nutrition published by the recipe itself, tagged so saving won't overwrite it
  const setPublishedNutrition = (n, recipeServings) => {
    setNutrition(n ? JSON.stringify({ ...n, source: 'recipe', servings: Number(recipeServings) || null }) : null);
  };
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteNote, setPasteNote] = useState(null);

  // Drop parsed fields into the form. Only overwrites what was actually found,
  // so a sparse paste doesn't wipe fields the person already filled in.
  const applyParsed = (p) => {
    if (p.title) setTitle(p.title);
    if (p.servings) setServings(p.servings);
    if (p.prep_time) setPrepTime(p.prep_time);
    if (p.cook_time) setCookTime(p.cook_time);
    if (p.image_url) setImageUrl(p.image_url);
    if (p.source_url) setSourceUrl(p.source_url);
    if (p.ingredients?.length) setIngredients(p.ingredients);
    if (p.instructions) setInstructions(p.instructions);
    if (p.nutrition) setPublishedNutrition(p.nutrition, p.servings);
  };

  // Browser Save button lands here as /app/recipes/new#mpp=<recipe data>
  useEffect(() => {
    if (isEdit) return;
    const match = window.location.hash.match(/^#mpp=(.+)$/);
    if (!match) return;

    // Clear it right away so a refresh doesn't re-import
    window.history.replaceState(null, '', window.location.pathname + window.location.search);

    if (!isPro) {
      setImportError('Saving recipes from other sites is a Pro feature. Upgrade to unlock it.');
      return;
    }

    try {
      let raw;
      try { raw = JSON.parse(decodeURIComponent(match[1])); } catch { raw = JSON.parse(match[1]); }
      const parsed = parseBookmarkletPayload(raw);
      if (!parsed || (!parsed.title && parsed.ingredients.length === 0)) throw new Error('empty');
      applyParsed(parsed);
      setImportNotice('Recipe grabbed from your browser. Look it over, then save.');
    } catch (err) {
      console.error('Browser import error:', err);
      setImportError("Couldn't read that recipe. Highlight the recipe text on the page and click the Save button again.");
    }
  }, [isEdit, isPro]);

  const handlePasteParse = () => {
    const parsed = parseRecipeText(pasteText);
    if (!parsed.title && parsed.ingredients.length === 0 && !parsed.instructions) {
      setPasteNote("Couldn't find a recipe in that text. Try including the ingredient list.");
      return;
    }
    // If they got here after a failed URL import, keep that URL as the source
    if (!sourceUrl && importUrl.trim()) parsed.source_url = importUrl.trim();

    applyParsed(parsed);
    setPasteNote(null);
    setPasteText('');
    setShowPaste(false);
    setImportError(null);
    const count = parsed.ingredients.length;
    setImportNotice(
      `Filled in ${count} ingredient${count === 1 ? '' : 's'}${parsed.instructions ? ' and the steps' : ''}. Check everything over${parsed.title ? '' : ' and add a title'}, then save.`
    );
  };

  useEffect(() => {
    if (isEdit) {
      (async () => {
        try {
          const record = await pb.collection('recipes').getOne(id);
          setTitle(record.title || '');
          setServings(record.servings || 4);
          setPrepTime(record.prep_time || '');
          setCookTime(record.cook_time || '');
          setInstructions(record.instructions || '');
          setImageUrl(record.image_url || '');
          setSourceUrl(record.source_url || '');

          if (record.image_file) {
            setImagePreview(pb.getFileUrl(record, record.image_file));
          }

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
          originalIngredientsKey.current = ingredientsKey(parsedIngredients);
          setNutrition(record.nutrition
            ? (typeof record.nutrition === 'string' ? record.nutrition : JSON.stringify(record.nutrition))
            : null);
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
    setImportNotice(null);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(
        'https://n8n.srv1052955.hstgr.cloud/webhook/recipe-extract',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: importUrl.trim() }),
          signal: controller.signal
        }
      );
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`Import error: ${res.status}`);
      const payload = await res.json();
      const data = Array.isArray(payload) ? payload[0] : payload;

      // The extractor reports failure in the body, not the status code.
      if (data?.ok === false || !data?.title) {
        setImportError("That site wouldn't let us read the recipe. Paste the recipe text below, or use the Save button while you're on the recipe page.");
        setShowPaste(true);
        return;
      }

      setTitle(data.title || '');
      setServings(data.servings || 4);
      setPrepTime(data.prep_time || '');
      setCookTime(data.cook_time || '');
      setImageUrl(data.image_url || '');
      setSourceUrl(data.source_url || importUrl.trim());

      if (data.ingredients?.length) {
        setIngredients(
          data.ingredients
            .map((ing) => {
              if (typeof ing === 'string') return parseIngredientLine(ing);
              return { name: ing.name || '', quantity: String(ing.quantity || ''), unit: normalizeUnit(ing.unit) };
            })
            .filter((ing) => ing && ing.name)
        );
      }
      if (data.instructions) {
        setInstructions(data.instructions);
      }
      // The importer sends zeros when a page publishes no nutrition
      setPublishedNutrition(parseNutritionObject(data.nutrition), data.servings);
      setImportUrl('');
      setImportNotice('Recipe imported. Look it over, then save.');
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        setImportError('That site took too long to respond. Try again, or paste the recipe text below.');
      } else {
        setImportError("That site wouldn't let us read the recipe. Paste the recipe text below, or use the Save button while you're on the recipe page.");
      }
      setShowPaste(true);
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
      let payload;

      if (imageFile) {
        payload = new FormData();
        payload.append('user', pb.authStore.model.id);
        payload.append('title', title.trim());
        payload.append('servings', Number(servings));
        payload.append('prep_time', Number(prepTime) || 0);
        payload.append('cook_time', Number(cookTime) || 0);
        payload.append('instructions', instructions.trim());
        payload.append('ingredients', JSON.stringify(ingredients.filter((i) => i.name.trim())));
        payload.append('tags', JSON.stringify(tags));
        payload.append('image_file', imageFile);
        payload.append('image_url', imageUrl || '');
        if (sourceUrl) payload.append('source_url', sourceUrl);
        if (nutrition) payload.append('nutrition', nutrition);
      } else {
        payload = {
          user: pb.authStore.model.id,
          title: title.trim(),
          servings: Number(servings),
          prep_time: Number(prepTime) || 0,
          cook_time: Number(cookTime) || 0,
          instructions: instructions.trim(),
          ingredients: JSON.stringify(ingredients.filter((i) => i.name.trim())),
          tags: JSON.stringify(tags),
          ...(imageUrl ? { image_url: imageUrl } : {}),
          ...(sourceUrl ? { source_url: sourceUrl } : {}),
          ...(nutrition ? { nutrition } : {}),
        };
      }

      if (isEdit) {
        var savedRecipe = await pb.collection('recipes').update(id, payload);
      } else {
        if (sourceUrl) {
          const existing = await pb.collection('recipes').getList(1, 1, {
            filter: `user = "${pb.authStore.model.id}" && source_url = "${sourceUrl}"`,
          });
          if (existing.items.length > 0) {
            setSubmitError('This recipe is already in your collection!');
            setLoading(false);
            return;
          }
        }
        var savedRecipe = await pb.collection('recipes').create(payload);
      }
      // ── Fix image URL after file upload ──
        if (imageFile && savedRecipe && savedRecipe.image_file) {
          var fileUrl = pb.getFileUrl(savedRecipe, savedRecipe.image_file);
          await pb.collection('recipes').update(savedRecipe.id, { image_url: fileUrl });
          console.log('Image URL set:', fileUrl);
        }
// ── Nutrition ──
// Numbers published by the recipe win over an estimate. They're kept while
// they still describe this recipe, scaled if only the servings changed, and
// replaced with an estimate if the ingredients were edited.
const ingredientList = ingredients.filter(i => i.name.trim());
const servingCount = Number(servings) || 1;
const recipeId = savedRecipe?.id || id;
const decision = decideNutrition({
  current: readNutrition(nutrition),
  servingCount,
  ingredientsChanged: isEdit && originalIngredientsKey.current !== null
    && originalIngredientsKey.current !== ingredientsKey(ingredientList),
});

try {
  if (decision.action !== 'estimate') {
    await pb.collection('recipes').update(recipeId, { nutrition: JSON.stringify(decision.nutrition) });
  } else if (ingredientList.length > 0) {
    const { fetchNutritionFromIngredients } = await import('../utils/fetchNutritionFromIngredients');
    const result = await fetchNutritionFromIngredients(ingredientList, servingCount);
    if (result?.perServing) {
      await pb.collection('recipes').update(recipeId, {
        nutrition: JSON.stringify({
          calories: result.perServing.calories,
          protein: result.perServing.protein,
          carbs: result.perServing.carbs,
          fat: result.perServing.fat,
          source: 'estimate',
          servings: servingCount,
        }),
      });
    }
  }
} catch (nutritionErr) {
  console.error('Nutrition save error (non-blocking):', nutritionErr);
}

navigate('/app/recipes', { replace: true });
    } catch (err) {
      console.error('Full error:', err.response);
      setSubmitError(err?.response?.message || err?.message || 'Failed to save recipe.');
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
        <Link to="/app/recipes" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
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
              isPro ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {importing ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Import
          </button>
        </div>
        {importError && <p className="text-red-500 text-xs mt-2">{importError}</p>}
        {importNotice && <p className="text-green-700 text-xs mt-2 font-medium">{importNotice}</p>}
        {!isEdit && readNutrition(nutrition)?.source === 'recipe' && (
          <p className="text-xs text-gray-500 mt-1">
            Using the recipe's own nutrition: {readNutrition(nutrition).calories} cal per serving.
          </p>
        )}
        {!isPro && <p className="text-xs text-gray-400 mt-2">Upgrade to Pro to import recipes from any URL.</p>}
        {isPro && <SaveButtonInstall />}
      </div>

      {/* Paste recipe text — free for everyone, and the fallback when a site blocks import */}
      {!isEdit && (
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white">
          <button
            type="button"
            onClick={() => setShowPaste((s) => !s)}
            className="w-full flex items-center gap-2 p-4 text-sm font-semibold text-gray-800"
          >
            <ClipboardPaste size={18} className="text-green-600" />
            Paste recipe text
            <span className="ml-auto text-gray-400">
              {showPaste ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </span>
          </button>
          {showPaste && (
            <div className="px-4 pb-4 space-y-3">
              <p className="text-xs text-gray-500">
                Copy a recipe from any website, note, or message and paste it here. We'll sort it into
                ingredients and steps for you to check.
              </p>
              <textarea
                rows={8}
                value={pasteText}
                onChange={(e) => { setPasteText(e.target.value); setPasteNote(null); }}
                placeholder={'Recipe name\n\nIngredients\n2 cups flour\n1 tsp salt\n\nInstructions\n1. Mix everything together...'}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              />
              {pasteNote && <p className="text-red-500 text-xs">{pasteNote}</p>}
              <button
                type="button"
                onClick={handlePasteParse}
                disabled={!pasteText.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm bg-green-500 hover:bg-green-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ClipboardPaste size={16} />
                Fill in the form
              </button>
            </div>
          )}
        </div>
      )}

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

        {/* Servings + Prep Time + Cook Time */}
        <div className="grid grid-cols-3 gap-3">
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
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              <span className="flex items-center gap-1"><Clock size={13} /> Prep (min)</span>
            </label>
            <input
              type="number"
              min="0"
              value={prepTime}
              onChange={(e) => setPrepTime(e.target.value)}
              placeholder="e.g. 15"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              <span className="flex items-center gap-1"><Clock size={13} /> Cook (min)</span>
            </label>
            <input
              type="number"
              min="0"
              value={cookTime}
              onChange={(e) => setCookTime(e.target.value)}
              placeholder="e.g. 30"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"
            />
          </div>
        </div>

        {/* Image */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Recipe Image</label>

          <label className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors text-sm text-gray-500 hover:text-green-600 mb-2">
            <ChefHat size={16} />
            {imageFile ? imageFile.name : 'Upload a photo from your device'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  setImageFile(file);
                  setImagePreview(URL.createObjectURL(file));
                  setImageUrl('');
                }
              }}
            />
          </label>

          <div className="flex items-center gap-2 my-2">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">or paste URL</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <input
            type="url"
            value={imageUrl}
            onChange={(e) => { setImageUrl(e.target.value); setImageFile(null); setImagePreview(''); }}
            placeholder="https://..."
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"
          />

          {(imagePreview || imageUrl) && (
            <div className="mt-2 h-32 rounded-xl overflow-hidden bg-gray-100 relative">
              <img
                src={imagePreview || 'https://images.weserv.nl/?url=' + encodeURIComponent(imageUrl) + '&w=400&h=200&fit=cover&q=80'}
                alt="Preview"
                className="w-full h-full object-cover"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              {imageFile && (
                <button
                  type="button"
                  onClick={() => { setImageFile(null); setImagePreview(''); }}
                  className="absolute top-2 right-2 bg-white/80 rounded-full p-1 hover:bg-white"
                >
                  <X size={14} className="text-gray-600" />
                </button>
              )}
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
              <span key={tag} className="flex items-center gap-1 bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                {tag}
                <button type="button" onClick={() => toggleTag(tag)} className="hover:text-green-900 transition-colors">
                  <X size={12} />
                </button>
              </span>
            ))}
            {tags.length === 0 && <span className="text-gray-400 text-xs self-center">Select tags below...</span>}
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

        {/* Duplicate Warning */}
        {duplicateRecipe && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-sm">
            <p className="font-semibold mb-1">Looks like you already have this recipe!</p>
            <Link to={`/app/recipes/${duplicateRecipe.id}`} className="text-green-600 underline font-medium">
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
