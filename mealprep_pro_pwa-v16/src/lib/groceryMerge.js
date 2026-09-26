// ─────────────────────────────────────────────────────────────
// Combining ingredients for the grocery list.
// Used by both the Grocery List page and the planner's shopping sidebar
// so they always show the same amounts.
//
// Amounts are only added together when they can really be converted:
// cups/tbsp/tsp combine, lb/oz/g combine, counts combine. Anything else
// is listed side by side ("3 cloves + 1 tsp") rather than mis-added.
// ─────────────────────────────────────────────────────────────

var VOLUME_ML = { tsp: 4.92892, tbsp: 14.7868, cup: 236.588, 'fl oz': 29.5735, ml: 1, l: 1000 };
var WEIGHT_G = { g: 1, kg: 1000, oz: 28.3495, lb: 453.592 };
var METRIC = { ml: 1, l: 1, g: 1, kg: 1 };

var ALIASES = {
  teaspoon: 'tsp', teaspoons: 'tsp', tsps: 'tsp', t: 'tsp',
  tablespoon: 'tbsp', tablespoons: 'tbsp', tbsps: 'tbsp', tbs: 'tbsp', tbl: 'tbsp', T: 'tbsp',
  cups: 'cup', c: 'cup',
  'fluid ounce': 'fl oz', 'fluid ounces': 'fl oz', 'fl. oz': 'fl oz', floz: 'fl oz',
  milliliter: 'ml', milliliters: 'ml', millilitre: 'ml', millilitres: 'ml',
  liter: 'l', liters: 'l', litre: 'l', litres: 'l',
  gram: 'g', grams: 'g', kilogram: 'kg', kilograms: 'kg',
  ounce: 'oz', ounces: 'oz', pound: 'lb', pounds: 'lb', lbs: 'lb',
  pieces: 'piece', pcs: 'piece', pc: 'piece', each: 'piece', whole: 'piece',
  cloves: 'clove', slices: 'slice', cans: 'can', bunches: 'bunch',
  packages: 'package', pkg: 'package', packet: 'package', packets: 'package',
  pinches: 'pinch', sticks: 'stick', heads: 'head', stalks: 'stalk',
};

export function normalizeGroceryUnit(unit) {
  var u = String(unit || '').trim();
  if (!u) return 'piece';
  if (ALIASES[u]) return ALIASES[u];
  var lower = u.toLowerCase().replace(/\.$/, '');
  return ALIASES[lower] || lower;
}

function familyOf(unit) {
  if (VOLUME_ML[unit]) return 'volume';
  if (WEIGHT_G[unit]) return 'weight';
  return 'each:' + unit; // counts only combine with the same kind of count
}

/** Add one recipe ingredient (already scaled by multiplier) into the map. */
export function addGroceryIngredient(map, ing, multiplier, categorize) {
  if (!ing || !ing.name || !String(ing.name).trim()) return;
  var name = String(ing.name).trim();
  var key = name.toLowerCase();
  var qty = (parseFloat(ing.quantity) || 0) * (Number(multiplier) || 1);
  var unit = normalizeGroceryUnit(ing.unit);

  var item = map.get(key);
  if (!item) {
    item = { name: name, category: categorize ? categorize(name) : 'Other', parts: {}, order: [] };
    map.set(key, item);
  }
  if (!(qty > 0) || unit === 'to taste') return; // "salt to taste": listed, no amount

  var fam = familyOf(unit);
  var part = item.parts[fam];
  if (!part) {
    part = { base: 0, units: {}, firstUnit: unit, entries: 0 };
    item.parts[fam] = part;
    item.order.push(fam);
  }
  var factor = fam === 'volume' ? VOLUME_ML[unit] : fam === 'weight' ? WEIGHT_G[unit] : 1;
  part.base += qty * factor;
  part.entries += 1;
  part.units[unit] = (part.units[unit] || 0) + qty;
}

// ── Display ──────────────────────────────────────────────────

var FRACTIONS = [[0, ''], [0.25, '¼'], [1 / 3, '⅓'], [0.5, '½'], [2 / 3, '⅔'], [0.75, '¾'], [1, '']];

