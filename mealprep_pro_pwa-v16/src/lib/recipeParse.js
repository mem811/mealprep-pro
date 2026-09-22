// ─────────────────────────────────────────────────────────────
// Recipe parsing shared by the paste box and the browser button.
// Units map onto the live app's UNITS list in RecipeFormPage.
// ─────────────────────────────────────────────────────────────

const UNIT_ALIASES = {
  cup: 'cup', cups: 'cup', c: 'cup',
  tablespoon: 'tbsp', tablespoons: 'tbsp', tbsp: 'tbsp', tbsps: 'tbsp', tbs: 'tbsp', tbl: 'tbsp', T: 'tbsp',
  teaspoon: 'tsp', teaspoons: 'tsp', tsp: 'tsp', tsps: 'tsp', t: 'tsp',
  ounce: 'oz', ounces: 'oz', oz: 'oz',
  pound: 'lb', pounds: 'lb', lb: 'lb', lbs: 'lb',
  gram: 'g', grams: 'g', g: 'g',
  kilogram: 'kg', kilograms: 'kg', kg: 'kg',
  milliliter: 'ml', milliliters: 'ml', millilitre: 'ml', millilitres: 'ml', ml: 'ml',
  liter: 'l', liters: 'l', litre: 'l', litres: 'l', l: 'l',
  piece: 'piece', pieces: 'piece', pcs: 'piece', pc: 'piece',
  slice: 'slice', slices: 'slice',
  clove: 'clove', cloves: 'clove',
  bunch: 'bunch', bunches: 'bunch',
  can: 'can', cans: 'can',
  package: 'package', packages: 'package', pkg: 'package', packet: 'package', packets: 'package',
  pinch: 'pinch', pinches: 'pinch',
};

const VALID_UNITS = new Set([
  'cup', 'tbsp', 'tsp', 'oz', 'lb', 'g', 'kg', 'ml', 'l', 'piece', 'slice',
  'clove', 'bunch', 'can', 'package', 'pinch', 'to taste',
]);

const DEFAULT_UNIT = 'piece';

const VULGAR = {
  '½': '1/2', '⅓': '1/3', '⅔': '2/3', '¼': '1/4', '¾': '3/4',
  '⅕': '1/5', '⅖': '2/5', '⅗': '3/5', '⅘': '4/5',
  '⅙': '1/6', '⅚': '5/6', '⅛': '1/8', '⅜': '3/8', '⅝': '5/8', '⅞': '7/8',
};

/** Map any unit string (from the n8n importer, Spoonacular, or a parse) onto the app's list. */
export function normalizeUnit(unit) {
  if (!unit) return DEFAULT_UNIT;
  const u = String(unit).trim();
  if (VALID_UNITS.has(u)) return u;
  return UNIT_ALIASES[u] || UNIT_ALIASES[u.toLowerCase()] || DEFAULT_UNIT;
}

/** Decode HTML entities and strip tags using the browser's own parser. */
export function decodeHtml(s) {
  if (s === undefined || s === null) return '';
  const str = String(s);
  if (!/[<&]/.test(str)) return str.trim();
  const doc = new DOMParser().parseFromString(str, 'text/html');
  return (doc.documentElement.textContent || '').replace(/\s+/g, ' ').trim();
}

function normalizeFractions(s) {
  let out = s;
  for (const [glyph, ascii] of Object.entries(VULGAR)) {
    out = out.replace(new RegExp(`(\\d)\\s*${glyph}`, 'g'), `$1 ${ascii}`);
    out = out.replace(new RegExp(glyph, 'g'), ascii);
  }
  return out;
}

function toNumberString(token) {
  const t = token.trim();
  const mixed = t.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return String(Math.round((Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3])) * 100) / 100);
  const frac = t.match(/^(\d+)\/(\d+)$/);
  if (frac) return String(Math.round((Number(frac[1]) / Number(frac[2])) * 100) / 100);
  if (/^\d*\.?\d+$/.test(t)) return String(Number(t));
  return t;
}

// Leading bullets and checkbox glyphs recipe cards put in front of lines
const BULLET_RE = /^\s*(?:[-*•·▢☐□◻✓✔]|\[\s?[xX]?\s?\])+\s*/;

function stripBullets(line) {
  let out = line;
  // Repeat so "- [ ] ▢ 1 cup" loses every layer
  for (let i = 0; i < 4; i++) {
    const next = out.replace(BULLET_RE, '');
    if (next === out) break;
    out = next;
  }
  return out.trim();
}

