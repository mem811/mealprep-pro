import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import pb from "../lib/pb";
import {
  Plus, Search, ListFilter, Filter, Star, X, Utensils, Clock,
  LayoutGrid, Coffee, UtensilsCrossed, Moon, Cake, Salad, Soup,
  Leaf, Wheat, Dumbbell, Bookmark, Flame
} from "lucide-react";

var RECIPE_FILTERS = [
  { label: "All Recipes", icon: LayoutGrid },
  { label: "Breakfast", icon: Coffee },
  { label: "Lunch", icon: UtensilsCrossed },
  { label: "Dinner", icon: Moon },
  { label: "Snack", icon: Flame },
  { label: "Dessert", icon: Cake },
  { label: "Sides", icon: Salad },
  { label: "Soups", icon: Soup },
  { label: "Vegan", icon: Leaf },
  { label: "Vegetarian", icon: Leaf },
  { label: "Gluten-Free", icon: Wheat },
  { label: "High-Protein", icon: Dumbbell },
  { label: "Bread", icon: Wheat },
  { label: "Favorites", icon: Bookmark },
];

var SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "a-z", label: "A → Z" },
  { value: "z-a", label: "Z → A" },
  { value: "rating", label: "Highest Rated" },
  { value: "quickest", label: "Quickest Cook Time" },
  { value: "most-cal", label: "Most Calories" },
  { value: "least-cal", label: "Least Calories" },
];

function getProxiedImage(url) {
  if (!url) return null;
  return "https://images.weserv.nl/?url=" + encodeURIComponent(url) + "&w=400&fit=cover&q=80&n=-1";
}

function parseNutrition(n) {
  if (!n) return {};
  try { return typeof n === "string" ? JSON.parse(n) : n; } catch { return {}; }
}

var gradientStyle = { background: "linear-gradient(135deg, #10b981, #059669)" };

