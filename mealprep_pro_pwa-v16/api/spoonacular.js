import { currentUser } from './_pbAdmin.js';

// Calls Spoonacular from the server so the API key never reaches the browser.
// Only signed-in users can use it, and only these two lookups are allowed.
const ALLOWED = {
  extract: (q) => `https://api.spoonacular.com/recipes/extract?url=${encodeURIComponent(q.url || '')}&addRecipeNutrition=true`,
  guessNutrition: (q) => `https://api.spoonacular.com/recipes/guessNutrition?title=${encodeURIComponent(q.title || '')}`,
};

export default async function handler(req, res) {
  const build = ALLOWED[req.query.action];
  if (!build) return res.status(400).json({ error: 'Unknown action' });

  const user = await currentUser(req);
  if (!user) return res.status(401).json({ error: 'Not signed in' });

  const key = process.env.SPOONACULAR_API_KEY || process.env.VITE_SPOONACULAR_API_KEY;
  if (!key) return res.status(500).json({ error: 'Nutrition service not configured' });

  try {
    const upstream = await fetch(`${build(req.query)}&apiKey=${key}`);
    const body = await upstream.text();
    res.status(upstream.status).setHeader('Content-Type', 'application/json');
    return res.send(body);
  } catch (err) {
    console.error('Spoonacular request failed:', err);
    return res.status(502).json({ error: 'Nutrition service unavailable' });
  }
}
