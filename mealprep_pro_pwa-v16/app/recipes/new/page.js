"use client";
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Save, Image as ImageIcon, Link as LinkIcon, Info } from 'lucide-react';

export default function NewRecipePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    servings: 2,
    instructions: '',
    image_url: '',
    ingredients: [{ name: '', quantity: '', unit: 'pcs' }]
  });

  const addIngredient = () => {
    setFormData({
      ...formData,
      ingredients: [...formData.ingredients, { name: '', quantity: '', unit: 'pcs' }]
    });
  };

  const removeIngredient = (index) => {
    const newIngredients = formData.ingredients.filter((_, i) => i !== index);
    setFormData({ ...formData, ingredients: newIngredients });
  };

  const handleIngredientChange = (index, field, value) => {
    const newIngredients = [...formData.ingredients];
    newIngredients[index][field] = value;
    setFormData({ ...formData, ingredients: newIngredients });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('recipes')
      .insert([{
        ...formData,
        user_id: user.id,
      }]);

    if (!error) {
      router.push('/recipes');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-8 pb-20">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">New Recipe</h1>
            <p className="text-gray-500">Capture your culinary masterpiece</p>
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="btn-primary flex items-center gap-2 px-8"
          >
            <Save className="w-5 h-5" />
            {loading ? 'Saving...' : 'Save Recipe'}
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Title</label>
              <input 
                required
                className="w-full px-4 py-3 border border-gray-100 rounded-xl focus:ring-2 focus:ring-brand-500/20 outline-none shadow-sm"
                placeholder="Spicy Thai Basil Chicken..."
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Servings</label>
                <input 
                  type="number"
                  required
                  className="w-full px-4 py-3 border border-gray-100 rounded-xl focus:ring-2 focus:ring-brand-500/20 outline-none shadow-sm"
                  value={formData.servings}
                  onChange={(e) => setFormData({...formData, servings: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Image URL</label>
                <div className="relative">
                  <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input 
                    className="w-full pl-10 pr-4 py-3 border border-gray-100 rounded-xl focus:ring-2 focus:ring-brand-500/20 outline-none shadow-sm"
                    placeholder="https://..."
                    value={formData.image_url}
                    onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Instructions</label>
              <textarea 
                rows={8}
                className="w-full px-4 py-3 border border-gray-100 rounded-xl focus:ring-2 focus:ring-brand-500/20 outline-none shadow-sm resize-none"
                placeholder="Step 1: Prep your ingredients..."
                value={formData.instructions}
                onChange={(e) => setFormData({...formData, instructions: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Ingredients</label>
              <button 
                type="button"
                onClick={addIngredient}
                className="text-xs font-bold text-brand-600 bg-brand-50 px-3 py-1.5 rounded-lg hover:bg-brand-100 transition-colors"
              >
                Add Row
              </button>
            </div>
            
            <div className="space-y-3">
              {formData.ingredients.map((ing, idx) => (
                <div key={idx} className="flex gap-2">
                  <input 
                    className="flex-1 px-3 py-2 border border-gray-100 rounded-lg text-sm shadow-sm"
                    placeholder="Ingredient name"
                    value={ing.name}
                    onChange={(e) => handleIngredientChange(idx, 'name', e.target.value)}
                  />
                  <input 
                    className="w-20 px-3 py-2 border border-gray-100 rounded-lg text-sm shadow-sm"
                    placeholder="Qty"
                    value={ing.quantity}
                    onChange={(e) => handleIngredientChange(idx, 'quantity', e.target.value)}
                  />
                  <select 
                    className="w-24 px-3 py-2 border border-gray-100 rounded-lg text-sm shadow-sm bg-white"
                    value={ing.unit}
                    onChange={(e) => handleIngredientChange(idx, 'unit', e.target.value)}
                  >
                    <option value="pcs">pcs</option>
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                    <option value="ml">ml</option>
                    <option value="cup">cup</option>
                    <option value="tbsp">tbsp</option>
                    <option value="tsp">tsp</option>
                  </select>
                  <button 
                    type="button"
                    onClick={() => removeIngredient(idx)}
                    className="p-2 text-gray-300 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="bg-brand-50 p-4 rounded-2xl flex gap-3">
              <Info className="w-5 h-5 text-brand-600 shrink-0" />
              <p className="text-xs text-brand-700 leading-relaxed font-medium">
                Pro tip: Be precise with units to ensure your grocery list aggregates correctly!
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}