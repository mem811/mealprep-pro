const N8N_NUTRITION_WEBHOOK = 'https://n8n.srv1052955.hstgr.cloud/webhook/nutrition-calc';

export async function fetchNutritionFromIngredients(ingredients, servings) {
  try {
    const res = await fetch(N8N_NUTRITION_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingredients, servings: servings || 1 }),
    });
    if (!res.ok) {
      console.error('Nutrition calc failed:', res.status);
      return null;
    }
    const data = await res.json();
    return Array.isArray(data) ? data[0] : data;
  } catch (err) {
    console.error('Nutrition calc error:', err);
    return null;
  }
}