const QTY = String.raw`(?:\d+\s+\d+\/\d+|\d+\/\d+|\d*\.?\d+)`;
const QTY_RE = new RegExp(`^(${QTY}(?:\\s*(?:-|–|to)\\s*${QTY})?)\\s*(.*)$`, 'i');

/** "1 1/2 cups flour, sifted" -> { name: 'flour, sifted', quantity: '1.5', unit: 'cup' } */
export function parseIngredientLine(raw) {
  let line = stripBullets(normalizeFractions(decodeHtml(raw)));
  if (!line) return null;

  let quantity = '';
  let rest = line;

  const q = line.match(QTY_RE);
  if (q) {
    const range = q[1].split(/\s*(?:-|–|to)\s*/i);
    quantity = range.length === 2
      ? `${toNumberString(range[0])}-${toNumberString(range[1])}`
      : toNumberString(q[1]);
    rest = q[2];
  }

  // "1 (15 oz) can black beans" — drop the parenthetical size note
  rest = rest.replace(/^\([^)]*\)\s*/, '');

  let unit = DEFAULT_UNIT;
  const u = rest.match(/^([A-Za-z]+)\.?\s+(.*)$/);
  if (u) {
    const mapped = UNIT_ALIASES[u[1]] || UNIT_ALIASES[u[1].toLowerCase()];
    // Single-letter aliases (c, t, g, l) only count after a number,
    // otherwise "l" in "large" style edge cases would misfire
    if (mapped && (u[1].length > 1 || quantity)) {
      unit = mapped;
      rest = u[2];
    }
  }

  // "Salt and pepper to taste"
  if (!quantity && /\bto taste\b/i.test(rest)) {
    unit = 'to taste';
    rest = rest.replace(/,?\s*to taste\b/i, '');
  }

  const name = rest.replace(/\s+/g, ' ').trim();
  if (!name) return null;
  return { name, quantity, unit };
}

/** ISO-8601 duration ("PT1H15M") or loose text ("35 minutes") -> minutes as a string */
export function parseDuration(value) {
  if (!value) return '';
  const s = String(value);
  const iso = s.match(/^P(?:T)?(?:(\d+)H)?(?:(\d+)M)?/i);
  if (iso && (iso[1] || iso[2])) {
    return String(Number(iso[1] || 0) * 60 + Number(iso[2] || 0));
  }
  const hrs = s.match(/(\d+)\s*(?:h|hr|hrs|hour|hours)\b/i);
  const mins = s.match(/(\d+)\s*(?:m|min|mins|minute|minutes)\b/i);
  if (hrs || mins) return String(Number(hrs?.[1] || 0) * 60 + Number(mins?.[1] || 0));
  return '';
}

function parseServings(value) {
  if (value === undefined || value === null || value === '') return null;
  const v = Array.isArray(value) ? value[0] : value;
  if (typeof v === 'number') return v;
  const m = String(v).match(/\d+/);
  return m ? Number(m[0]) : null;
}

// ── Pasted text ──────────────────────────────────────────────

// WP Recipe Maker puts its scaling widget in the heading, so copies come
// through as "Ingredients 1x2x3x" or "Ingredients 1x 2x 3x"
const SCALE_JUNK = String.raw`(?:\s*\d+(?:\.\d+)?x)*`;
const INGREDIENT_HEADER = new RegExp(
  `^(?:ingredients?|what you(?:'|’)ll need|you(?:'|’)ll need)\\s*:?${SCALE_JUNK}\\s*$`, 'i'
);
const SCALE_ONLY = new RegExp(`^${SCALE_JUNK}\\s*$`, 'i');
const STEP_HEADER = /^(?:instructions?|directions?|method|steps|preparation|how to make(?: it)?)\s*:?\s*$/i;
const STOP_HEADER = /^(?:notes?|nutrition(?: facts| information)?|tips?|storage|equipment)\s*:?\s*$/i;
const STEP_PREFIX = /^(?:step\s*\d+\s*[:.)-]?|\d+\s*[.)]\s+)/i;

function looksLikeIngredient(line) {
  // "1. Brown the beef" is a numbered step, not "1 of something" —
  // the space after the period is what separates it from "1.5 cups"
  if (STEP_PREFIX.test(line)) return false;
  return line.length <= 90 && (QTY_RE.test(line) || /\bto taste\b/i.test(line));
}