export default function RecipesPage() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("All Recipes");
  const [minRating, setMinRating] = useState(0);
  const [sortOption, setSortOption] = useState("newest");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [maxCookTime, setMaxCookTime] = useState("");
  const [hasImageOnly, setHasImageOnly] = useState(false);

  useEffect(function () {
    async function fetchRecipes() {
      try {
        var userId = pb.authStore.model?.id;
        if (!userId) return;
        var res = await pb.collection("recipes").getList(1, 200, {
          filter: 'user = "' + userId + '"',
          sort: "-created",
        });
        setRecipes(res.items);
      } catch (e) {
        console.error("Fetch recipes error:", e);
        setError("Failed to load recipes.");
      } finally {
        setLoading(false);
      }
    }
    fetchRecipes();
  }, []);

  var confirmDelete = async function (recipeId) {
    if (!window.confirm("Delete this recipe?")) return;
    try {
      await pb.collection("recipes").delete(recipeId);
      setRecipes(function (prev) {
        return prev.filter(function (r) { return r.id !== recipeId; });
      });
    } catch (e) {
      console.error("Delete error:", e);
      alert("Failed to delete recipe.");
    }
  };

  // ── Filtering ──
  var filteredRecipes = recipes;

  if (selectedTab === "Favorites") {
    filteredRecipes = filteredRecipes.filter(function (r) { return r.rating >= 4; });
  } else if (selectedTab !== "All Recipes") {
    filteredRecipes = filteredRecipes.filter(function (r) {
      var tags = [];
      if (typeof r.tags === "string") {
        try { tags = JSON.parse(r.tags); } catch { tags = []; }
      } else if (Array.isArray(r.tags)) {
        tags = r.tags;
      }
      return tags.some(function (t) {
        return t.toLowerCase() === selectedTab.toLowerCase();
      });
    });
  }

  if (searchQuery.trim()) {
    var q = searchQuery.toLowerCase();
    filteredRecipes = filteredRecipes.filter(function (r) {
      return (r.title || "").toLowerCase().includes(q);
    });
  }

  if (minRating > 0) {
    filteredRecipes = filteredRecipes.filter(function (r) {
      return (r.rating || 0) >= minRating;
    });
  }

  if (maxCookTime) {
    filteredRecipes = filteredRecipes.filter(function (r) {
      return r.cook_time && r.cook_time <= parseInt(maxCookTime);
    });
  }

  if (hasImageOnly) {
    filteredRecipes = filteredRecipes.filter(function (r) { return r.image_url; });
  }

  // ── Sorting ──
  filteredRecipes = [].concat(filteredRecipes).sort(function (a, b) {
    switch (sortOption) {
      case "oldest": return new Date(a.created) - new Date(b.created);
      case "a-z": return (a.title || "").localeCompare(b.title || "");
      case "z-a": return (b.title || "").localeCompare(a.title || "");
      case "rating": return (b.rating || 0) - (a.rating || 0);
      case "quickest": return (a.cook_time || 999) - (b.cook_time || 999);
      case "most-cal": return (parseNutrition(b.nutrition).calories || 0) - (parseNutrition(a.nutrition).calories || 0);
      case "least-cal": return (parseNutrition(a.nutrition).calories || 0) - (parseNutrition(b.nutrition).calories || 0);
      default: return new Date(b.created) - new Date(a.created);
    }
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-4">
        <div className="flex items-baseline gap-2">
          <h1 className="text-2xl font-bold text-gray-900">My Recipes</h1>
          <span className="text-gray-400 text-sm font-medium">· {filteredRecipes.length} recipes</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Sort dropdown */}
          <div className="relative">
            <button
              onClick={function () { setShowSortMenu(function (v) { return !v; }); }}
              className={"flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-xl transition-colors " +
                (sortOption !== "newest"
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                  : "border-gray-200 hover:bg-gray-50 text-gray-600")}
            >
              <ListFilter size={15} />
              {SORT_OPTIONS.find(function (o) { return o.value === sortOption; })?.label || "Sort"}
            </button>
            {showSortMenu && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1 min-w-[180px]">
                {SORT_OPTIONS.map(function (opt) {
                  return (
                    <button
                      key={opt.value}
                      onClick={function () { setSortOption(opt.value); setShowSortMenu(false); }}
                      className={"w-full text-left px-4 py-2 text-sm transition-colors " +
                        (sortOption === opt.value
                          ? "bg-emerald-50 text-emerald-700 font-semibold"
                          : "text-gray-600 hover:bg-gray-50")}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Filter toggle */}
          <button
            onClick={function () { setShowFilters(function (v) { return !v; }); }}
            className={"flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-xl transition-colors " +
              (showFilters || maxCookTime || hasImageOnly
                ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                : "border-gray-200 hover:bg-gray-50 text-gray-600")}
          >
            <Filter size={15} />
            Filter
          </button>

          {/* Add Recipe */}
          <Link
            to="/recipes/new"
            style={gradientStyle}
            className="flex items-center gap-2 text-white px-4 py-2 rounded-xl font-medium transition-colors text-sm"
          >
            <Plus size={16} />
            Add Recipe
          </Link>
        </div>
      </div>

      {/* ── Filter Panel ── */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-4 mb-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-600">Max cook time:</label>
            <select
              value={maxCookTime}
              onChange={function (e) { setMaxCookTime(e.target.value); }}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1 bg-white"
            >
              <option value="">Any</option>
              <option value="15">15 min</option>
              <option value="30">30 min</option>
              <option value="45">45 min</option>
              <option value="60">1 hour</option>
              <option value="90">1.5 hours</option>
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hasImageOnly}
              onChange={function (e) { setHasImageOnly(e.target.checked); }}
              className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-xs font-semibold text-gray-600">Has photo only</span>
          </label>
          {(maxCookTime || hasImageOnly) && (
            <button
              onClick={function () { setMaxCookTime(""); setHasImageOnly(false); }}
              className="text-xs text-red-500 font-semibold hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* ── Search Bar ── */}
      <div className="relative mb-5">
        <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search recipes..."
          value={searchQuery}
          onChange={function (e) { setSearchQuery(e.target.value); }}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 transition-all"
        />
      </div>

      {/* ── Category Pills ── */}
      <div className="flex flex-wrap gap-2 pb-2 mb-4">
        {RECIPE_FILTERS.map(function (item) {
          var Icon = item.icon;
          var isActive = selectedTab === item.label;
          return (
            <button
              key={item.label}
              onClick={function () { setSelectedTab(item.label); }}
              style={isActive ? gradientStyle : {}}
              className={"flex-shrink-0 flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all " +
                (isActive
                  ? "text-white shadow-md shadow-green-200"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200")}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Rating Filter ── */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm font-semibold text-gray-600">Filter by rating:</span>
        {[0, 1, 2, 3, 4, 5].map(function (r) {
          return (
            <button
              key={r}
              onClick={function () { setMinRating(r); }}
              style={minRating === r ? gradientStyle : {}}
              className={"px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors " +
                (minRating === r
                  ? "text-white border-emerald-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-emerald-300")}
            >
              {r === 0 ? "All" : "\u2605".repeat(r)}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-4 text-sm">{error}</div>
      )}

      {/* ── Recipe Grid ── */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredRecipes.length === 0 ? (
        <div className="text-center py-16">
          <Utensils size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">No recipes found</p>
          <p className="text-gray-400 text-sm mt-1">Try adjusting your filters or add a new recipe.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredRecipes.map(function (recipe) {
            var nut = parseNutrition(recipe.nutrition);
            var proxied = getProxiedImage(recipe.image_url);

            return (
              <Link
                key={recipe.id}
                to={"/recipes/" + recipe.id}
                className="group bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden relative"
              >
                {/* Image */}
                <div className="w-full h-44 bg-emerald-50 relative overflow-hidden">
                  {proxied ? (
                    <img
                      src={proxied}
                      alt={recipe.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Utensils size={32} className="text-emerald-300" />
                    </div>
                  )}

                  {recipe.cook_time > 0 && (
                    <div className="absolute top-2 left-2 flex items-center gap-1 bg-white/90 backdrop-blur-sm text-xs font-bold text-gray-700 px-2 py-1 rounded-full">
                      <Clock size={12} />
                      {recipe.cook_time} min
                    </div>
                  )}

                  {recipe.rating > 0 && (
                    <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-white/90 backdrop-blur-sm text-xs font-bold text-amber-600 px-2 py-1 rounded-full">
                      <Star size={12} fill="currentColor" />
                      {recipe.rating}
                    </div>
                  )}

                  {nut.calories > 0 && (
                    <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm text-[10px] font-bold text-emerald-700 px-2 py-1 rounded-full">
                      🔥 {Math.round(nut.calories)} cal
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-3">
                  <h3 className="text-sm font-bold text-gray-900 line-clamp-2 mb-1">{recipe.title}</h3>
                  {recipe.servings && (
                    <p className="text-xs text-gray-400">{recipe.servings} servings</p>
                  )}
                  {nut.protein > 0 && (
                    <p className="text-[10px] text-gray-400 font-semibold mt-1">
                      P {Math.round(nut.protein)}g · C {Math.round(nut.carbs || 0)}g · F {Math.round(nut.fat || 0)}g
                    </p>
                  )}
                </div>

                {/* Delete */}
                <button
                  onClick={function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    confirmDelete(recipe.id);
                  }}
                  className="absolute bottom-3 right-3 w-7 h-7 rounded-full bg-white border border-gray-100 text-gray-400 hidden group-hover:flex items-center justify-center shadow-sm hover:bg-red-50 hover:text-red-500 transition-colors"
                >
                  <X size={14} />
                </button>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
