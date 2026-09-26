import pb from './pb';

// Same meals, weeks, and dates the planner (HomePage) uses, so a recipe added
// from its own page lands exactly where the planner expects it.
export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];
export const MEAL_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' };

function getWeekDays(base) {
  var day = base.getDay();
  var mon = new Date(base);
  mon.setDate(base.getDate() - ((day + 6) % 7));
  mon.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, function(_, i) {
    var d = new Date(mon); d.setDate(mon.getDate() + i); return d;
  });
}
function fmt(d) { return d.toISOString().split('T')[0]; }

/** Today's date as YYYY-MM-DD in the user's own time zone (not UTC). */
export function todayLocal() {
  var d = new Date();
  var mm = String(d.getMonth() + 1).padStart(2, '0');
  var dd = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + mm + '-' + dd;
}

/**
 * Put a recipe on the plan. Finds or creates that week's meal plan, then
 * adds the meal — the same two steps as the planner's own "add" flow.
 */
export async function addRecipeToPlan({ recipeId, date, meal, multiplier }) {
  var userId = pb.authStore.model?.id;
  if (!userId) throw new Error('Please sign in again.');
  if (!recipeId || !date || MEAL_TYPES.indexOf(meal) === -1) throw new Error('Missing recipe, date, or meal.');

  var weekStart = fmt(getWeekDays(new Date(date + 'T00:00:00'))[0]);
  var existing = await pb.collection('meal_plans').getList(1, 1, {
    filter: 'user="' + userId + '" && week_start_date="' + weekStart + '"',
  });
  var mealPlan = existing.items.length > 0
    ? existing.items[0]
    : await pb.collection('meal_plans').create({ user: userId, week_start_date: weekStart });

  return pb.collection('meal_slots').create({
    meal_plan: mealPlan.id,
    date: date,
    slot: meal,
    recipe: recipeId,
    servings_multiplier: Number(multiplier) || 1,
  });
}
