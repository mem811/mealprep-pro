import { useState, useEffect, useCallback } from "react";
import pb from "../lib/pb";
import RecipePickerModal from "../components/RecipePickerModal";
import { createFoodLogEntry } from "../lib/foodLog";
import { Plus, ChevronLeft, ChevronRight, X, Utensils } from "lucide-react";

var MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];
var MEAL_LABELS = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snack" };

var MEAL_COLORS = {
  breakfast: "from-amber-50/80 to-orange-50/80 border-amber-200/60",
  lunch: "from-green-50/80 to-emerald-50/80 border-green-200/60",
  dinner: "from-blue-50/80 to-indigo-50/80 border-blue-200/60",
  snack: "from-purple-50/80 to-pink-50/80 border-purple-200/60",
};

var CATEGORY_MAP = {
  flour: "Baking", sugar: "Baking", "granulated sugar": "Baking", "powdered sugar": "Baking",
  "brown sugar": "Baking", "baking powder": "Baking", "baking soda": "Baking", cornstarch: "Baking",
  "vanilla extract": "Baking", "cocoa powder": "Baking", "chocolate chips": "Baking", yeast: "Baking",
  butter: "Dairy", milk: "Dairy", cream: "Dairy", cheese: "Dairy", yogurt: "Dairy",
  "sour cream": "Dairy", "cream cheese": "Dairy", buttermilk: "Dairy", "heavy cream": "Dairy",
  egg: "Dairy", eggs: "Dairy",
  chicken: "Protein", beef: "Protein", pork: "Protein", shrimp: "Protein", fish: "Protein",
  salmon: "Protein", turkey: "Protein", bacon: "Protein", sausage: "Protein", tofu: "Protein",
  onion: "Produce", garlic: "Produce", tomato: "Produce", tomatoes: "Produce", lettuce: "Produce",
  spinach: "Produce", carrot: "Produce", carrots: "Produce", potato: "Produce", potatoes: "Produce",
  avocado: "Produce", lemon: "Produce", lime: "Produce", "bell pepper": "Produce", celery: "Produce",
  cucumber: "Produce", broccoli: "Produce", mushrooms: "Produce", ginger: "Produce", cilantro: "Produce",
  parsley: "Produce", basil: "Produce", "green onion": "Produce",
  salt: "Spices", pepper: "Spices", cinnamon: "Spices", paprika: "Spices", cumin: "Spices",
  oregano: "Spices", thyme: "Spices", nutmeg: "Spices", "chili powder": "Spices", cayenne: "Spices",
  turmeric: "Spices", "bay leaf": "Spices", "ground cinnamon": "Spices", "ground nutmeg": "Spices",
  "garlic powder": "Spices", "onion powder": "Spices", "red pepper flakes": "Spices", "black pepper": "Spices",
  "olive oil": "Pantry", "vegetable oil": "Pantry", "soy sauce": "Pantry", vinegar: "Pantry",
  honey: "Pantry", "maple syrup": "Pantry", rice: "Pantry", pasta: "Pantry", bread: "Pantry",
  tortillas: "Pantry", broth: "Pantry", stock: "Pantry", "coconut milk": "Pantry",
  "canned tomatoes": "Pantry", "tomato paste": "Pantry", "peanut butter": "Pantry", "almond butter": "Pantry",
};

var CATEGORY_ICONS = { Produce: "🥬", Protein: "🥩", Dairy: "🥛", Baking: "🧁", Spices: "🧂", Pantry: "🫙", Other: "📦" };
var CATEGORY_ORDER = ["Produce", "Protein", "Dairy", "Baking", "Spices", "Pantry", "Other"];
var DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
var MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function categorizeItem(name) {
  var lower = (name || "").toLowerCase().trim();
  if (CATEGORY_MAP[lower]) return CATEGORY_MAP[lower];
  for (var keyword in CATEGORY_MAP) {
    if (lower.includes(keyword) || keyword.includes(lower)) return CATEGORY_MAP[keyword];
  }
  return "Other";
}

