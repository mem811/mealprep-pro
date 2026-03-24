import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import pb from '../lib/pb';
import { ArrowLeft, Edit2, Users, ExternalLink, Loader2, UtensilsCrossed } from 'lucide-react';

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <UtensilsCrossed className="w-12 h-12 text-gray-200 mb-3" />
        <h2 className="text-lg font-semibold text-gray-700">Recipe not found</h2>
        <button
          onClick={() => navigate('/recipes')}
          className="mt-4 text-sm text-green-600 hover:underline"
        >
          Back to recipes
        </button>
      </div>
    );
  }

  const scaleQty = (qty) => {
    if (!qty) return '';
    const num = parseFloat(qty);
    if (isNaN(num)) return qty;
    const scaled = num * multiplier;
    return scaled % 1 === 0 ? scaled.toString() : scaled.toFixed(1);
  };

  const instructions = recipe.instructions
    ? recipe.instructions.split('\n').filter((l) => l.trim())
    : [];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/recipes')}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <Link
          to={`/recipes/${id}/edit`}
          className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-xl transition-colors"
        >
          <Edit2 className="w-4 h-4" />
          Edit
        </Link>
      </div>

      {/* Hero Image */}
      {recipe.image_url && (
        <div className="rounded-2xl overflow-hidden mb-6 shadow-sm">
          <img
            src={recipe.image_url}
            alt={recipe.title}
            className="w-full h-52 object-cover"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>
      )}

      {/* Title & Meta */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
          {recipe.title}
        </h1>
        {recipe.description && (
          <p className="text-gray-500 text-sm leading-relaxed">{recipe.description}</p>
        )}
        <div className="flex items-center gap-4 mt-3">
          <span className="flex items-center gap-1.5 text-sm text-gray-500">
            <Users className="w-4 h-4" />
            {recipe.servings * multiplier} servings
          </span>
          {recipe.source_url && (
            <a
              href={recipe.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-green-600 hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Source
            </a>
          )}
        </div>
        {recipe.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {recipe.tags.map((tag) => (
              <span key={tag} className="text-xs bg-green-50 text-green-600 px-2.5 py-1 rounded-full font-medium">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Serving Multiplier */}
      <div className="mb-6 p-4 bg-gray-50 rounded-2xl">
        <p className="text-sm font-semibold text-gray-700 mb-3">Scale Servings</p>
        <div className="flex gap-2">
          {MULTIPLIERS.map((m) => (
            <button
              key={m}
              onClick={() => setMultiplier(m)}
              className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${
                multiplier === m
                  ? 'bg-green-500 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-green-300 hover:text-green-600'
              }`}
            >
              {m}×
            </button>
          ))}
        </div>
      </div>

      {/* Ingredients */}
      {recipe.ingredients?.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
            Ingredients
          </h2>
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 shadow-sm overflow-hidden">
            {recipe.ingredients.map((ing, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <div className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                <span className="text-sm font-semibold text-gray-700 w-14 shrink-0">
                  {scaleQty(ing.quantity)}{ing.unit ? ` ${ing.unit}` : ''}
                </span>
                <span className="text-sm text-gray-600">{ing.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      {instructions.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
            Instructions
          </h2>
          <div className="space-y-3">
            {instructions.map((step, i) => {
              const clean = step.replace(/^\d+\.\s*/, '');
              return (
                <div key={i} className="flex gap-3 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                  <span className="w-7 h-7 rounded-xl bg-green-500 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-sm text-gray-700 leading-relaxed">{clean}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}