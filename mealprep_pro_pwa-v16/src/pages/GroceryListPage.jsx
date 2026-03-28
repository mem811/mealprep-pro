import { useState, useEffect, useMemo } from 'react';
import pb from '../lib/pb';

var CATEGORY_MAP = {
  'Produce': ['lettuce','tomato','onion','garlic','pepper','carrot','celery','potato','broccoli','spinach','kale','cucumber','avocado','lemon','lime','ginger','cilantro','parsley','basil','thyme','rosemary','mint','dill','scallion','shallot','mushroom','zucchini','squash','corn','pea','bean','cabbage','beet','radish','turnip','leek','chive','jalapeño','serrano','poblano','bell pepper','green bean','asparagus','artichoke','eggplant','cauliflower','sweet potato','fruit','apple','banana','berry','blueberry','strawberry','raspberry','orange','grape','mango','pineapple','peach','pear','melon','watermelon','cherry','plum','fig','date','cranberry','pomegranate','kiwi','papaya','coconut','apricot','nectarine','arugula','romaine','watercress','endive','fennel','chard','collard','okra','plantain','yam','jicama','celeriac','kohlrabi','parsnip','rutabaga','sprout','microgreen','snap pea','snow pea','edamame','lemongrass','tamarind','turmeric root','horseradish'],
  'Protein': ['chicken','beef','pork','turkey','salmon','shrimp','tuna','cod','tilapia','lamb','bacon','sausage','ham','steak','ground','tofu','tempeh','seitan','egg','fish','crab','lobster','scallop','mussel','clam','oyster','anchovy','sardine','duck','veal','bison','venison','prosciutto','pancetta','chorizo','pepperoni','salami','hot dog','meatball','jerky'],
  'Dairy': ['milk','cheese','yogurt','cream','butter','sour cream','cream cheese','cottage cheese','ricotta','mozzarella','parmesan','cheddar','gouda','brie','feta','goat cheese','mascarpone','whipping cream','half and half','ghee','kefir','queso','gruyere','provolone','swiss','colby','jack cheese','american cheese','velveeta','whey','custard'],
  'Baking': ['flour','sugar','baking soda','baking powder','vanilla','cocoa','chocolate','yeast','cornstarch','powdered sugar','brown sugar','maple syrup','honey','molasses','agave','corn syrup','gelatin','food coloring','sprinkles','frosting','cake mix','brownie mix','pie crust','puff pastry','phyllo','shortening','lard','almond extract','peppermint extract','cream of tartar','meringue powder','fondant','confectioners'],
  'Spices': ['salt','pepper','cumin','paprika','oregano','cinnamon','chili','cayenne','nutmeg','clove','coriander','turmeric','curry','bay leaf','red pepper flake','garlic powder','onion powder','smoked paprika','allspice','cardamom','fennel seed','mustard seed','celery seed','dill weed','sage','tarragon','marjoram','saffron','sumac','za\'atar','five spice','garam masala','herbes de provence','italian seasoning','old bay','everything bagel','ranch seasoning','taco seasoning','blackening seasoning','cajun','creole','sesame seed','poppy seed','caraway','anise','star anise','white pepper','szechuan','chipotle','adobo'],
  'Pantry': ['rice','pasta','bread','oil','vinegar','soy sauce','broth','stock','tomato sauce','tomato paste','can','bean','lentil','chickpea','oat','cereal','granola','nut','peanut butter','almond butter','jam','jelly','mustard','ketchup','mayo','hot sauce','worcestershire','sriracha','hoisin','teriyaki','bbq sauce','salsa','tortilla','wrap','pita','naan','cracker','chip','pretzel','popcorn','breadcrumb','panko','crouton','noodle','ramen','couscous','quinoa','barley','farro','bulgur','polenta','grits','cornmeal','taco shell','dried fruit','raisin','coconut milk','coconut cream','condensed milk','evaporated milk','powdered milk','bouillon','miso','tahini','hummus','olive','pickle','caper','sun-dried tomato','artichoke heart','roasted pepper','anchovy paste','fish sauce','oyster sauce','chili paste','sambal','gochujang','harissa','pesto','marinara','alfredo','curry paste']
};

