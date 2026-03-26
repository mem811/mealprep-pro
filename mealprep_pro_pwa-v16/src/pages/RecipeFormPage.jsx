import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import pb from '../lib/pb';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiPlus, FiTrash2, FiArrowLeft, FiLoader, FiDownload, FiLock, FiX, FiActivity, FiSave } = FiIcons;

const TAG_OPTIONS = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Vegetarian', 'Vegan', 'High-Protein', 'Quick'];
const UNITS = ['cup', 'tbsp', 'tsp', 'oz', 'lb', 'g', 'kg', 'ml', 'piece', 'slice', 'clove', 'pcs'];

export default function RecipeFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(isEdit);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState(null);
  
  const [title, setTitle] = useState('');
  const [servings, setServings] = useState(2);
  const [instructions, setInstructions] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [importUrl, setImportUrl] = useState('');
  const [tags, setTags] = useState([]);
  const [ingredients, setIngredients] = useState([{ name: '', quantity: '', unit: 'pcs' }]);
  const [nutrition, setNutrition] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });

  const isPro = pb.authStore.model?.plan === 'pro';

  useEffect(() => {
    if (isEdit) {
      (async () => {
        try {
          const record = await pb.collection('recipes').getOne(id);
          setTitle(record.title);
          setServings(record.servings);
          setInstructions(record.instructions);
          setImageUrl(record.image_url);
          setSourceUrl(record.source_url || '');
          setTags(typeof record.tags === 'string' ? JSON.parse(record.tags) : record.tags || []);
          setIngredients(typeof record.ingredients === 'string' ? JSON.parse(record.ingredients) : record.ingredients || []);
          setNutrition(typeof record.nutrition === 'string' ? JSON.parse(record.nutrition) : record.nutrition || { calories: 0, protein: 0, carbs: 0, fat: 0 });
        } catch (err) {
          console.error(err);
        } finally {
          setPageLoading(false);
        }
      })();
    }
  }, [id, isEdit]);

  const handleImport = async () => {
    if (!importUrl.trim()) return;
    setImporting(true);
    setImportError(null);
    
    try {
      const apiKey = import.meta.env.VITE_SPOONACULAR_API_KEY;
      const url = `https://api.spoonacular.com/recipes/extract?url=${encodeURIComponent(importUrl)}&addRecipeInformation=true&addRecipeNutrition=true&apiKey=${apiKey}`;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Status: ${res.status}`);
      
      const data = await res.json();
      
      setTitle(data.title || '');
      setServings(data.servings || 2);
      setImageUrl(data.image || '');
      setSourceUrl(importUrl);
      setInstructions(data.instructions?.replace(/<[^>]*>?/gm, '') || '');
      
      if (data.extendedIngredients) {
        // Fix 1: Filter out blank ingredients during import
        const filteredIngs = data.extendedIngredients
          .filter(ing => ing.name && ing.name.trim() !== '')
          .map(ing => ({
            name: ing.name || '',
            quantity: ing.amount?.toString() || '',
            unit: ing.unit || 'pcs'
          }));
        setIngredients(filteredIngs.length > 0 ? filteredIngs : [{ name: '', quantity: '', unit: 'pcs' }]);
      }

      if (data.nutrition?.nutrients) {
        const n = data.nutrition.nutrients;
        setNutrition({
          calories: Math.round(n.find(x => x.name === 'Calories')?.amount || 0),
          protein: Math.round(n.find(x => x.name === 'Protein')?.amount || 0),
          carbs: Math.round(n.find(x => x.name === 'Carbohydrates')?.amount || 0),
          fat: Math.round(n.find(x => x.name === 'Fat')?.amount || 0),
        });
      }

      setImportUrl('');
    } catch (err) {
      console.error('Import Error:', err);
      setImportError('Failed to import recipe. Please verify the URL.');
    } finally {
      setImporting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Fix 1: Filter out blank ingredients before saving
      const cleanIngredients = ingredients.filter(ing => ing.name && ing.name.trim() !== '');
      
      const data = {
        user: pb.authStore.model.id,
        title,
        servings: Number(servings),
        instructions,
        image_url: imageUrl,
        source_url: sourceUrl,
        ingredients: JSON.stringify(cleanIngredients),
        tags: JSON.stringify(tags),
        nutrition: JSON.stringify(nutrition)
      };

      if (isEdit) {
        await pb.collection('recipes').update(id, data);
      } else {
        await pb.collection('recipes').create(data);
      }
      navigate('/recipes');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateIngredient = (idx, field, val) => {
    const list = [...ingredients];
    list[idx][field] = val;
    setIngredients(list);
  };

  const removeIngredient = (idx) => {
    // Fix 2: Correctly remove ingredient at index
    setIngredients(prev => prev.filter((_, i) => i !== idx));
  };

  const toggleTag = (tag) => {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  if (pageLoading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500"></div></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <form onSubmit={handleSubmit} className="space-y-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => navigate(-1)} className="p-3 hover:bg-gray-100 rounded-2xl transition-all">
              <SafeIcon icon={FiArrowLeft} className="w-5 h-5 text-gray-500" />
            </button>
            <h1 className="text-3xl font-bold text-gray-900">{isEdit ? 'Edit' : 'New'} Recipe</h1>
          </div>
          <button type="submit" disabled={loading} className="bg-emerald-500 text-white px-8 py-3.5 rounded-2xl font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all flex items-center gap-2" >
            {loading ? <SafeIcon icon={FiLoader} className="animate-spin" /> : <SafeIcon icon={FiSave} />}
            Save Recipe
          </button>
        </header>

        {/* Import Strip */}
        <div className={`p-6 rounded-[2rem] border-2 border-dashed transition-all ${isPro ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <SafeIcon icon={FiDownload} className={isPro ? 'text-emerald-500' : 'text-gray-400'} />
              <span className="font-bold text-gray-800">Auto-Import from Web</span>
            </div>
            {!isPro && <span className="text-[10px] font-bold bg-amber-100 text-amber-600 px-2 py-1 rounded-full uppercase tracking-widest flex items-center gap-1"><SafeIcon icon={FiLock} /> Pro Feature</span>}
          </div>
          <div className="flex gap-3">
            <input 
              type="url" 
              placeholder="Paste recipe URL here..." 
              value={importUrl}
              onChange={e => setImportUrl(e.target.value)}
              disabled={!isPro || importing}
              className="flex-1 px-5 py-3.5 bg-white border-none rounded-2xl focus:ring-2 focus:ring-emerald-500/20 outline-none disabled:opacity-50" 
            />
            <button 
              type="button" 
              onClick={handleImport}
              disabled={!isPro || importing || !importUrl}
              className="bg-emerald-500 text-white px-6 rounded-2xl font-bold hover:bg-emerald-600 transition-all disabled:opacity-50"
            >
              {importing ? <SafeIcon icon={FiLoader} className="animate-spin" /> : 'Import'}
            </button>
          </div>
          {importError && <p className="text-rose-500 text-xs mt-3 font-medium">{importError}</p>}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <section className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
              <h2 className="text-lg font-bold text-gray-900 border-b border-gray-50 pb-4">Basic Info</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Title</label>
                  <input required value={title} onChange={e => setTitle(e.target.value)} className="w-full mt-2 px-5 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500/20 outline-none" placeholder="Spicy Tacos..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Servings</label>
                    <input type="number" value={servings} onChange={e => setServings(e.target.value)} className="w-full mt-2 px-5 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500/20 outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Image URL</label>
                    <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="w-full mt-2 px-5 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500/20 outline-none" placeholder="https://..." />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Source URL</label>
                  <input value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} className="w-full mt-2 px-5 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500/20 outline-none" placeholder="Original website link..." />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Tags</label>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {TAG_OPTIONS.map(tag => (
                      <button 
                        key={tag} 
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${tags.includes(tag) ? 'bg-emerald-500 text-white' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
              <h2 className="text-lg font-bold text-gray-900 border-b border-gray-50 pb-4">Ingredients</h2>
              <div className="space-y-3">
                {ingredients.map((ing, i) => (
                  <div key={i} className="flex gap-2">
                    <input required className="flex-1 px-4 py-2 bg-gray-50 rounded-xl text-sm" placeholder="Ingredient" value={ing.name} onChange={e => updateIngredient(i, 'name', e.target.value)} />
                    <input className="w-20 px-4 py-2 bg-gray-50 rounded-xl text-sm" placeholder="Qty" value={ing.quantity} onChange={e => updateIngredient(i, 'quantity', e.target.value)} />
                    <select className="w-24 px-2 py-2 bg-gray-50 rounded-xl text-sm outline-none" value={ing.unit} onChange={e => updateIngredient(i, 'unit', e.target.value)}>
                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                    <button type="button" onClick={() => removeIngredient(i)} className="text-red-400 p-2 hover:bg-red-50 rounded-lg transition-colors">
                      <SafeIcon icon={FiTrash2} />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => setIngredients([...ingredients, { name: '', quantity: '', unit: 'pcs' }])} className="w-full py-3 border-2 border-dashed border-gray-100 rounded-2xl text-gray-400 font-bold text-sm hover:border-emerald-500 hover:text-emerald-500 transition-all">
                  + Add Ingredient
                </button>
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
              <h2 className="text-lg font-bold text-gray-900 border-b border-gray-50 pb-4 flex items-center gap-2">
                <SafeIcon icon={FiActivity} className="text-emerald-500" /> Nutrition Facts
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: 'calories', label: 'Calories', icon: 'kcal' },
                  { key: 'protein', label: 'Protein', icon: 'g' },
                  { key: 'carbs', label: 'Carbs', icon: 'g' },
                  { key: 'fat', label: 'Fat', icon: 'g' }
                ].map((item) => (
                  <div key={item.key}>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">{item.label}</label>
                    <div className="relative mt-2">
                      <input type="number" value={nutrition[item.key]} onChange={e => setNutrition({ ...nutrition, [item.key]: Number(e.target.value) })} className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500/20 outline-none" />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">{item.icon}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
              <h2 className="text-lg font-bold text-gray-900 border-b border-gray-50 pb-4">Instructions</h2>
              <textarea rows={12} className="w-full px-5 py-4 bg-gray-50 border-none rounded-[2rem] focus:ring-2 focus:ring-emerald-500/20 outline-none resize-none" placeholder="Step 1: Preheat oven..." value={instructions} onChange={e => setInstructions(e.target.value)} />
            </section>
          </div>
        </div>
      </form>
    </div>
  );
}