function getWeekDays(baseDate) {
  var day = baseDate.getDay();
  var monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() - ((day + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, function (_, i) {
    var d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function fmt(d) {
  return d.toISOString().split("T")[0];
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + "T00:00:00.000Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function getProxiedImage(url) {
  if (!url) return null;
  return "https://images.weserv.nl/?url=" + encodeURIComponent(url) + "&w=120&h=120&fit=cover&q=85";
}

function parseNutrition(nutrition) {
  if (!nutrition) return null;
  try { return typeof nutrition === "string" ? JSON.parse(nutrition) : nutrition; }
  catch { return null; }
}

function getMacros(recipe, mult) {
  var nut = parseNutrition(recipe?.nutrition);
  if (!nut) return null;
  var m = mult || 1;
  var cal = Math.round((nut.calories || 0) * m);
  var p = Math.round((nut.protein || 0) * m);
  var c = Math.round((nut.carbs || 0) * m);
  var f = Math.round((nut.fat || 0) * m);
  if (!cal && !p && !c && !f) return null;
  return { cal, p, c, f };
}

function getMonthCalendar(year, month) {
  var firstDay = new Date(year, month, 1);
  var lastDay = new Date(year, month + 1, 0);
  var startDow = (firstDay.getDay() + 6) % 7;
  var days = [];
  for (var i = startDow - 1; i >= 0; i--) {
    var d = new Date(firstDay);
    d.setDate(d.getDate() - i - 1);
    days.push({ date: fmt(d), day: d.getDate(), inMonth: false });
  }
  for (var n = 1; n <= lastDay.getDate(); n++) {
    days.push({ date: fmt(new Date(year, month, n)), day: n, inMonth: true });
  }
  while (days.length % 7 !== 0) {
    var prev = days[days.length - 1];
    var next = new Date(prev.date + "T12:00:00");
    next.setDate(next.getDate() + 1);
    days.push({ date: fmt(next), day: next.getDate(), inMonth: false });
  }
  return days;
}

export default function HomePage() {
  const [viewMode, setViewMode] = useState("week");
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(fmt(new Date()));
  const [slots, setSlots] = useState({});
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeCell, setActiveCell] = useState(null);
  const [saving, setSaving] = useState(false);
  const [featuredRecipes, setFeaturedRecipes] = useState([]);
  const [groceryGroups, setGroceryGroups] = useState([]);
  const [checkedItems, setCheckedItems] = useState({});
  const [loggedSlots, setLoggedSlots] = useState({});

  var today = fmt(new Date());

  var baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + weekOffset * 7);
  var weekDays = getWeekDays(baseDate);
  var weekStart = fmt(weekDays[0]);
  var weekEnd = fmt(weekDays[6]);

  var monthBase = new Date();
  monthBase.setMonth(monthBase.getMonth() + monthOffset);
  var monthYear = monthBase.getFullYear();
  var monthMonth = monthBase.getMonth();
  var monthStart = fmt(new Date(monthYear, monthMonth, 1));
  var monthEnd = fmt(new Date(monthYear, monthMonth + 1, 0));

  var fetchStart = viewMode === "month" ? monthStart : weekStart;
  var fetchEnd = viewMode === "month" ? monthEnd : weekEnd;

  function isLogged(date, mealType, slotId) {
    if (!slotId) return false;
    return !!loggedSlots[date + "__" + mealType + "__" + slotId] || !!loggedSlots["SLOT__" + slotId];
  }

  const fetchSlots = useCallback(async function () {
    setLoading(true);
    try {
      var userId = pb.authStore.model?.id;
      if (!userId) return;
      var res = await pb.collection("meal_slots").getList(1, 500, {
        filter: `meal_plan.user = "${userId}" && date >= "${fetchStart}" && date <= "${fetchEnd}"`,
        expand: "recipe",
      });
      var map = {};
      for (var slot of res.items) {
        var key = slot.date + "__" + slot.slot;
        if (!map[key]) map[key] = [];
        map[key].push({
          slotId: slot.id,
          recipe: slot.expand?.recipe || null,
          servings_multiplier: slot.servings_multiplier || 1,
        });
      }
      setSlots(map);
    } catch (e) {
      console.error("Fetch slots error:", e);
    } finally {
      setLoading(false);
    }
  }, [fetchStart, fetchEnd]);

  useEffect(function () { fetchSlots(); }, [fetchSlots]);

  useEffect(function () {
    async function fetchLoggedForWeek() {
      try {
        var userId = pb.authStore.model?.id;
        if (!userId) return;
        var res = await pb.collection("food_log").getList(1, 500, {
          filter: `user = "${userId}" && date >= "${weekStart}" && date <= "${weekEnd}" && source_slot_id != ""`,
        });
        var next = {};
        for (var log of res.items) {
          if (!log.source_slot_id) continue;
          next["SLOT__" + log.source_slot_id] = true;
        }
        setLoggedSlots(function (prev) { return Object.assign({}, prev, next); });
      } catch (e) {
        console.error("Fetch logged error:", e);
      }
    }
    fetchLoggedForWeek();
  }, [weekStart, weekEnd]);

  useEffect(function () {
    async function fetchRecipes() {
      try {
        var userId = pb.authStore.model?.id;
        if (!userId) return;
        var res = await pb.collection("recipes").getList(1, 12, {
          filter: `user = "${userId}"`,
          sort: "-created",
        });
        setFeaturedRecipes(res.items);
      } catch (e) { console.error("Fetch recipes error:", e); }
    }
    fetchRecipes();
  }, []);

  useEffect(function () {
    async function fetchGrocery() {
      try {
        var userId = pb.authStore.model?.id;
        if (!userId) return;
        var res = await pb.collection("meal_slots").getList(1, 200, {
          filter: `meal_plan.user = "${userId}" && date >= "${weekStart}" && date <= "${weekEnd}"`,
          expand: "recipe",
        });
        var itemMap = new Map();
        for (var slot of res.items) {
          var recipe = slot.expand?.recipe;
          if (!recipe) continue;
          var multiplier = slot.servings_multiplier || 1;
          var ingList = [];
          if (typeof recipe.ingredients === "string") {
            try { ingList = JSON.parse(recipe.ingredients); } catch { ingList = []; }
          } else if (Array.isArray(recipe.ingredients)) {
            ingList = recipe.ingredients;
          }
          for (var ing of ingList) {
            if (!ing?.name?.trim()) continue;
            var ingKey = ing.name.toLowerCase().trim();
            var qty = (parseFloat(ing.quantity) || 0) * multiplier;
            if (itemMap.has(ingKey)) {
              itemMap.get(ingKey).qty += qty;
            } else {
              itemMap.set(ingKey, { name: ing.name.trim(), qty, unit: ing.unit || "", category: categorizeItem(ing.name) });
            }
          }
        }
        try {
          var checksRes = await pb.collection("grocery_checks").getList(1, 200, {
            filter: `user = "${userId}" && week_start = "${weekStart}"`,
          });
          var savedChecks = {};
          for (var c of checksRes.items) { savedChecks[c.item_key] = c.checked; }
          setCheckedItems(savedChecks);
        } catch {}
        var allItems = Array.from(itemMap.values());
        var grouped = {};
        for (var item of allItems) {
          if (!grouped[item.category]) grouped[item.category] = [];
          grouped[item.category].push(item);
        }
        var sorted = [];
        for (var cat of CATEGORY_ORDER) {
          if (grouped[cat]) sorted.push({ category: cat, icon: CATEGORY_ICONS[cat], items: grouped[cat] });
        }
        setGroceryGroups(sorted);
      } catch (e) { console.error("Fetch grocery error:", e); }
    }
    fetchGrocery();
  }, [weekStart, weekEnd]);

  var openModal = function (date, mealType) {
    setActiveCell({ date, mealType });
    setModalOpen(true);
  };

  var handleRecipeSelect = async function ({ recipe, servingsMultiplier }) {
    if (!activeCell) return;
    setSaving(true);
    try {
      var userId = pb.authStore.model?.id;
      if (!userId) return;
      var date = activeCell.date;
      var mealType = activeCell.mealType;
      var mealPlan;
      var existing = await pb.collection("meal_plans").getList(1, 1, {
        filter: `user = "${userId}" && week_start_date = "${weekStart}"`,
      });
      if (existing.items.length > 0) {
        mealPlan = existing.items[0];
      } else {
        mealPlan = await pb.collection("meal_plans").create({ user: userId, week_start_date: weekStart });
      }
      await pb.collection("meal_slots").create({
        meal_plan: mealPlan.id, date, slot: mealType, recipe: recipe.id, servings_multiplier: servingsMultiplier,
      });
      await fetchSlots();
    } catch (e) {
      console.error("Save slot error:", e);
    } finally {
      setSaving(false);
      setModalOpen(false);
      setActiveCell(null);
    }
  };

  async function toggleCheck(itemKey) {
    var next = !checkedItems[itemKey];
    setCheckedItems(function (prev) {
      var copy = Object.assign({}, prev);
      copy[itemKey] = next;
      return copy;
    });
    try {
      var userId = pb.authStore.model?.id;
      if (!userId) return;
      var existing = await pb.collection("grocery_checks").getList(1, 1, {
        filter: `user = "${userId}" && week_start = "${weekStart}" && item_key = "${itemKey}"`,
      });
      if (existing.items.length > 0) {
        await pb.collection("grocery_checks").update(existing.items[0].id, { checked: next });
      } else {
        await pb.collection("grocery_checks").create({ user: userId, week_start: weekStart, item_key: itemKey, checked: next });
      }
    } catch (err) { console.log("Error saving check:", err); }
  }

  var removeSlot = async function (slotId) {
    try {
      await pb.collection("meal_slots").delete(slotId);
      await fetchSlots();
    } catch (e) { console.error("Remove slot error:", e); }
  };

  var copyLastWeek = async function () {
    try {
      var userId = pb.authStore.model?.id;
      if (!userId) return;
      var lastWeekStart = addDays(weekStart, -7);
      var lastWeekEnd = addDays(weekEnd, -7);
      var res = await pb.collection("meal_slots").getList(1, 200, {
        filter: `meal_plan.user = "${userId}" && date >= "${lastWeekStart}" && date <= "${lastWeekEnd}"`,
      });
      if (res.items.length === 0) { alert("No meals found from last week to copy."); return; }
      var mealPlan;
      var existing = await pb.collection("meal_plans").getList(1, 1, {
        filter: `user = "${userId}" && week_start_date = "${weekStart}"`,
      });
      if (existing.items.length > 0) {
        mealPlan = existing.items[0];
      } else {
        mealPlan = await pb.collection("meal_plans").create({ user: userId, week_start_date: weekStart });
      }
      for (var slot of res.items) {
        await pb.collection("meal_slots").create({
          meal_plan: mealPlan.id, date: addDays(slot.date, 7),
          slot: slot.slot, recipe: slot.recipe, servings_multiplier: slot.servings_multiplier || 1,
        });
      }
      await fetchSlots();
    } catch (e) { console.error("Copy last week error:", e); alert("Failed to copy last week's meals."); }
  };

  var handleAteThis = async function (date, mealType, item) {
    var slotId = item?.slotId;
    if (!slotId || isLogged(date, mealType, slotId)) return;
    setLoggedSlots(function (prev) {
      var copy = Object.assign({}, prev);
      copy["SLOT__" + slotId] = true;
      copy[date + "__" + mealType + "__" + slotId] = true;
      return copy;
    });
    try {
      var userId = pb.authStore.model?.id;
      if (!userId) throw new Error("Not signed in.");
      var existing = await pb.collection("food_log").getList(1, 1, { filter: `source_slot_id = "${slotId}"` });
      if (existing.items.length > 0) return;
      var recipe = item?.recipe;
      if (!recipe) throw new Error("No recipe found.");
      var nut = {};
      if (recipe.nutrition) {
        nut = typeof recipe.nutrition === "string" ? JSON.parse(recipe.nutrition) : recipe.nutrition;
      }
      var mult = item?.servings_multiplier || 1;
      await createFoodLogEntry({
        user: userId, date, meal_type: MEAL_LABELS[mealType] || mealType, name: recipe.title || "Meal",
        calories: Math.round((nut.calories || 0) * mult), protein: Math.round((nut.protein || 0) * mult),
        carbs: Math.round((nut.carbs || 0) * mult), fat: Math.round((nut.fat || 0) * mult),
        servings: mult, recipe: recipe.id, notes: "", source_slot_id: slotId,
      });
    } catch (e) {
      setLoggedSlots(function (prev) {
        var copy = Object.assign({}, prev);
        delete copy["SLOT__" + slotId];
        delete copy[date + "__" + mealType + "__" + slotId];
        return copy;
      });
      console.error("Ate this error:", e);
    }
  };

  var getDayNutrition = function (date) {
    var totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    for (var meal of MEAL_TYPES) {
      var cellSlots = slots[date + "__" + meal] || [];
      for (var s of cellSlots) {
        if (!s.recipe?.nutrition) continue;
        var nut = typeof s.recipe.nutrition === "string" ? JSON.parse(s.recipe.nutrition) : s.recipe.nutrition;
        var mult = s.servings_multiplier || 1;
        totals.calories += Math.round((nut.calories || 0) * mult);
        totals.protein += Math.round((nut.protein || 0) * mult);
        totals.carbs += Math.round((nut.carbs || 0) * mult);
        totals.fat += Math.round((nut.fat || 0) * mult);
      }
    }
    return totals;
  };

  var todayNutrition = getDayNutrition(today);
  var todayMeals = MEAL_TYPES.map(function (meal) {
    return { meal, items: slots[today + "__" + meal] || [] };
  });

  var pageBg =
  "min-h-screen bg-gradient-to-b from-emerald-50/70 via-teal-50/30 to-white " +
  "dark:from-gray-950 dark:via-gray-900 dark:to-gray-950";

var shellCard =
  "bg-white/80 backdrop-blur rounded-[28px] border border-emerald-100/70 shadow-xl shadow-emerald-100/50 " +
  "dark:bg-gray-900/80 dark:border-gray-700/70 dark:shadow-none";

var softBtn =
  "px-3 py-2 rounded-2xl bg-white/90 border border-emerald-100 text-emerald-700 font-semibold hover:bg-emerald-50 transition-colors " +
  "dark:bg-gray-800 dark:border-gray-700 dark:text-emerald-400 dark:hover:bg-gray-700";

  var todayCardStyle = { background: "linear-gradient(135deg, #10b981, #059669)" };
  var slotCardStyle = { backgroundColor: "rgba(255,255,255,0.15)" };
  var nothingTextStyle = { color: "rgba(255,255,255,0.55)" };
  var recipeThumbStyle = { backgroundColor: "rgba(255,255,255,0.2)" };

  var monthCalDays = viewMode === "month" ? getMonthCalendar(monthYear, monthMonth) : [];

  function goToDay(dateStr) {
    setSelectedDay(dateStr);
    setViewMode("day");
    var d = new Date(dateStr + "T12:00:00");
    var todayD = new Date(today + "T12:00:00");
    var diffDays = Math.round((d - todayD) / (24 * 60 * 60 * 1000));
    var diffWeeks = Math.floor(diffDays / 7);
    setWeekOffset(diffWeeks);
  }

  return (
    <div className={pageBg}>
      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-6">
        <div className={shellCard + " p-4 sm:p-6"}>

          {/* ── Header ── */}
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Meal Planner</h1>
              <p className="text-xs text-gray-400 mt-1">
                {viewMode === "month"
                  ? MONTH_NAMES[monthMonth] + " " + monthYear
                  : weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
                    " – " +
                    weekDays[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* View toggle */}
              <div className="flex bg-gray-100 rounded-2xl p-1 gap-1">
                {["day", "week", "month"].map(function (v) {
                  return (
                    <button
                      key={v}
                      onClick={function () { setViewMode(v); }}
                      className={
                        "px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors capitalize " +
                        (viewMode === v
                          ? "bg-white text-emerald-700 shadow-sm border border-emerald-100"
                          : "text-gray-500 hover:text-gray-700")
                      }
                    >
                      {v}
                    </button>
                  );
                })}
              </div>

              {/* Navigation */}
              {viewMode === "month" ? (
                <>
                  <button onClick={function () { setMonthOffset(function (m) { return m - 1; }); }} className={softBtn}>
                    <ChevronLeft size={16} />
                  </button>
                  <button onClick={function () { setMonthOffset(0); }} className={softBtn}>Today</button>
                  <button onClick={function () { setMonthOffset(function (m) { return m + 1; }); }} className={softBtn}>
                    <ChevronRight size={16} />
                  </button>
                </>
              ) : (
                <>
                  <button onClick={function () { setWeekOffset(function (w) { return w - 1; }); }} className={softBtn}>
                    <ChevronLeft size={16} />
                  </button>
                  <button onClick={function () { setWeekOffset(0); }} className={softBtn}>Today</button>
                  <button onClick={function () { setWeekOffset(function (w) { return w + 1; }); }} className={softBtn}>
                    <ChevronRight size={16} />
                  </button>
                  <button onClick={copyLastWeek} className={softBtn}>📋 Copy Last Week</button>
                </>
              )}
            </div>
          </div>

          {/* ── Today Card (day + week views only) ── */}
          {viewMode !== "month" && (
            <div className="rounded-[28px] p-5 text-white shadow-lg shadow-emerald-200/40 mb-5" style={todayCardStyle}>
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-shrink-0">
                  <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest mb-0.5">Today</p>
                  <h2 className="text-xl font-bold">
                    {weekDays.find(function (d) { return fmt(d) === today; })
                      ?.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) || "Today"}
                  </h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 w-full md:w-auto">
                  {todayMeals.map(function (tm) {
                    return (
                      <div key={tm.meal} className="rounded-2xl p-3" style={slotCardStyle}>
                        <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-wider mb-2">{MEAL_LABELS[tm.meal]}</p>
                        {tm.items.length === 0 ? (
                          <p className="text-xs italic" style={nothingTextStyle}>Nothing planned</p>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {tm.items.map(function (item) {
                              var disabled = isLogged(today, tm.meal, item.slotId);
                              var macros = getMacros(item.recipe, item.servings_multiplier);
                              return (
                                <div key={item.slotId} className="flex items-start gap-2">
                                  <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0" style={recipeThumbStyle}>
                                    {item.recipe?.image_url ? (
                                      <img src={item.recipe.image_url} className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <Utensils size={12} className="text-white opacity-60" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-white text-[11px] font-semibold leading-tight line-clamp-2">{item.recipe?.title}</p>
                                    {macros && (
                                      <p className="text-[10px] text-emerald-100 font-bold mt-0.5">
                                        🔥 {macros.cal} · P {macros.p}g
                                      </p>
                                    )}
                                    <button
                                      disabled={disabled}
                                      onClick={function (e) { e.preventDefault(); e.stopPropagation(); handleAteThis(today, tm.meal, item); }}
                                      className={"mt-1 text-[10px] font-bold px-2 py-1 rounded-lg transition-colors " +
                                        (disabled ? "bg-white/10 text-white/60 cursor-not-allowed" : "bg-white/20 hover:bg-white/25")}
                                    >
                                      {disabled ? "Logged" : "✅ Ate this"}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              {todayNutrition.calories > 0 && (
                <div className="flex items-center justify-end gap-4 mt-3 text-emerald-100 text-xs font-bold">
                  <span>🔥 {todayNutrition.calories} cal</span>
                  <span>P {todayNutrition.protein}g</span>
                  <span>C {todayNutrition.carbs}g</span>
                  <span>F {todayNutrition.fat}g</span>
                </div>
              )}
            </div>
          )}

          {/* ── Main content + sidebar ── */}
          <div className={viewMode === "month" ? "" : "flex gap-6 items-start"}>
            <div className={viewMode === "month" ? "" : "flex-1 min-w-0"}>
              {loading ? (
                <div className="flex items-center justify-center py-24">
                  <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {/* ════ DAY VIEW ════ */}
                  {viewMode === "day" && (
                    <div>
                      {/* Day selector strip */}
                      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
                        {weekDays.map(function (d, i) {
                          var date = fmt(d);
                          var isToday = date === today;
                          var isSelected = date === selectedDay;
                          return (
                            <button
                              key={i}
                              onClick={function () { setSelectedDay(date); }}
                              className={
                                "flex-shrink-0 flex flex-col items-center px-4 py-2 rounded-2xl border transition-all " +
                                (isSelected
                                  ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                                  : isToday
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-white/70 text-gray-600 border-gray-100")
                              }
                            >
                              <span className="text-xs font-medium">{DAY_NAMES[i]}</span>
                              <span className="text-base font-bold">{d.getDate()}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Meal sections */}
                      <div className="space-y-3">
                        {MEAL_TYPES.map(function (meal) {
                          var key = selectedDay + "__" + meal;
                          var cellSlots = slots[key] || [];
                          return (
                            <div key={meal} className={"bg-gradient-to-r " + MEAL_COLORS[meal] + " border rounded-3xl p-4"}>
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-bold text-gray-700">{MEAL_LABELS[meal]}</span>
                                <button
                                  onClick={function () { openModal(selectedDay, meal); }}
                                  className="w-8 h-8 rounded-2xl bg-white/80 border border-white/60 shadow-sm flex items-center justify-center hover:bg-white transition-colors"
                                >
                                  <Plus size={14} className="text-emerald-600" />
                                </button>
                              </div>
                              {cellSlots.length === 0 ? (
                                <p className="text-xs text-gray-400 italic">Nothing planned</p>
                              ) : (
                                <div className="space-y-2">
                                  {cellSlots.map(function (cs) {
                                    var disabled = isLogged(selectedDay, meal, cs.slotId);
                                    var macros = getMacros(cs.recipe, cs.servings_multiplier);
                                    var proxied = cs.recipe?.image_url ? getProxiedImage(cs.recipe.image_url) : null;
                                    return (
                                      <div key={cs.slotId}>
                                        <div className="flex items-center gap-3 bg-white/70 rounded-2xl p-3">
                                          {proxied ? (
                                            <img src={proxied} alt={cs.recipe?.title} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                                          ) : (
                                            <div className="w-14 h-14 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                                              <Utensils size={20} className="text-emerald-300" />
                                            </div>
                                          )}
                                          <div className="flex-1 min-w-0">
                                            <a href={"/recipes/" + cs.recipe?.id} className="text-sm font-semibold text-gray-800 hover:text-emerald-700 line-clamp-1">
                                              {cs.recipe?.title}
                                            </a>
                                            {cs.servings_multiplier > 1 && (
                                              <span className="text-xs text-emerald-600 font-bold block">{cs.servings_multiplier}x serving</span>
                                            )}
                                            {macros && (
                                              <div className="flex flex-wrap gap-1 mt-1">
                                                <span className="text-[10px] font-bold bg-white border border-emerald-100 px-2 py-0.5 rounded-full">🔥 {macros.cal}</span>
                                                <span className="text-[10px] font-bold bg-white border border-emerald-100 px-2 py-0.5 rounded-full">P {macros.p}g</span>
                                                <span className="text-[10px] font-bold bg-white border border-emerald-100 px-2 py-0.5 rounded-full">C {macros.c}g</span>
                                                <span className="text-[10px] font-bold bg-white border border-emerald-100 px-2 py-0.5 rounded-full">F {macros.f}g</span>
                                              </div>
                                            )}
                                          </div>
                                          <button
                                            onClick={function (e) { e.preventDefault(); e.stopPropagation(); removeSlot(cs.slotId); }}
                                            className="w-7 h-7 rounded-full hover:bg-red-50 flex items-center justify-center flex-shrink-0"
                                          >
                                            <X size={12} className="text-red-400" />
                                          </button>
                                        </div>
                                        <button
                                          disabled={disabled}
                                          onClick={function (e) { e.preventDefault(); e.stopPropagation(); handleAteThis(selectedDay, meal, cs); }}
                                          className={"w-full text-xs font-semibold py-2 rounded-2xl mt-1 transition-colors " +
                                            (disabled ? "bg-gray-200/70 text-gray-500 cursor-not-allowed" : "bg-emerald-600 text-white hover:bg-emerald-700")}
                                        >
                                          {disabled ? "Logged ✓" : "✅ Ate this"}
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ════ WEEK VIEW ════ */}
                  {viewMode === "week" && (
                    <>
                      {/* Desktop: images-only grid */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full border-separate border-spacing-2 table-fixed">
                          <thead>
                            <tr>
                              <th className="w-24" />
                              {weekDays.map(function (d, i) {
                                var isToday = fmt(d) === today;
                                var dayNut = getDayNutrition(fmt(d));
                                return (
                                  <th key={i} className="text-center pb-1">
                                    <div
                                      onClick={function () { goToDay(fmt(d)); }}
                                      className={
                                        "inline-flex flex-col items-center px-3 py-1.5 rounded-2xl border cursor-pointer hover:bg-emerald-50 transition-colors " +
                                        (isToday
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                          : "bg-white/70 text-gray-600 border-gray-100")
                                      }
                                    >
                                      <span className="text-xs font-medium">{DAY_NAMES[i]}</span>
                                      <span className={"text-base font-bold " + (isToday ? "" : "text-gray-800")}>{d.getDate()}</span>
                                      {dayNut.calories > 0 && (
                                        <span className="text-[9px] font-bold text-emerald-600 mt-0.5">🔥 {dayNut.calories}</span>
                                      )}
                                    </div>
                                  </th>
                                );
                              })}
                            </tr>
                          </thead>
                          <tbody>
                            {MEAL_TYPES.map(function (meal) {
                              return (
                                <tr key={meal}>
                                  <td className="pr-2 py-1 align-middle">
                                    <div className="text-right">
                                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{MEAL_LABELS[meal]}</span>
                                    </div>
                                  </td>
                                  {weekDays.map(function (d, di) {
                                    var date = fmt(d);
                                    var cellSlots = slots[date + "__" + meal] || [];
                                    return (
                                      <td key={di} className={"align-top rounded-2xl " + (fmt(d) === today ? "bg-emerald-50/40" : "")}>
                                        <WeekImageCell
                                          date={date}
                                          meal={meal}
                                          cellSlots={cellSlots}
                                          onAdd={function () { openModal(date, meal); }}
                                          onRemove={removeSlot}
                                          saving={saving}
                                        />
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile: day selector + image-only cards */}
                      <div className="md:hidden">
                        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
                          {weekDays.map(function (d, i) {
                            var date = fmt(d);
                            var isToday = date === today;
                            var isSelected = date === selectedDay;
                            return (
                              <button
                                key={i}
                                onClick={function () { setSelectedDay(date); }}
                                className={
                                  "flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-2xl border transition-all " +
                                  (isSelected ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                                    : isToday ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-white/70 text-gray-600 border-gray-100")
                                }
                              >
                                <span className="text-xs font-medium">{DAY_NAMES[i]}</span>
                                <span className="text-base font-bold">{d.getDate()}</span>
                              </button>
                            );
                          })}
                        </div>
                        <div className="space-y-3">
                          {MEAL_TYPES.map(function (meal) {
                            var key = selectedDay + "__" + meal;
                            var cellSlots = slots[key] || [];
                            return (
                              <div key={meal} className={"bg-gradient-to-r " + MEAL_COLORS[meal] + " border rounded-3xl p-3"}>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-semibold text-gray-700">{MEAL_LABELS[meal]}</span>
                                  <button
                                    onClick={function () { openModal(selectedDay, meal); }}
                                    className="w-8 h-8 rounded-2xl bg-white/80 border border-white/60 shadow-sm flex items-center justify-center hover:bg-white transition-colors"
                                  >
                                    <Plus size={14} className="text-emerald-600" />
                                  </button>
                                </div>
                                {cellSlots.length === 0 ? (
                                  <p className="text-xs text-gray-400 italic">No recipes added</p>
                                ) : (
                                  <div className="flex gap-2 flex-wrap">
                                    {cellSlots.map(function (cs) {
                                      var proxied = cs.recipe?.image_url ? getProxiedImage(cs.recipe.image_url) : null;
                                      return (
                                        <a key={cs.slotId} href={"/recipes/" + cs.recipe?.id} className="relative group" title={cs.recipe?.title}>
                                          {proxied ? (
                                            <img src={proxied} alt={cs.recipe?.title} className="w-12 h-12 rounded-xl object-cover" />
                                          ) : (
                                            <div className="w-12 h-12 rounded-xl bg-white/60 flex items-center justify-center">
                                              <Utensils size={16} className="text-emerald-400" />
                                            </div>
                                          )}
                                        </a>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}

                  {/* ════ MONTH VIEW ════ */}
                  {viewMode === "month" && (
                    <div>
                      {/* Day headers */}
                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {DAY_NAMES.map(function (name) {
                          return (
                            <div key={name} className="text-center text-xs font-bold text-gray-400 uppercase tracking-wider py-1">
                              {name}
                            </div>
                          );
                        })}
                      </div>

                      {/* Calendar grid */}
                      <div className="grid grid-cols-7 gap-1">
                        {monthCalDays.map(function (dayObj, i) {
                          var isToday = dayObj.date === today;
                          return (
                            <div
                              key={i}
                              onClick={function () { if (dayObj.inMonth) goToDay(dayObj.date); }}
                              className={
                                "min-h-[90px] rounded-2xl p-2 transition-colors " +
                                (dayObj.inMonth ? "cursor-pointer " : "opacity-30 ") +
                                (isToday
                                  ? "bg-emerald-50 border border-emerald-300"
                                  : dayObj.inMonth
                                  ? "bg-white/70 border border-gray-100 hover:bg-emerald-50/40"
                                  : "bg-gray-50/50 border border-gray-50")
                              }
                            >
                              <div className={
                                "text-xs font-bold mb-1 w-6 h-6 rounded-full flex items-center justify-center " +
                                (isToday ? "bg-emerald-600 text-white" : "text-gray-700")
                              }>
                                {dayObj.day}
                              </div>
                              <div className="space-y-0.5">
                                {MEAL_TYPES.map(function (meal) {
                                  var cellSlots = slots[dayObj.date + "__" + meal] || [];
                                  return cellSlots.map(function (cs) {
                                    return (
                                      <div
                                        key={cs.slotId}
                                        className="text-[9px] font-semibold text-gray-600 truncate leading-tight bg-emerald-50 border border-emerald-100 rounded px-1 py-0.5"
                                      >
                                        {cs.recipe?.title || "Recipe"}
                                      </div>
                                    );
                                  });
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ── Grocery sidebar (day + week views only) ── */}
            {viewMode !== "month" && (
              <div className="hidden lg:flex flex-col gap-4 w-80 flex-shrink-0 sticky top-6 self-start">
                <div className="bg-white/70 backdrop-blur rounded-3xl border border-emerald-100/70 shadow-lg shadow-emerald-100/40 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-emerald-100/60 bg-white/40">
                    <h3 className="font-bold text-gray-800 text-sm">🛒 This Week's Shopping</h3>
                    <a href="/grocery-list" className="text-xs text-emerald-700 font-semibold hover:underline">See all</a>
                  </div>
                  {groceryGroups.length === 0 ? (
                    <p className="text-xs text-gray-400 italic p-4">Add meals to generate your list</p>
                  ) : (
                    <div className="max-h-[520px] overflow-y-auto">
                      {groceryGroups.map(function (group, gi) {
                        return (
                          <div key={gi}>
                            <div className="px-4 py-2 bg-emerald-50/40 border-b border-emerald-100/60">
                              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                {group.icon} {group.category}
                              </span>
                            </div>
                            <ul className="divide-y divide-emerald-100/60">
                              {group.items.map(function (item, i) {
                                var checkKey = item.name.toLowerCase().trim();
                                return (
                                  <li
                                    key={i}
                                    className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-emerald-50/40 transition-colors"
                                    onClick={function () { toggleCheck(checkKey); }}
                                  >
                                    <div className={
                                      "w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors " +
                                      (checkedItems[checkKey] ? "bg-emerald-600 border-emerald-600" : "border-emerald-200")
                                    }>
                                      {checkedItems[checkKey] && (
                                        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                      )}
                                    </div>
                                    <span className={"flex-1 text-xs transition-colors " + (checkedItems[checkKey] ? "line-through text-gray-300" : "text-gray-700")}>
                                      {item.name}
                                    </span>
                                    {item.qty > 0 && (
                                      <span className={"text-xs flex-shrink-0 " + (checkedItems[checkKey] ? "text-gray-300" : "text-gray-400")}>
                                        {parseFloat(item.qty.toFixed(1))} {item.unit}
                                      </span>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Recent Recipes (day + week views only) ── */}
          {viewMode !== "month" && (
            <>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-6">Browse your library</p>
              <div className="bg-white/60 backdrop-blur rounded-[28px] border border-emerald-100/70 shadow-lg shadow-emerald-100/40 p-4 mt-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-800 text-sm">⭐ Recent Recipes</h3>
                  <a href="/recipes" className="text-xs text-emerald-700 font-semibold hover:underline">See all</a>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {featuredRecipes.map(function (recipe) {
                    var nut = null;
                    if (recipe.nutrition) {
                      nut = typeof recipe.nutrition === "string" ? JSON.parse(recipe.nutrition) : recipe.nutrition;
                    }
                    var macros = nut
                      ? { cal: Math.round(nut.calories || 0), p: Math.round(nut.protein || 0), c: Math.round(nut.carbs || 0), f: Math.round(nut.fat || 0) }
                      : null;
                    return (
                      <a
                        key={recipe.id}
                        href={"/recipes/" + recipe.id}
                        className="flex-shrink-0 w-40 bg-white/70 rounded-3xl border border-emerald-100/60 shadow-sm p-3 hover:shadow-md transition-shadow group"
                        title={recipe.title}
                      >
                        <div className="w-full h-24 rounded-2xl overflow-hidden bg-emerald-50 mb-2 relative">
                          {recipe.image_url ? (
                            <img src={recipe.image_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt={recipe.title} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Utensils size={24} className="text-emerald-300" />
                            </div>
                          )}
                          {macros && macros.cal > 0 && (
                            <div className="absolute bottom-2 left-2 flex gap-1">
                              <span className="bg-white/90 backdrop-blur-sm text-[10px] font-bold text-emerald-700 px-2 py-1 rounded-full">🔥 {macros.cal}</span>
                              <span className="bg-white/90 backdrop-blur-sm text-[10px] font-bold text-gray-700 px-2 py-1 rounded-full">P {macros.p}</span>
                            </div>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-gray-800 line-clamp-2">{recipe.title}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{recipe.servings} servings</p>
                        {macros && (
                          <p className="text-[10px] text-gray-400 mt-1 font-semibold">P {macros.p}g · C {macros.c}g · F {macros.f}g</p>
                        )}
                      </a>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <RecipePickerModal
        isOpen={modalOpen}
        onClose={function () { setModalOpen(false); setActiveCell(null); }}
        onSelect={handleRecipeSelect}
      />
    </div>
  );
}

// ── Week view: images-only cell ──
function WeekImageCell({ date, meal, cellSlots, onAdd, onRemove, saving }) {
  return (
    <div className="min-h-[72px] bg-white/70 backdrop-blur border border-emerald-100/70 rounded-3xl p-2 flex flex-col gap-1.5 hover:border-emerald-200 transition-colors">
      {cellSlots.map(function (cs) {
        return (
          <WeekImageCard key={cs.slotId} recipe={cs.recipe} slotId={cs.slotId} onRemove={function () { onRemove(cs.slotId); }} />
        );
      })}
      <button
        onClick={onAdd}
        disabled={saving}
        className="flex items-center justify-center w-full mt-auto py-2 rounded-2xl border border-dashed border-emerald-100/80 hover:border-emerald-300 hover:bg-emerald-50/60 transition-colors"
      >
        <Plus size={14} className="text-emerald-300" />
      </button>
    </div>
  );
}

function WeekImageCard({ recipe, slotId, onRemove }) {
  const [imgError, setImgError] = useState(false);
  if (!recipe) return null;
  var proxied = !imgError && recipe.image_url ? getProxiedImage(recipe.image_url) : null;
  return (
    <a
      href={"/recipes/" + recipe.id}
      className="relative group/card block"
      title={recipe.title}
    >
      {proxied ? (
        <img
          src={proxied}
          alt={recipe.title}
          className="w-full h-14 rounded-xl object-cover"
          onError={function () { setImgError(true); }}
        />
      ) : (
        <div className="w-full h-14 rounded-xl bg-emerald-50 flex items-center justify-center">
          <Utensils size={16} className="text-emerald-300" />
        </div>
      )}
      <div className="absolute inset-0 rounded-xl bg-black/0 group-hover/card:bg-black/10 transition-colors" />
      <button
        onClick={function (e) { e.preventDefault(); e.stopPropagation(); onRemove(); }}
        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white border border-emerald-100 text-gray-500 hidden group-hover/card:flex items-center justify-center shadow-sm"
      >
        <X size={10} />
      </button>
    </a>
  );
}
