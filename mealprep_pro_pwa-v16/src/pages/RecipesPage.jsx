import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import pb from '../lib/pb';
import {
  Plus, Search, ChefHat, Edit, Trash2, Clock, Filter, ListFilter,
  UtensilsCrossed, Coffee, Sandwich, Apple, Leaf, Sprout, Wheat,
  Dumbbell, Croissant, Bookmark, Soup, BookmarkCheck, LayoutDashboard
} from 'lucide-react';

const RECIPE_FILTERS = [
  { label: 'All Recipes', icon: LayoutDashboard },
  { label: 'Breakfast', icon: Coffee },
  { label: 'Lunch', icon: Sandwich },
  { label: 'Dinner', icon: ChefHat },
  { label: 'Snack', icon: Apple },
  { label: 'Dessert', icon: ChefHat },
  { label: 'Sides', icon: Leaf },
  { label: 'Soups', icon: Soup },
  { label: 'Vegan', icon: Leaf },
  { label: 'Vegetarian', icon: Sprout },
  { label: 'Gluten-Free', icon: Wheat },
  { label: 'High-Protein', icon: Dumbbell },
  { label: 'Bread', icon: Croissant },
  { label: 'Favorites', icon: Bookmark },
];

function getProxiedImage(url) {
  if (!url) return null;
  return `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=1200&fit=cover&q=90&n=-1`;
}

