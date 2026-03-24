import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import pb from '../lib/pb';
import { ArrowLeft, Plus, Trash2, Upload, Link, Loader2, Lock } from 'lucide-react';

const UNITS = ['g', 'kg', 'ml', 'l', 'cup', 'tbsp', 'tsp', 'oz', 'lb', 'piece', 'slice', 'clove', 'handful', ''];

export default function RecipeFormPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);
  const isPro = user?.plan === 'pro';

  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  const [form, setForm] = useState({
    title: '',
    servings: 2,
    instructions: '',
    image_url: '',
    source_url: '',
    tags: '',
    ingredients: [{ name: '', quantity: '', unit: 'g' }],
  });

  useEffect(() => {
    if (isEditing) {
      fetchRecipe();
    }
  }, [id]);

  const fetchRecipe = async () => {
    try {
      const record = await pb.collection('recipes').getOne(id);
      setForm({
        title: record.title || '',
        servings: record.servings || 2,
        instructions: record.instructions || '',
        image_url: record.image_url || '',
        source_url: record.source_url || '',
        tags: Array.isArray(record.tags) ? record.tags.join(', ') : record.tags || '',
        ingredients: record.ingredients?.length
          ? record.ingredients
          : [{ name: '', quantity: '', unit: 'g' }],
      });
    } catch (err) {
      console.error('Failed to fetch recipe:', err);
    }
  };

  const handleImport = async () => {
    if (!isPro) {
      setShowUpgradePrompt(true);
      return;
    }
    if (!importUrl.trim()) {
      setImportError('Please enter a recipe URL.');
      return;
    }

    const apiKey = import.meta.env.VITE_SPOONACULAR_API_KEY;
    if (!apiKey) {
      setImportError('Spoonacular API key is not configured.');
      return;
    }

    setImporting(true);
    setImportError('');
    setImportSuccess('');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const endpoint = `https://api.spoonacular.com/recipes/extract?apiKey=${apiKey}&url=${encodeURIComponent(importUrl.trim())}`;
      const res = await fetch(endpoint, { signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `API error: ${res.status}`);
      }

      const data = await res.json();

      const ingredients = (data.extendedIngredients || []).map((ing) => ({
        name: ing.name || ing.originalName || '',
        quantity: String(ing.amount || ''),
        unit: ing.unit || '',
      }));

      let instructions = '';
      if (data.analyzedInstructions && data.analyzedInstructions[0]?.steps) {
        instructions = data.analyzedInstructions[0].steps
          .map((s) => `${s.number}. ${s.step}`)
          .join('\n');
      } else if (data.instructions) {
        instructions = data.instructions.replace(/<[^>]+>/g, '');
      }

      setForm((prev) => ({
        ...prev,
        title: data.title || prev.title,
        servings: data.servings || prev.servings,
        image_url: data.image || prev.image_url,
        source_url: data.sourceUrl || importUrl.trim(),
        ingredients: ingredients.length ? ingredients : prev.ingredients,
        instructions: instructions || prev.instructions,
      }));

      setImportSuccess('Recipe imported successfully!');
      setImportUrl('');
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        setImportError('Request timed out. Try again.');
      } else {
        setImportError(err.message || 'Failed to import recipe.');
      }
    } finally {
      setImporting(false);
    }
  };

  const addIngredient = () => {
    setForm((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, { name: '', quantity: '', unit: 'g' }],
    }));
  };

  const removeIngredient = (index) => {
    setForm((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index),
    }));
  };

  const updateIngredient = (index, field, value) => {
    setForm((prev) => {
      const updated = [...prev.ingredients];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, ingredients: updated };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setLoading(true);

    try {
      const tagsArray = form.tags
        ? form.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [];

      const data = {
        user_id: user.id,
        title: form.title.trim(),
        servings: parseInt(form.servings) || 2,
        ingredients: form.ingredients.filter((ing) => ing.name.trim()),
        instructions: form.instructions.trim(),
        image_url: form.image_url.trim(),
        source_url: form.source_url.trim(),
        tags: tagsArray,
      };

      if (isEditing) {
        await pb.collection('recipes').update(id, data);
      } else {
        await pb.collection('recipes').create(data);
      }

      navigate('/recipes');
    } catch (err) {
      console.error('Failed to save recipe:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6 transition-colors"
      >
        <ArrowLeft size={18} />
        <span className="text-sm font-medium">Back</span>
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {isEditing ? 'Edit Recipe' : 'New Recipe'}
      </h1>

      {/* Import from URL */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Link size={18} className="text-green-600" />
          <h2 className="font-semibold text-gray-800">Import from URL</h2>
          {!isPro && (
            <span className="ml-auto text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
              Pro only
            </span>
          )}
        </div>

        {showUpgradePrompt && (
          <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
            Upgrade to <strong>Pro</strong> to use recipe URL import.
          </div>
        )}

        {importError && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {importError}
          </div>
        )}
        {importSuccess && (
          <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
            {importSuccess}
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="url"
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
            placeholder="https://example.com/recipe"
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            disabled={importing}
          />
          <button
            type="button"
            onClick={handleImport}
            disabled={importing}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors disabled:opacity-60"
          >
            {importing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Upload size={16} />
            )}
            {importing ? 'Importing…' : 'Import'}
          </button>
        </div>
      </div>

      {/* Recipe Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            required
            placeholder="e.g. Chicken Tikka Masala"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Servings</label>
            <input
              type="number"
              min="1"
              value={form.servings}
              onChange={(e) => setForm((p) => ({ ...p, servings: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
              placeholder="e.g. chicken, dinner"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
          <input
            type="url"
            value={form.image_url}
            onChange={(e) => setForm((p) => ({ ...p, image_url: e.target.value }))}
            placeholder="https://..."
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>

        {/* Ingredients */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Ingredients</label>
            <button
              type="button"
              onClick={addIngredient}
              className="flex items-center gap-1 text-green-600 hover:text-green-700 text-sm font-medium"
            >
              <Plus size={16} />
              Add
            </button>
          </div>
          <div className="space-y-2">
            {form.ingredients.map((ing, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={ing.name}
                  onChange={(e) => updateIngredient(i, 'name', e.target.value)}
                  placeholder="Ingredient"
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
                <input
                  type="text"
                  value={ing.quantity}
                  onChange={(e) => updateIngredient(i, 'quantity', e.target.value)}
                  placeholder="Qty"
                  className="w-16 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
                <select
                  value={ing.unit}
                  onChange={(e) => updateIngredient(i, 'unit', e.target.value)}
                  className="w-20 border border-gray-200 rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>{u || '—'}</option>
                  ))}
                </select>
                {form.ingredients.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeIngredient(i)}
                    className="text-red-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
          <textarea
            value={form.instructions}
            onChange={(e) => setForm((p) => ({ ...p, instructions: e.target.value }))}
            rows={6}
            placeholder="Step-by-step instructions..."
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : null}
          {loading ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Recipe'}
        </button>
      </form>
    </div>
  );
}