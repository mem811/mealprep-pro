const N8N_NUTRITION_WEBHOOK = 'https://n8n.srv1052955.hstgr.cloud/webhook/nutrition-calc';

// Convert unicode fractions to decimal strings
const FRACTION_MAP = {
  '½': '0.5', '⅓': '0.333', '⅔': '0.667',
  '¼': '0.25', '¾': '0.75',
  '⅕': '0.2', '⅖': '0.4', '⅗': '0.6', '⅘': '0.8',
  '⅙': '0.167', '⅚': '0.833',
  '⅛': '0.125', '⅜': '0.375', '⅝': '0.625', '⅞': '0.875',
};

const UNITS_PATTERN = '(cups?|tablespoons?|tbsp|teaspoons?|tsp|ounces?|oz|pounds?|lbs?|grams?|g|kg|ml|liters?|l|pinch|dash|cloves?|slices?|pieces?|packets?|cans?|sticks?)';

function normalizeFractions(str) {
  let result = String(str || '');
  for (const [frac, dec] of Object.entries(FRACTION_MAP)) {
    result = result.replace(new RegExp(frac, 'g'), dec);
  }
  // Handle ASCII fractions like "1/2"
  result = result.replace(/(\d+)\/(\d+)/g, (_, a, b) => (parseFloat(a) / parseFloat(b)).toFixed(3));
  return result;
}

function cleanFoodName(name) {
  if (!name) return '';
  let cleaned = String(name);
  cleaned = cleaned.replace(/\([^)]*\)/g, ''); // remove parentheticals
  cleaned = cleaned.split(',')[0]; // drop everything after first comma
  const stripWords = [
    'low sodium', 'low-sodium', 'reduced sodium',
    'fat free', 'fat-free', 'low fat', 'low-fat',
    'boneless', 'skinless', 'organic',
    'fresh', 'frozen', 'dried',
    'chopped', 'diced', 'minced', 'sliced', 'grated', 'shredded',
    'cooked', 'raw', 'uncooked',
    'plus', 'divided', 'optional',
  ];
  for (const word of stripWords) {
    cleaned = cleaned.replace(new RegExp(`\\b${word}\\b`, 'gi'), '');
  }
  return cleaned.replace(/\s+/g, ' ').trim();
}

function parseIngredient(ing) {
  const originalName = ing.name || '';

  // If quantity and unit are already provided, just clean the name
  if (ing.quantity && String(ing.quantity).trim() !== '') {
    return {
      name: cleanFoodName(ing.name),
      quantity: String(ing.quantity),
      unit: ing.unit || '',
      originalName,
    };
  }

  // Otherwise, try to extract quantity + unit from the name string
  const normalized = normalizeFractions(originalName);

  // Pattern: number(s) + unit + rest
  const withUnit = new RegExp(`^\\s*([\\d.]+)\\s+${UNITS_PATTERN}\\s+(.+)$`, 'i');
  let match = normalized.match(withUnit);
  if (match) {
    return {
      name: cleanFoodName(match[3]),
      quantity: match[1],
      unit: match[2].toLowerCase(),
      originalName,
    };
  }

  // Pattern: number + rest (no unit, just a count like "8 chicken thighs")
  const numberOnly = /^\s*([\d.]+)\s+(.+)$/;
  match = normalized.match(numberOnly);
  if (match) {
    return {
      name: cleanFoodName(match[2]),
      quantity: match[1],
      unit: '',
      originalName,
    };
  }

  // No number found — assume quantity 1, no unit
  return {
    name: cleanFoodName(originalName),
    quantity: '1',
    unit: '',
    originalName,
  };
}

export async function fetchNutritionFromIngredients(ingredients, servings) {
  try {
    const parsed = ingredients.map(parseIngredient);
    console.log('Parsed ingredients for n8n:', parsed);

    const res = await fetch(N8N_NUTRITION_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingredients: parsed, servings: servings || 1 }),
    });
    if (!res.ok) {
      console.error('Nutrition calc failed:', res.status);
      return null;
    }
    const data = await res.json();
    // n8n sometimes returns the result wrapped in an array — unwrap it
    return Array.isArray(data) ? data[0] : data;
  } catch (err) {
    console.error('Nutrition calc error:', err);
    return null;
  }
}