function getSourceSiteName(url) {
  if (!url) return '';
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace('www.', '').split('.')[0];
  } catch (e) {
    return '';
  }
}

  export default function RecipesPage() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedTab, setSelectedTab] = useState('All Recipes');
  const [togglingFav, setTogglingFav] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchRecipes = async () => {
    try {
      setLoading(true);
      setError(null);
      const userId = pb.authStore.model.id;
      const result = await pb.collection('recipes').getList(1, 100, {
        filter: `user = "${userId}"`,
        sort: '-created',
      });
      setRecipes(result.items);
    } catch (err) {
      console.error('Error fetching recipes:', err);
      setError('Failed to load recipes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecipes();
  }, []);

  const handleDeleteClick = (id) => {
  setDeleteTarget(id);
};

const confirmDelete = async () => {
  if (!deleteTarget) return;
  try {
    await pb.collection('recipes').delete(deleteTarget);
    setRecipes((prev) => prev.filter((r) => r.id !== deleteTarget));
  } catch (err) {
    console.error('Delete error:', err);
    alert('Failed to delete recipe.');
  } finally {
    setDeleteTarget(null);
  }
};

  const handleToggleFavorite = async (e, recipe) => {
    e.preventDefault();
    e.stopPropagation();
    if (togglingFav === recipe.id) return;
    setTogglingFav(recipe.id);
    try {
      const updated = await pb.collection('recipes').update(recipe.id, {
        favorited: !recipe.favorited,
      });
      setRecipes((prev) =>
        prev.map((r) => (r.id === updated.id ? { ...r, favorited: updated.favorited } : r))
      );
    } catch (err) {
      console.error('Error toggling favorite:', err);
    } finally {
      setTogglingFav(null);
    }
  };

  const filteredRecipes = recipes.filter((r) => {
    const matchesSearch = r.title?.toLowerCase().includes(search.toLowerCase());
    if (selectedTab === 'All Recipes') return matchesSearch;
    if (selectedTab === 'Favorites') return matchesSearch && !!r.favorited;

    let recipeTags = [];
    if (typeof r.tags === 'string') {
      try { recipeTags = JSON.parse(r.tags); } catch { recipeTags = []; }
    } else if (Array.isArray(r.tags)) {
      recipeTags = r.tags;
    }
    const matchesTag = recipeTags.some(
      (tag) => tag.toLowerCase() === selectedTab.toLowerCase()
    );
    return matchesSearch && matchesTag;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-green-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-4">
        <div className="flex items-baseline gap-2">
          <h1 className="text-2xl font-bold text-gray-900">My Recipes</h1>
          <span className="text-gray-400 text-sm font-medium">· {filteredRecipes.length} recipes</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-gray-600">
            <ListFilter size={15} />
            Sort
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-gray-600">
            <Filter size={15} />
            Filter
          </button>
          <Link
            to="/recipes/new"
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl font-medium transition-colors text-sm"
          >
            <Plus size={16} />
            Add Recipe
          </Link>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-5">
        <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search recipes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 bg-white text-sm"
        />
      </div>

      {/* Filter Tabs */}

     <div className="flex flex-wrap gap-2 pb-2 mb-4">
        {RECIPE_FILTERS.map(({ label, icon: Icon }) => {
          const isActive = selectedTab === label;
          return (
            <button
              key={label}
              onClick={() => setSelectedTab(label)}
              className={`flex-shrink-0 flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-green-500 text-white shadow-md shadow-green-200'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-4 text-sm">
          {error}
        </div>
      )}

      {filteredRecipes.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            {selectedTab === 'Favorites'
              ? <Bookmark size={36} className="text-green-500" />
              : <ChefHat size={36} className="text-green-500" />}
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-1">
            {selectedTab === 'Favorites' ? 'No favorites yet' : 'No recipes found'}
          </h3>
          <p className="text-gray-400 mb-6 text-sm">
            {selectedTab === 'Favorites'
              ? 'Bookmark recipes to find them here quickly'
              : selectedTab === 'All Recipes'
              ? 'Start building your recipe library'
              : `No recipes tagged "${selectedTab}"`}
          </p>
          {selectedTab !== 'All Recipes' && (
            <button
              onClick={() => setSelectedTab('All Recipes')}
              className="inline-flex items-center gap-2 bg-green-50 hover:bg-green-100 text-green-600 px-4 py-2.5 rounded-xl font-medium transition-colors text-sm"
            >
              View All Recipes
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredRecipes.map((recipe) => {
            const proxiedImg = getProxiedImage(recipe.image_url);
            const sourceSite = getSourceSiteName(recipe.source_url);
            const isFav = !!recipe.favorited;
            return (
              <div
                key={recipe.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group"
              >
                <Link to={`/recipes/${recipe.id}`}>
                  <div className="relative h-36 sm:h-44 bg-green-50">
                    {proxiedImg ? (
                      <>
                        <img
                          src={proxiedImg}
                          alt={recipe.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            const placeholder = e.target.parentElement.querySelector('.placeholder');
                            if (placeholder) placeholder.style.display = 'flex';
                          }}
                        />
                        <div
                          className="placeholder absolute inset-0 items-center justify-center bg-green-50"
                          style={{ display: 'none' }}
                        >
                          <ChefHat size={40} className="text-green-300" />
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ChefHat size={40} className="text-green-300" />
                      </div>
                    )}

                    {/* Cook Time Badge */}
                    <div className="absolute bottom-2 left-2 bg-black/55 backdrop-blur-sm text-white text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1">
                      <Clock size={11} />
                      30 min
                    </div>

                    {/* Bookmark Button */}
                    <button
                      onClick={(e) => handleToggleFavorite(e, recipe)}
                      disabled={togglingFav === recipe.id}
                      className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-sm ${
                        isFav
                          ? 'bg-green-500 text-white'
                          : 'bg-white/80 backdrop-blur-sm text-gray-500 opacity-0 group-hover:opacity-100'
                      } hover:scale-110`}
                      title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      {isFav
                        ? <BookmarkCheck size={16} strokeWidth={2.5} />
                        : <Bookmark size={15} strokeWidth={2} />}
                    </button>
                  </div>
                </Link>

                <div className="p-3">
                  <Link to={`/recipes/${recipe.id}`}>
                    <h3 className="font-semibold text-gray-800 mb-0.5 hover:text-green-600 transition-colors line-clamp-1 text-sm">
                      {recipe.title}
                    </h3>
                  </Link>
                  {sourceSite && (
                    <p className="text-xs text-gray-400 mb-2 capitalize">{sourceSite}</p>
                  )}
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      to={`/recipes/${recipe.id}/edit`}
                      className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    >
                      <Edit size={14} />
                    </Link>
                   <button
                  onClick={() => handleDeleteClick(recipe.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
  <Trash2 size={14} />
</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
                    )}

            </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} className="text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Delete Recipe?</h3>
            <p className="text-sm text-gray-500 mb-6">
              This can't be undone. Are you sure you want to remove this recipe?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