function looksLikeStep(line) {
  return STEP_PREFIX.test(line) || line.length > 70 || /[.!]$/.test(line);
}

/**
 * Turn a pasted recipe into form fields.
 * Uses Ingredients / Instructions headers when present, and falls back to
 * per-line guessing when someone pastes a list with no headings.
 */
export function parseRecipeText(text) {
  const lines = String(text || '')
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => stripBullets(l.trim()))
    .filter(Boolean);

  const result = {
    title: '',
    servings: null,
    prep_time: '',
    cook_time: '',
    ingredients: [],
    instructions: '',
  };
  if (lines.length === 0) return result;

  const steps = [];
  let section = null; // null | 'ingredients' | 'steps' | 'stop'
  const hasHeaders = lines.some((l) => INGREDIENT_HEADER.test(l) || STEP_HEADER.test(l));

  for (const line of lines) {
    if (SCALE_ONLY.test(line)) continue;
    if (INGREDIENT_HEADER.test(line)) { section = 'ingredients'; continue; }
    if (STEP_HEADER.test(line)) { section = 'steps'; continue; }
    if (STOP_HEADER.test(line)) { section = 'stop'; continue; }

    // Metadata lines can appear anywhere above the lists
    const servingsMatch = line.match(/^(?:servings?|serves|yield|makes)\s*:?\s*(\d+)/i);
    if (servingsMatch && section !== 'steps') { result.servings = Number(servingsMatch[1]); continue; }
    const prepMatch = line.match(/^prep(?:\s*time)?\s*:?\s*(.+)$/i);
    if (prepMatch && section !== 'steps') { result.prep_time = parseDuration(prepMatch[1]); continue; }
    const cookMatch = line.match(/^cook(?:\s*time)?\s*:?\s*(.+)$/i);
    if (cookMatch && section !== 'steps') { result.cook_time = parseDuration(cookMatch[1]); continue; }
    if (/^total(?:\s*time)?\s*:/i.test(line)) continue;

    if (section === 'stop') continue;

    if (hasHeaders) {
      if (section === 'ingredients') {
        const ing = parseIngredientLine(line);
        if (ing) result.ingredients.push(ing);
      } else if (section === 'steps') {
        steps.push(line.replace(STEP_PREFIX, '').trim());
      } else if (!result.title) {
        result.title = line;
      }
      continue;
    }

    // No headers: first non-list line is the title, then guess line by line
    if (!result.title && !looksLikeIngredient(line) && result.ingredients.length === 0 && steps.length === 0) {
      result.title = line;
    } else if (STEP_PREFIX.test(line)) {
      steps.push(line.replace(STEP_PREFIX, '').trim());
    } else if (looksLikeIngredient(line) && steps.length === 0) {
      const ing = parseIngredientLine(line);
      if (ing) result.ingredients.push(ing);
    } else if (looksLikeStep(line)) {
      steps.push(line.replace(STEP_PREFIX, '').trim());
    } else if (steps.length === 0) {
      // Short line with no number, before any steps — "butter", "fresh basil"
      const ing = parseIngredientLine(line);
      if (ing) result.ingredients.push(ing);
    } else {
      steps.push(line);
    }
  }

  result.instructions = steps.filter(Boolean).join('\n');
  return result;
}

// ── Browser-button payload ───────────────────────────────────

/**
 * The browser button sends a compact payload:
 *   u  page URL        n  name          y  recipeYield
 *   i  ingredient strs s  step strings  m  image URL
 *   pt prepTime        ct cookTime      t  highlighted text (fallback)
 */
export function parseBookmarkletPayload(p) {
  if (!p || typeof p !== 'object') return null;

  // Fallback path: no structured data on the page, user highlighted text
  if (p.t) {
    const parsed = parseRecipeText(p.t);
    return {
      ...parsed,
      title: parsed.title || decodeHtml(p.n),
      image_url: '',
      source_url: p.u || '',
    };
  }

  return {
    title: decodeHtml(p.n),
    servings: parseServings(p.y),
    prep_time: parseDuration(p.pt),
    cook_time: parseDuration(p.ct),
    ingredients: (Array.isArray(p.i) ? p.i : []).map(parseIngredientLine).filter(Boolean),
    instructions: (Array.isArray(p.s) ? p.s : [])
      .map((step) => decodeHtml(step))
      .filter(Boolean)
      .join('\n'),
    image_url: typeof p.m === 'string' ? p.m : '',
    source_url: p.u || '',
  };
}