var CATEGORY_ORDER = ['Produce','Protein','Dairy','Baking','Spices','Pantry','Other'];
var CATEGORY_ICONS = {
  'Produce': '🥬',
  'Protein': '🥩',
  'Dairy': '🥛',
  'Baking': '🧁',
  'Spices': '🧂',
  'Pantry': '🫙',
  'Other': '📦'
};

function categorizeItem(name) {
  var lower = (name || '').toLowerCase();
  for (var cat of Object.keys(CATEGORY_MAP)) {
    for (var keyword of CATEGORY_MAP[cat]) {
      if (lower.includes(keyword)) return cat;
    }
  }
  return 'Other';
}

function getWeekRange() {
  var now = new Date();
  var day = now.getDay();
  var diff = day === 0 ? -6 : 1 - day;
  var monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  var sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  var weekStart = monday.toISOString().split('T')[0];
  var weekEnd = sunday.toISOString().split('T')[0];
  return { weekStart: weekStart, weekEnd: weekEnd };
}

export default function GroceryListPage() {
  var [groceryGroups, setGroceryGroups] = useState([]);
  var [checkedItems, setCheckedItems] = useState({});
  var [loading, setLoading] = useState(true);
  var [collapsedCats, setCollapsedCats] = useState({});

  var weekRange = useMemo(function() { return getWeekRange(); }, []);
  var weekStart = weekRange.weekStart;
  var weekEnd = weekRange.weekEnd;

  async function fetchGrocery() {
    try {
      setLoading(true);
      var userId = pb.authStore.model?.id;
      if (!userId) return;

      var res = await pb.collection('meal_slots').getList(1, 200, {
        filter: 'meal_plan.user = "' + userId + '" && date >= "' + weekStart + '" && date <= "' + weekEnd + '"',
        expand: 'recipe'
      });

      var itemMap = new Map();
      for (var slot of res.items) {
        var recipe = slot.expand?.recipe;
        if (!recipe) continue;
        var multiplier = slot.servings_multiplier || 1;
        var ingList = [];
        if (typeof recipe.ingredients === 'string') {
          try { ingList = JSON.parse(recipe.ingredients); } catch (err) { ingList = []; }
        } else if (Array.isArray(recipe.ingredients)) {
          ingList = recipe.ingredients;
        }
        for (var ing of ingList) {
          if (!ing.name?.trim()) continue;
          var ingKey = ing.name.toLowerCase().trim();
          var qty = (parseFloat(ing.quantity) || 0) * multiplier;
          if (itemMap.has(ingKey)) {
            itemMap.get(ingKey).qty += qty;
          } else {
            itemMap.set(ingKey, {
              name: ing.name.trim(),
              qty: qty,
              unit: ing.unit || '',
              category: categorizeItem(ing.name)
            });
          }
        }
      }

      // Load saved grocery checks
      try {
        var checksRes = await pb.collection('grocery_checks').getList(1, 200, {
          filter: 'user = "' + userId + '" && week_start = "' + weekStart + '"'
        });
        var savedChecks = {};
        for (var c of checksRes.items) {
          savedChecks[c.item_key] = c.checked;
        }
        setCheckedItems(savedChecks);
      } catch (err) {
        console.log('No saved checks found');
      }

      // Group by category
      var allItems = Array.from(itemMap.values());
      var grouped = {};
      for (var item of allItems) {
        if (!grouped[item.category]) grouped[item.category] = [];
        grouped[item.category].push(item);
      }
      var sorted = [];
      for (var cat of CATEGORY_ORDER) {
        if (grouped[cat]) {
          grouped[cat].sort(function(a, b) { return a.name.localeCompare(b.name); });
          sorted.push({ category: cat, icon: CATEGORY_ICONS[cat], items: grouped[cat] });
        }
      }
      setGroceryGroups(sorted);
    } catch (err) {
      console.error('Grocery fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(function() {
    fetchGrocery();
  }, [weekStart, weekEnd]);

  async function toggleCheck(itemKey) {
    var next = !checkedItems[itemKey];
    setCheckedItems(function(prev) {
      var copy = Object.assign({}, prev);
      copy[itemKey] = next;
      return copy;
    });
    try {
      var userId = pb.authStore.model?.id;
      var existing = await pb.collection('grocery_checks').getList(1, 1, {
        filter: 'user = "' + userId + '" && week_start = "' + weekStart + '" && item_key = "' + itemKey + '"'
      });
      if (existing.items.length > 0) {
        await pb.collection('grocery_checks').update(existing.items[0].id, { checked: next });
      } else {
        await pb.collection('grocery_checks').create({
          user: userId,
          week_start: weekStart,
          item_key: itemKey,
          checked: next
        });
      }
    } catch (err) {
      console.log('Error saving check: ' + err);
    }
  }

  function toggleCategory(cat) {
    setCollapsedCats(function(prev) {
      var copy = Object.assign({}, prev);
      copy[cat] = !prev[cat];
      return copy;
    });
  }

  var totalItems = 0;
  var totalChecked = 0;
  for (var g of groceryGroups) {
    for (var item of g.items) {
      totalItems++;
      var ck = item.name.toLowerCase().trim();
      if (checkedItems[ck]) totalChecked++;
    }
  }
  var pct = totalItems > 0 ? Math.round((totalChecked / totalItems) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-gray-800">Grocery List</h1>
        <button
          onClick={fetchGrocery}
          className="flex items-center gap-1 px-3 py-1.5 text-sm border border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition"
        >
          🔄 Refresh
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-6">From this week's meal plan</p>

      {/* Progress bar */}
      <div className="border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600">{totalChecked + ' of ' + totalItems + ' items checked'}</span>
          <span className="text-green-600 font-medium">{pct + '%'}</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all"
            style= width: pct + '%' 
          ></div>
        </div>
      </div>

      {groceryGroups.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg mb-1">No items yet</p>
          <p className="text-sm">Add meals to your planner to generate a grocery list</p>
        </div>
      )}

      {/* Category groups */}
      {groceryGroups.map(function(group) {
        var isCollapsed = collapsedCats[group.category];
        return (
          <div key={group.category} className="border border-gray-200 rounded-lg mb-4 overflow-hidden">
            <div
              className="flex items-center justify-between px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition"
              onClick={function() { toggleCategory(group.category); }}
            >
              <span className="font-bold text-gray-700">{group.icon + ' ' + group.category}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-green-600">{group.items.length + ' items'}</span>
                <span className="text-gray-400">{isCollapsed ? '▸' : '▾'}</span>
              </div>
            </div>
            {!isCollapsed && (
              <ul className="divide-y divide-gray-100">
                {group.items.map(function(item, i) {
                  var checkKey = item.name.toLowerCase().trim();
                  var isChecked = !!checkedItems[checkKey];
                  return (
                    <li
                      key={i}
                      className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={function() { toggleCheck(checkKey); }}
                    >
                      <div className={'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ' + (isChecked ? 'bg-green-500 border-green-500' : 'border-gray-300')}>
                        {isChecked && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className={'flex-1 text-sm transition-colors ' + (isChecked ? 'line-through text-gray-300' : 'text-gray-700')}>
                        {item.name}
                      </span>
                      {item.qty > 0 && (
                        <span className={'text-xs flex-shrink-0 ' + (isChecked ? 'text-gray-300' : 'text-gray-500')}>
                          {parseFloat(item.qty.toFixed(1))} {item.unit}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