function niceNumber(n) {
  var whole = Math.floor(n);
  var rest = n - whole;
  for (var i = 0; i < FRACTIONS.length; i++) {
    if (Math.abs(rest - FRACTIONS[i][0]) < 0.04) {
      var w = FRACTIONS[i][0] === 1 ? whole + 1 : whole;
      var glyph = FRACTIONS[i][1];
      if (!glyph) return String(w);
      return w ? w + ' ' + glyph : glyph;
    }
  }
  return String(Math.round(n * 10) / 10);
}

// Round a combined total UP to something you can actually buy/measure
function roundUpForShopping(n, step) {
  return Math.ceil(n / step - 0.02) * step;
}

// Smallest quarter or third at or above n: 0.66 -> 2/3, 2.08 -> 2 1/4
function niceCeil(n) {
  var quarters = Math.ceil(n * 4 - 0.08) / 4;
  var thirds = Math.ceil(n * 3 - 0.06) / 3;
  return Math.min(quarters, thirds);
}

var PLURALS = { cup: 'cups', clove: 'cloves', slice: 'slices', can: 'cans', bunch: 'bunches', package: 'packages', pinch: 'pinches', stick: 'sticks', head: 'heads', stalk: 'stalks' };

function withUnit(n, unit) {
  if (unit === 'piece') return niceNumber(n);
  var label = n > 1.01 && PLURALS[unit] ? PLURALS[unit] : unit;
  return niceNumber(n) + ' ' + label;
}

function describePart(fam, part) {
  var unitsUsed = Object.keys(part.units);
  // An ingredient used once keeps the recipe's own wording ("8 tbsp butter")
  if (part.entries === 1) return withUnit(part.units[unitsUsed[0]], unitsUsed[0]);

  var allMetric = unitsUsed.every(function(u) { return METRIC[u]; });
  if (fam === 'volume') {
    var ml = part.base;
    if (allMetric) return ml >= 1000 ? withUnit(roundUpForShopping(ml / 1000, 0.25), 'l') : withUnit(roundUpForShopping(ml, 5), 'ml');
    if (ml >= VOLUME_ML.cup / 4 - 0.5) return withUnit(niceCeil(ml / VOLUME_ML.cup), 'cup');
    if (ml >= VOLUME_ML.tbsp - 0.2) return withUnit(roundUpForShopping(ml / VOLUME_ML.tbsp, 0.5), 'tbsp');
    return withUnit(roundUpForShopping(ml / VOLUME_ML.tsp, 0.25), 'tsp');
  }
  if (fam === 'weight') {
    var g = part.base;
    if (allMetric) return g >= 1000 ? withUnit(roundUpForShopping(g / 1000, 0.25), 'kg') : withUnit(roundUpForShopping(g, 5), 'g');
    if (g >= WEIGHT_G.lb - 1) return withUnit(roundUpForShopping(g / WEIGHT_G.lb, 0.25), 'lb');
    return withUnit(roundUpForShopping(g / WEIGHT_G.oz, 1), 'oz');
  }
  return withUnit(part.base, part.firstUnit);
}

/**
 * Turn the map into display-ready items:
 *   { name, category, amount: "1 ½ cups" | "3 cloves + 1 tsp" | "", qty, unit }
 * qty/unit are kept for anything that still reads them.
 */
export function finalizeGroceryItems(map) {
  return Array.from(map.values()).map(function(item) {
    var pieces = item.order.map(function(fam) { return describePart(fam, item.parts[fam]); });
    var first = item.order.length ? item.parts[item.order[0]] : null;
    return {
      name: item.name,
      category: item.category,
      amount: pieces.join(' + '),
      qty: first ? first.units[first.firstUnit] || 0 : 0,
      unit: first ? first.firstUnit : '',
    };
  });
}

// ─────────────────────────────────────────────────────────────
// Aisle sorting
// Same categories the pages already show. Specific phrases are checked
// first ("peanut butter", "tomato paste"), then the last word of the
// name — the thing it actually IS ("chicken BROTH", "cheddar CHEESE") —
// then any other word, matched as whole words so "eggplant" isn't "egg".
// ─────────────────────────────────────────────────────────────

