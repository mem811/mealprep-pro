import { useState, useEffect, useCallback } from 'react';
import pb from '../lib/pb';
import RecipePickerModal from '../components/RecipePickerModal';
import { Plus, ChevronLeft, ChevronRight, X, Utensils } from 'lucide-react';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' };
const MEAL_COLORS = {
  breakfast: 'from-amber-50 to-orange-50 border-amber-200',
  lunch:     'from-green-50 to-emerald-50 border-green-200',
  dinner:    'from-blue-50 to-indigo-50 border-blue-200',
  snack:     'from-purple-50 to-pink-50 border-purple-200',
};
const MEAL_ICONS = { breakfast: '', lunch: '', dinner: '', snack: '' };

function getWeekDays(baseDate) {
  const day = baseDate.getDay();
  const monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() - ((day + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function fmt(d) {
  return d.toISOString().split('T')[0];
}

function getProxiedImage(url) {
  if (!url) return null;
  return `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=80&h=80&fit=cover&q=80`;
}
export default function HomePage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(fmt(new Date()));
  const [slots, setSlots] = useState({});
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeCell, setActiveCell] = useState(null);
  const [saving, setSaving] = useState(false);

  const [featuredRecipes, setFeaturedRecipes] = useState([]);
  const [groceryItems, setGroceryItems] = useState([]);
  const [checkedItems, setCheckedItems] = useState({});

  const today = fmt(new Date());
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + weekOffset * 7);
  const weekDays = getWeekDays(baseDate);
  const weekStart = fmt(weekDays[0]);
  const weekEnd = fmt(weekDays[6]);

  const fetchSlots = useCallback(async () => {
    setLoading(true);
    try {
      const userId = pb.authStore.model?.id;
      if (!userId) return;
      const res = await pb.collection('meal_slots').getList(1, 200, {
        filter: `meal_plan.user = "${userId}" && date >= "${weekStart}" && date <= "${weekEnd}"`,
        expand: 'recipe',
      });
      const map = {};
      for (const slot of res.items) {
        const key = `${slot.date}__${slot.slot}`;
        if (!map[key]) map[key] = [];
        map[key].push({
          slotId: slot.id,
          recipe: slot.expand?.recipe || null,
          servings_multiplier: slot.servings_multiplier || 1,
        });
      }
      setSlots(map);
    } catch (e) {
      console.error('Fetch slots error:', e);
    } finally {
      setLoading(false);
    }
  }, [weekStart, weekEnd]);

  useEffect(() => { fetchSlots(); }, [fetchSlots]);

  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        const userId = pb.authStore.model?.id;
        if (!userId) return;
        const res = await pb.collection('recipes').getList(1, 6, {
          filter: `user = "${userId}"`,
          sort: '-created',
        });
        setFeaturedRecipes(res.items);
      } catch (e) {
        console.error('Fetch recipes error:', e);
      }
    };
    fetchRecipes();
  }, []);

  useEffect(() => {
    const fetchGrocery = async () => {
      try {
        const userId = pb.authStore.model?.id;
        if (!userId) return;
        const res = await pb.collection('meal_slots').getList(1, 200, {
          filter: `meal_plan.user = "${userId}" && date >= "${weekStart}" && date <= "${weekEnd}"`,
          expand: 'recipe',
        });
        const itemMap = new Map();
        for (const slot of res.items) {
          const recipe = slot.expand?.recipe;
          if (!recipe) continue;
          const multiplier = slot.servings_multiplier || 1;
          let ingList = [];
          if (typeof recipe.ingredients === 'string') {
            try { ingList = JSON.parse(recipe.ingredients); } catch { ingList = []; }
          } else if (Array.isArray(recipe.ingredients)) {
            ingList = recipe.ingredients;
          }
          for (const ing of ingList) {
            if (!ing.name?.trim()) continue;
            const key = ing.name.toLowerCase().trim();
            const qty = (parseFloat(ing.quantity) || 0) * multiplier;
            if (itemMap.has(key)) {
              itemMap.get(key).qty += qty;
            } else {
              itemMap.set(key, { name: ing.name.trim(), qty, unit: ing.unit || '' });
            }
          }
        }
        setGroceryItems(Array.from(itemMap.values()).slice(0, 12));
      } catch (e) {
        console.error('Fetch grocery error:', e);
      }
    };
    fetchGrocery();
  }, [weekStart, weekEnd]);

  const openModal = (date, mealType) => {
    setActiveCell({ date, mealType });
    setModalOpen(true);
  };

  const handleRecipeSelect = async ({ recipe, servingsMultiplier }) => {
    if (!activeCell) return;
    setSaving(true);
    try {
      const userId = pb.authStore.model?.id;
      const { date, mealType } = activeCell;

      let mealPlan;
      const existing = await pb.collection('meal_plans').getList(1, 1, {
        filter: `user = "${userId}" && week_start_date = "${weekStart}"`,
      });
      if (existing.items.length > 0) {
        mealPlan = existing.items[0];
      } else {
        mealPlan = await pb.collection('meal_plans').create({
          user: userId,
          week_start_date: weekStart,
        });
      }

      await pb.collection('meal_slots').create({
        meal_plan: mealPlan.id,
        date,
        slot: mealType,
        recipe: recipe.id,
        servings_multiplier: servingsMultiplier,
      });

      await fetchSlots();
    } catch (e) {
      console.error('Save slot error:', e);
    } finally {
      setSaving(false);
      setModalOpen(false);
      setActiveCell(null);
    }
  };

  const removeSlot = async (slotId) => {
    try {
      await pb.collection('meal_slots').delete(slotId);