const N8N_NUTRITION_WEBHOOK = 'https://n8n.srv1052955.hstgr.cloud/webhook/nutrition-calc';

/**
 * Clean an ingredient name for better USDA matching.
 * Strips parentheticals, prep instructions, and modifiers.
 */
function cleanIngredientName(name) {
  if (!name) return '';
  let cleaned = String(name);

  // Remove anything in parentheses: "mushrooms (sliced)" -> "mushrooms"
  cleaned = cleaned.replace(/\([^)]*\)/g, '');

  // Remove common prep instructions after commas: "leeks, sliced thin" -> "leeks"
  cleaned = cleaned.split(',')[0];

  // Remove common modifier words that confuse USDA search
  const modifiersToStrip = [
    'low sodium', 'low-sodium', 'reduced sodium',
    'fat free', 'fat-free', 'low fat', 'low-fat',
    'boneless', 'skinless', 'organic',
    'fresh', 'frozen', 'dried',
    'chopped', 'diced', 'minced', 'sliced', 'grated', 'shredded',
    'cooked', 'raw', 'uncooked',
    'plus', 'divided', 'optional',
    'better than bouillon',
  ];
  for (const word of modifiersToStrip) {
    cleaned = cleaned.replace(new RegExp(`\\b${word}\\b`, 'gi'), '');
  }

  // Collapse multiple spaces, trim
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned || name; // fall back to original if cleaning emptied it
}

/**
 * Sends ingredients + servings to the n8n nutrition calculator.
 * Returns { perServing, totals, breakdown } or null on failure.
 */
export async function fetchNutritionFromIngredients(ingredients, servings) {
  try {
    // Pre-clean ingredient names for better USDA matching
    const cleanedIngredients = ingredients.map((ing) => ({
      ...ing,
      name: cleanIngredientName(ing.name),
      originalName: ing.name, // preserve original for display/debugging
    }));

    console.log('Sending cleaned ingredients to n8n:', cleanedIngredients);

    const res = await fetch(N8N_NUTRITION_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingredients: cleanedIngredients, servings: servings || 1 }),
    });
    if (!res.ok) {
      console.error('Nutrition calc failed:', res.status);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error('Nutrition calc error:', err);
    return null;
  }
}
