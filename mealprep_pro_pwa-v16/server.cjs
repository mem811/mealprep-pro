/* eslint-env node */
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.post('/api/scrape-recipe', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
    const cheerio = require('cheerio');

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MealPrepBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      timeout: 15000,
    });

    if (!response.ok) {
      return res.status(400).json({ error: `Failed to fetch URL: ${response.statusText}` });
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    let recipeData = null;

    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).html());
        const findRecipe = (obj) => {
          if (!obj) return null;
          if (Array.isArray(obj)) {
            for (const item of obj) {
              const found = findRecipe(item);
              if (found) return found;
            }
          }
          if (obj['@type'] === 'Recipe') return obj;
          if (obj['@graph']) return findRecipe(obj['@graph']);
          return null;
        };
        const found = findRecipe(json);
        if (found && !recipeData) recipeData = found;
      } catch {
        // skip invalid JSON
      }
    });

    if (!recipeData) {
      return res.status(404).json({ error: 'No Recipe schema found on this page.' });
    }

    const rawIngredients = recipeData.recipeIngredient || [];
    const ingredients = rawIngredients.map((line) => {
      const str = typeof line === 'string' ? line.trim() : String(line).trim();
      const match = str.match(/^([\d./\s¼½¾⅓⅔⅛⅜⅝⅞]+)\s*([a-zA-Z]+(?:\s+[a-zA-Z]+)?\.?)?\s+(.+)$/);
      if (match) {
        return {
          quantity: match[1].trim(),
          unit: match[2] ? match[2].trim() : '',
          name: match[3].trim(),
        };
      }
      return { quantity: '', unit: '', name: str };
    });

    const rawInstructions = recipeData.recipeInstructions || [];
    let instructions = '';
    if (typeof rawInstructions === 'string') {
      instructions = rawInstructions;
    } else if (Array.isArray(rawInstructions)) {
      instructions = rawInstructions
        .map((step, i) => {
          if (typeof step === 'string') return `${i + 1}. ${step}`;
          if (step['@type'] === 'HowToStep') return `${i + 1}. ${step.text || step.name || ''}`;
          return '';
        })
        .filter(Boolean)
        .join('\n');
    }

    let servings = 4;
    const yieldRaw = recipeData.recipeYield;
    if (yieldRaw) {
      const yieldStr = Array.isArray(yieldRaw) ? yieldRaw[0] : yieldRaw;
      const match = String(yieldStr).match(/\d+/);
      if (match) servings = parseInt(match[0]);
    }

    let imageUrl = '';
    const imgRaw = recipeData.image;
    if (imgRaw) {
      if (typeof imgRaw === 'string') imageUrl = imgRaw;
      else if (Array.isArray(imgRaw)) imageUrl = typeof imgRaw[0] === 'string' ? imgRaw[0] : imgRaw[0]?.url || '';
    }

    const keywords = recipeData.keywords || '';
    const tags = typeof keywords === 'string'
      ? keywords.split(',').map(t => t.trim()).filter(Boolean)
      : Array.isArray(keywords) ? keywords : [];

    res.json({
      title: recipeData.name || '',
      description: recipeData.description || '',
      servings,
      ingredients,
      instructions,
      image_url: imageUrl,
      source_url: url,
      tags,
    });

  } catch {
    res.status(500).json({ error: 'Failed to scrape recipe' });
  }
});

app.listen(PORT, () => {
  console.log(`Recipe scraper API running on port ${PORT}`);
});