var PHRASES = [
  // Pantry items that name a fresh or dairy food
  ['peanut butter', 'Pantry'], ['almond butter', 'Pantry'], ['nut butter', 'Pantry'], ['apple butter', 'Pantry'],
  ['coconut milk', 'Pantry'], ['coconut cream', 'Pantry'], ['evaporated milk', 'Pantry'], ['condensed milk', 'Pantry'],
  ['cream of', 'Pantry'], ['egg noodle', 'Pantry'], ['bread crumb', 'Pantry'], ['breadcrumb', 'Pantry'], ['panko', 'Pantry'],
  ['tomato paste', 'Pantry'], ['tomato sauce', 'Pantry'], ['canned tomato', 'Pantry'], ['diced tomato', 'Pantry'],
  ['crushed tomato', 'Pantry'], ['sun-dried tomato', 'Pantry'], ['sun dried tomato', 'Pantry'], ['marinara', 'Pantry'],
  ['chicken broth', 'Pantry'], ['beef broth', 'Pantry'], ['vegetable broth', 'Pantry'], ['bone broth', 'Pantry'],
  ['chicken stock', 'Pantry'], ['beef stock', 'Pantry'], ['vegetable stock', 'Pantry'], ['bouillon', 'Pantry'],
  ['canned tuna', 'Pantry'], ['canned chicken', 'Pantry'], ['pumpkin puree', 'Pantry'], ['canned pumpkin', 'Pantry'],
  ['lemon juice', 'Produce'], ['lime juice', 'Produce'],
  // Spices that name a vegetable
  ['garlic powder', 'Spices'], ['onion powder', 'Spices'], ['chili powder', 'Spices'], ['curry powder', 'Spices'],
  ['black pepper', 'Spices'], ['white pepper', 'Spices'], ['cayenne pepper', 'Spices'], ['red pepper flake', 'Spices'],
  ['pepper flake', 'Spices'], ['chili flake', 'Spices'], ['garlic salt', 'Spices'], ['onion flake', 'Spices'],
  ['dried basil', 'Spices'], ['dried oregano', 'Spices'], ['dried thyme', 'Spices'], ['dried parsley', 'Spices'],
  ['dried rosemary', 'Spices'], ['dried dill', 'Spices'], ['bay leaf', 'Spices'], ['italian seasoning', 'Spices'],
  ['taco seasoning', 'Spices'], ['ground ginger', 'Spices'], ['ground cinnamon', 'Spices'],
  // Fresh peppers aren't the spice
  ['bell pepper', 'Produce'], ['jalapeno', 'Produce'], ['jalapeño', 'Produce'], ['poblano', 'Produce'],
  ['serrano', 'Produce'], ['habanero', 'Produce'], ['garlic clove', 'Produce'], ['green onion', 'Produce'],
  ['sweet potato', 'Produce'], ['spaghetti squash', 'Produce'], ['butternut squash', 'Produce'],
  // Dairy phrases
  ['cream cheese', 'Dairy'], ['sour cream', 'Dairy'], ['heavy cream', 'Dairy'], ['whipping cream', 'Dairy'],
  ['half and half', 'Dairy'], ['half-and-half', 'Dairy'], ['egg white', 'Dairy'], ['egg yolk', 'Dairy'],
  ['greek yogurt', 'Dairy'], ['cottage cheese', 'Dairy'],
  // Baking
  ['baking powder', 'Baking'], ['baking soda', 'Baking'], ['chocolate chip', 'Baking'], ['cocoa powder', 'Baking'],
  ['vanilla extract', 'Baking'], ['corn starch', 'Baking'], ['cornstarch', 'Baking'],
  // Oils and sauces
  ['olive oil', 'Pantry'], ['cooking spray', 'Pantry'], ['soy sauce', 'Pantry'], ['hot sauce', 'Pantry'],
  ['worcestershire', 'Pantry'], ['maple syrup', 'Pantry'],
];

