import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import pb from '../lib/pb';
import { 
  ArrowLeft, Plus, Trash2, Upload, Loader2, 
  Flame, HardDrive, Wheat, Droplets, Sparkles, Info 
} from 'lucide-react';

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

  const [form, setForm] = useState({
    title: '',
    servings: 2,
    instructions: '',
    image_url: '',
    source_url: '',
    tags: '',
    nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 },
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
        tags: Array.isArray(record.tags) ? record.tags.join(',') : '',
        nutrition: record.nutrition || { calories: 0, protein: 0, carbs: 0, fat: 0 },
        ingredients: record.ingredients || [{ name: '', quantity: '', unit: 'g' }],
      });
    } catch (err) {
      console.error('Failed to fetch recipe:', err);
    }
  };

  const handleImport = async () => {
    if (!isPro) return;
    if (!importUrl.trim()) {
      setImportError('Please enter a recipe URL.');
      return;
    }

    const apiKey = import.meta.env.VITE_SPOONACULAR_API_KEY;
    if (!apiKey) {
      setImportError('Spoonacular API key missing.');
      return;
    }

    setImporting(true);
    setImportError('');
    setImportSuccess('');

    try {
      const endpoint = `https://api.spoonacular.com/recipes/extract?apiKey=${apiKey}&url=${encodeURIComponent(importUrl.trim())}&includeNutrition=true`;
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      
      const ingredients = (data.extendedIngredients || []).map((ing) => ({
        name: ing.name || '',
        quantity: String(ing.amount || ''),
        unit: ing.unit || '',
      }));

      const nutrients = data.nutrition?.nutrients || [];
      const getVal = (name) => nutrients.find(n => n.name === name)?.amount || 0;

      setForm((prev) => ({
        ...prev,
        title: data.title || prev.title,
        servings: data.servings || prev.servings,
        image_url: data.image || prev.image_url,
        source_url: data.sourceUrl || importUrl.trim(),
        ingredients: ingredients.length ? ingredients : prev.ingredients,
        instructions: data.instructions?.replace(/<[^>]+>/g, '') || prev.instructions,
        nutrition: {
          calories: getVal('Calories'),
          protein: getVal('Protein'),
          carbs: getVal('Carbohydrates'),
          fat: getVal('Fat'),
        }
      }));

      setImportSuccess('Import successful!');
      setImportUrl('');
    } catch (err) {
      setImportError('Failed to import recipe.');
    } finally {
      setImporting(false);
    }
  };

  const handleNutrientChange = (field, value) => {
    setForm(prev => ({
      ...prev,
      nutrition: { ...prev.nutrition, [field]: parseFloat(value) || 0 }
    }));
  };

  const updateIngredient = (index, field, value) => {
    const updated = [...form.ingredients];
    updated[index][field] = value;
    setForm({ ...form, ingredients: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const tagsArray = form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
      const payload = {
        user_id: user.id,
        title: form.title,
        servings: parseInt(form.servings),
        ingredients: form.ingredients.filter(ing => ing.name.trim()),
        instructions: form.instructions,
        image_url: form.image_url,
        source_url: form.source_url,
        tags: tagsArray,
        nutrition: form.nutrition, // This maps to your new JSON field
      };

      if (isEditing) {
        await pb.collection('recipes').update(id, payload);
      } else {
        await pb.collection('recipes').create(payload);
      }
      navigate('/recipes');
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-28">
      <header className="flex items-center justify-between mb-8">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold">{isEditing ? 'Edit Recipe' : 'New Recipe'}</h1>
        <div className="w-10" />
      </header>

      {/* Import Section */}
      <div className={`p-5 mb-8 rounded-3xl border ${isPro ? 'border-green-200 bg-green-50/30' : 'border-gray-200 bg-gray-50'}`}>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={18} className={isPro ? 'text-green-600' : 'text-gray-400'} />
          <h2 className="font-bold text-gray-800 text-sm italic">Spoonacular Smart Import</h2>
          {!isPro && <span className="ml-auto text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-black">PRO</span>}
        </div>
        <div className="flex gap-2">
          <input 
            type="url" 
            value={importUrl} 
            onChange={(e) => setImportUrl(e.target.value)} 
            placeholder="Paste recipe URL..." 
            className="flex-1 border bg-white border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green-400" 
            disabled={!isPro || importing} 
          />
          <button 
            type="button" 
            onClick={handleImport} 
            disabled={!isPro || importing} 
            className="bg-green-600 text-white px-6 py-3 rounded-2xl font-bold text-sm disabled:opacity-50"
          >
            {importing ? <Loader2 size={18} className="animate-spin" /> : 'Import'}
          </button>
        </div>
        {importError && <p className="text-red-500 text-xs mt-3">{importError}</p>}
        {importSuccess && <p className="text-green-600 text-xs mt-3">{importSuccess}</p>}
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Fields */}
        <div className="space-y-4">
          <input 
            type="text" 
            placeholder="Recipe Title" 
            value={form.title} 
            onChange={e => setForm({...form, title: e.target.value})}
            className="w-full text-2xl font-bold bg-transparent border-b-2 border-gray-100 focus:border-green-400 outline-none pb-2"
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <input type="number" placeholder="Servings" value={form.servings} onChange={e => setForm({...form, servings: e.target.value})} className="border border-gray-100 rounded-2xl px-4 py-3 text-sm" />
            <input type="text" placeholder="Tags (comma separated)" value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} className="border border-gray-100 rounded-2xl px-4 py-3 text-sm" />
          </div>
        </div>

        {/* Nutrition Section */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Nutrition per serving</h3>
            <Info className="w-4 h-4 text-gray-300" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {[
              { label: 'Calories', field: 'calories', icon: Flame, color: 'text-orange-500' },
              { label: 'Protein (g)', field: 'protein', icon: HardDrive, color: 'text-blue-500' },
              { label: 'Carbs (g)', field: 'carbs', icon: Wheat, color: 'text-amber-500' },
              { label: 'Fat (g)', field: 'fat', icon: Droplets, color: 'text-pink-500' },
            ].map((n) => (
              <div key={n.field}>
                <div className="flex items-center gap-1.5 mb-2">
                  <n.icon className={`w-3 h-3 ${n.color}`} />
                  <span className="text-[10px] font-bold text-gray-400 uppercase">{n.label}</span>
                </div>
                <input 
                  type="number" 
                  value={form.nutrition[n.field]} 
                  onChange={(e) => handleNutrientChange(n.field, e.target.value)} 
                  className="w-full bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-green-400 rounded-xl px-3 py-2 text-sm font-bold text-gray-700 outline-none" 
                />
              </div>
            ))}
          </div>
        </div>

        {/* Ingredients */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Ingredients</label>
            <button type="button" onClick={() => setForm({...form, ingredients: [...form.ingredients, {name: '', quantity: '', unit: 'g'}]})} className="text-xs font-bold text-green-600">+ Add</button>
          </div>
          {form.ingredients.map((ing, i) => (
            <div key={i} className="flex gap-2">
              <input value={ing.quantity} onChange={e => updateIngredient(i, 'quantity', e.target.value)} placeholder="Qty" className="w-16 border rounded-xl px-2 py-2 text-sm" />
              <input value={ing.name} onChange={e => updateIngredient(i, 'name', e.target.value)} placeholder="Ingredient" className="flex-1 border rounded-xl px-3 py-2 text-sm" />
              <button type="button" onClick={() => setForm({...form, ingredients: form.ingredients.filter((_, idx) => idx !== i)})} className="text-gray-300 hover:text-red-500"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>

        {/* Instructions */}
        <div className="space-y-2">
          <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Instructions</label>
          <textarea 
            value={form.instructions} 
            onChange={e => setForm({...form, instructions: e.target.value})} 
            rows={6} 
            className="w-full border border-gray-100 rounded-3xl px-5 py-4 text-sm focus:ring-2 focus:ring-green-400 outline-none" 
          />
        </div>

        <button 
          type="submit" 
          disabled={loading} 
          className="w-full bg-green-600 text-white font-black py-4 rounded-3xl shadow-xl shadow-green-600/20 disabled:opacity-50"
        >
          {loading ? 'SAVING...' : isEditing ? 'UPDATE RECIPE' : 'SAVE RECIPE'}
        </button>
      </form>
    </div>
  );
}