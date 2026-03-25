import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import pb from '../lib/pb';
import { 
  ArrowLeft, Edit2, Users, ExternalLink, Loader2, UtensilsCrossed, 
  Flame, HardDrive, Wheat, Droplets
} from 'lucide-react';

const MULTIPLIERS = [1, 2, 3, 4];

export default function RecipeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [multiplier, setMultiplier] = useState(1);

  const { data: recipe, isLoading } = useQuery({
    queryKey: ['recipe', id],
    queryFn: () => pb.collection('recipes').getOne(id),
    enabled: !!id,
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-green-500" /></div>;
  if (!recipe) return <div className="text-center py-20 text-gray-400">Recipe not found</div>;

  const nutrition = recipe.nutrition || { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const nutrients = [
    { label: 'Calories', value: Math.round(nutrition.calories * multiplier), unit: 'kcal', icon: Flame, color: 'text-orange-500', bg: 'bg-orange-50' },
    { label: 'Protein', value: Math.round(nutrition.protein * multiplier), unit: 'g', icon: HardDrive, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Carbs', value: Math.round(nutrition.carbs * multiplier), unit: 'g', icon: Wheat, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'Fat', value: Math.round(nutrition.fat * multiplier), unit: 'g', icon: Droplets, color: 'text-pink-500', bg: 'bg-pink-50' },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-28">
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><ArrowLeft /></button>
        <Link to={`/recipes/${id}/edit`} className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400"><Edit2 size={18} /></Link>
      </div>

      {recipe.image_url && (
        <img 
          src={`https://images.weserv.nl/?url=${encodeURIComponent(recipe.image_url)}&w=800&h=600&fit=cover&q=85`} 
          alt={recipe.title} 
          className="w-full h-64 object-cover rounded-[2.5rem] shadow-lg mb-8" 
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{recipe.title}</h1>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-1"><Users size={14} /> {recipe.servings * multiplier} servings</span>
          {recipe.source_url && <a href={recipe.source_url} target="_blank" rel="noreferrer" className="text-green-600 hover:underline">Source</a>}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {nutrients.map((n) => (
          <div key={n.label} className={`${n.bg} rounded-3xl p-4 border border-white/50 shadow-sm`}>
            <div className="flex items-center gap-2 mb-1">
              <n.icon className={`w-3 h-3 ${n.color}`} />
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{n.label}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-gray-800">{n.value}</span>
              <span className="text-[10px] font-bold text-gray-400">{n.unit}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-100 rounded-3xl p-5 mb-8">
        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Adjust Portions</p>
        <div className="flex gap-2">
          {MULTIPLIERS.map(m => (
            <button key={m} onClick={() => setMultiplier(m)} className={`flex-1 py-3 rounded-2xl font-bold transition-all ${multiplier === m ? 'bg-green-500 text-white' : 'bg-gray-50 text-gray-500'}`}>{m}×</button>
          ))}
        </div>
      </div>

      <div className="space-y-8">
        <section>
          <h2 className="text-lg font-bold mb-4">Ingredients</h2>
          <div className="bg-white rounded-3xl border border-gray-100 divide-y divide-gray-50 overflow-hidden">
            {recipe.ingredients?.map((ing, i) => (
              <div key={i} className="px-6 py-4 flex justify-between text-sm">
                <span className="text-gray-600">{ing.name}</span>
                <span className="font-bold text-gray-900">{(parseFloat(ing.quantity) * multiplier) || ''} {ing.unit}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-4">Instructions</h2>
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap bg-white p-6 rounded-3xl border border-gray-100">
            {recipe.instructions}
          </p>
        </section>
      </div>
    </div>
  );
}