var WORDS = {
  Produce: 'onion shallot leek scallion garlic tomato lettuce spinach kale arugula chard carrot potato avocado lemon lime orange grapefruit apple banana pear peach plum mango pineapple berry strawberry blueberry raspberry blackberry cherry grape melon watermelon cantaloupe celery cucumber zucchini squash broccoli cauliflower cabbage brussels mushroom ginger cilantro parsley basil mint dill rosemary sage chive corn pea asparagus radish beet eggplant pumpkin okra artichoke fennel jicama sprout greens herb salad',
  Protein: 'chicken beef pork turkey bacon sausage ham steak lamb veal bison shrimp prawn fish salmon tuna cod tilapia halibut trout scallop crab lobster tofu tempeh seitan prosciutto pancetta chorizo pepperoni salami meatball breast thigh drumstick wing tenderloin sirloin brisket rib chop',
  Dairy: 'butter milk cream cheese cheddar mozzarella parmesan parmigiano pecorino ricotta feta gouda provolone brie gruyere mascarpone yogurt egg buttermilk ghee kefir',
  Baking: 'flour sugar yeast extract cocoa chocolate sprinkle molasses gelatin',
  Spices: 'salt pepper peppercorn cinnamon paprika cumin oregano thyme nutmeg turmeric cayenne seasoning allspice cardamom coriander clove',
  Pantry: 'oil vinegar sauce broth stock rice pasta macaroni spaghetti penne rigatoni fettuccine linguine lasagna noodle orzo couscous quinoa oat oatmeal barley bread bun roll bagel tortilla pita cracker cereal granola bean lentil chickpea honey syrup ketchup mustard mayonnaise mayo salsa soup nut almond walnut pecan cashew pistachio peanut seed raisin coffee tea wine jam jelly paste',
};

var WORD_CATEGORY = {};
Object.keys(WORDS).forEach(function(cat) {
  WORDS[cat].split(' ').forEach(function(w) { WORD_CATEGORY[w] = cat; });
});

// Size and prep words say nothing about the aisle
var FILLER = /\b(fresh|freshly|frozen|large|medium|small|extra|virgin|chopped|diced|minced|sliced|grated|shredded|cubed|crumbled|ground|whole|boneless|skinless|raw|cooked|organic|unsalted|salted|sharp|mild|low|fat|free|reduced|sodium|lean|ripe|finely|roughly|thinly|packed|softened|melted|divided|optional|about|plus|more|for|to|taste|and|or|of|the|a|an)\b/g;

function singular(w) {
  if (w.length <= 3 || WORD_CATEGORY[w]) return w;   // "greens", "molasses" stay as-is
  if (/us$/.test(w)) return w;                          // asparagus, hummus, couscous
  if (/(lea|hal|loa)ves$/.test(w)) return w.slice(0, -3) + 'f';  // bay leaves -> bay leaf
  if (/ies$/.test(w)) return w.slice(0, -3) + 'y';
  if (/(oes|ches|shes|sses|xes)$/.test(w)) return w.slice(0, -2);
  if (/s$/.test(w) && !/ss$/.test(w)) return w.slice(0, -1);
  return w;
}

export function categorizeGroceryItem(name) {
  var raw = String(name || '').toLowerCase()
    .replace(/\([^)]*\)/g, ' ')        // drop "(diced)" notes
    .split(',')[0]                      // "garlic cloves, minced" -> "garlic cloves"
    .replace(/[^a-z\u00e0-\u00ff\s-]/g, ' ');
  var words = raw.split(/\s+/).filter(Boolean).map(singular);
  var text = ' ' + words.join(' ') + ' ';

  // 1. Known phrases, longest first so "cream cheese" beats "cream"
  var best = null;
  for (var i = 0; i < PHRASES.length; i++) {
    var phrase = PHRASES[i][0].split(' ').map(singular).join(' ');
    if (text.indexOf(' ' + phrase + ' ') !== -1 && (!best || phrase.length > best[0].length)) best = [phrase, PHRASES[i][1]];
  }
  if (best) return best[1];

  // 2. The last meaningful word is what the food is
  var core = words.join(' ').replace(FILLER, ' ').split(/\s+/).filter(Boolean);
  for (var j = core.length - 1; j >= 0; j--) {
    if (WORD_CATEGORY[core[j]]) return WORD_CATEGORY[core[j]];
  }
  return 'Other';
}
