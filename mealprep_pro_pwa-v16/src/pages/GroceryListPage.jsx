import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Printer } from 'lucide-react';
import pb from '../lib/pb';
import { addGroceryIngredient, finalizeGroceryItems, categorizeGroceryItem } from '../lib/groceryMerge';

var CATEGORY_ICONS = {
  'Produce': '🥬',
  'Protein': '🥩',
  'Dairy': '🥛',
  'Baking': '🧁',
  'Spices': '🧂',
  'Pantry': '🫙',
  'Other': '📦'
};

var CATEGORY_ORDER = ['Produce', 'Protein', 'Dairy', 'Baking', 'Spices', 'Pantry', 'Other'];


function getWeekDays(baseDate) {
  var day = baseDate.getDay();
  var monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() - ((day + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, function(_, i) {
    var d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function fmt(d) {
  return d.toISOString().split('T')[0];
}

// "2026-09-28" -> that date at local midnight (a bare date string would be
// read as UTC midnight, which is the previous evening in US time zones)
function parseWeekParam(value) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  if (!m) return null;
  var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? null : d;
}

function shortDate(d) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function GroceryListPage() {
  var [groceryGroups, setGroceryGroups] = useState([]);
  var [checkedItems, setCheckedItems] = useState({});
  var [loading, setLoading] = useState(true);
  var [collapsedCats, setCollapsedCats] = useState({});

  // Which week to show: ?week=YYYY-MM-DD (sent by the planner's "See all"),
  // otherwise the current week. Kept in the address so a refresh stays put.
  var [searchParams, setSearchParams] = useSearchParams();
  var weekParam = searchParams.get('week') || '';
  var weekDays = useMemo(function() {
    return getWeekDays(parseWeekParam(weekParam) || new Date());
  }, [weekParam]);
  var weekStart = fmt(weekDays[0]);
  var weekEnd = fmt(weekDays[6]);

  var thisWeekStart = fmt(getWeekDays(new Date())[0]);
  var weekOffset = Math.round((weekDays[0] - getWeekDays(new Date())[0]) / (7 * 24 * 60 * 60 * 1000));
  var weekName = weekOffset === 0 ? 'This week' : weekOffset === 1 ? 'Next week' : weekOffset === -1 ? 'Last week' : null;
  var weekRange = shortDate(weekDays[0]) + ' – ' + shortDate(weekDays[6]);

  function shiftWeek(n) {
    var d = new Date(weekDays[0]);
    d.setDate(d.getDate() + 7 * n);
    var target = fmt(d);
    setSearchParams(target === thisWeekStart ? {} : { week: target });
  }

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
          addGroceryIngredient(itemMap, ing, multiplier, categorizeGroceryItem);
        }
      }

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

      var allItems = finalizeGroceryItems(itemMap);
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
    for (var itm of g.items) {
      totalItems++;
      if (checkedItems[itm.name.toLowerCase().trim()]) totalChecked++;
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
      <div className="print:hidden">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-gray-800">Grocery List</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={function() { window.print(); }}
            disabled={groceryGroups.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Printer size={15} /> Print
          </button>
          <button
            onClick={fetchGrocery}
            className="flex items-center gap-1 px-3 py-1.5 text-sm border border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition"
          >
            {'\u{1F504}'} Refresh
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 mt-3 mb-6">
        <button
          onClick={function() { shiftWeek(-1); }}
          aria-label="Previous week"
          className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-800">{weekName || weekRange}</p>
          {weekName && <p className="text-xs text-gray-500">{weekRange}</p>}
          {weekOffset !== 0 && (
            <button
              onClick={function() { setSearchParams({}); }}
              className="text-xs text-green-600 font-medium hover:underline mt-0.5"
            >
              Back to this week
            </button>
          )}
        </div>
        <button
          onClick={function() { shiftWeek(1); }}
          aria-label="Next week"
          className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600">{totalChecked + ' of ' + totalItems + ' items checked'}</span>
          <span className="text-green-600 font-medium">{pct + '%'}</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
        <div
          className="bg-green-500 h-2 rounded-full transition-all"
          style={ { width: pct + '%' } }
        ></div>
        </div>
      </div>

      {groceryGroups.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg mb-1">No items yet</p>
          <p className="text-sm">Add meals to your planner to generate a grocery list</p>
        </div>
      )}

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
                <span className="text-gray-400">{isCollapsed ? '\u25B8' : '\u25BE'}</span>
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
                      {item.amount && (
                        <span className={'text-xs flex-shrink-0 ' + (isChecked ? 'text-gray-300' : 'text-gray-500')}>
                          {item.amount}
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

      {/* ── Printed shopping list (only visible when printing) ── */}
      <style>{`
        @media print {
          @page { margin: 0.5in; }
          /* Drop the app's full-screen heights so nothing spills onto a blank page */
          html, body, #root, #root * { min-height: 0 !important; height: auto !important; }
          #grocery-print .gp-box { width: 11px !important; height: 11px !important; }
          body * { visibility: hidden !important; }
          #grocery-print, #grocery-print * { visibility: visible !important; }
          #grocery-print { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
      {(function() {
        // Print what's still needed; if everything is checked, print it all
        var anyLeft = groceryGroups.some(function(g) {
          return g.items.some(function(it) { return !checkedItems[it.name.toLowerCase().trim()]; });
        });
        var skipped = 0;
        var printGroups = groceryGroups.map(function(g) {
          var items = g.items.filter(function(it) {
            var done = !!checkedItems[it.name.toLowerCase().trim()];
            if (done && anyLeft) { skipped++; return false; }
            return true;
          });
          return { category: g.category, icon: g.icon, items: items };
        }).filter(function(g) { return g.items.length > 0; });
        var count = printGroups.reduce(function(n, g) { return n + g.items.length; }, 0);

        return (
          <div id="grocery-print" className="hidden print:block text-black" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
            <div style={{ borderBottom: '2px solid #000', paddingBottom: '6px', marginBottom: '14px' }}>
              <div style={{ fontSize: '22px', fontWeight: 700 }}>Grocery List</div>
              <div style={{ fontSize: '12px', marginTop: '2px' }}>
                {(weekName ? weekName + ' · ' : '') + weekRange + ' · ' + count + ' item' + (count === 1 ? '' : 's')}
                {skipped > 0 && ' · ' + skipped + ' already checked off, not shown'}
              </div>
            </div>
            <div style={{ columnCount: 2, columnGap: '28px' }}>
              {printGroups.map(function(g) {
                return (
                  <div key={g.category} style={{ breakInside: 'avoid', marginBottom: '14px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid #999', paddingBottom: '2px', marginBottom: '4px' }}>
                      {g.category}
                    </div>
                    {g.items.map(function(it, i) {
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: '8px', fontSize: '13px', padding: '3px 0' }}>
                          <span className="gp-box" style={{ display: 'inline-block', width: '11px', height: '11px', border: '1.5px solid #000', flexShrink: 0, position: 'relative', top: '1px' }}></span>
                          <span style={{ flex: 1 }}>{it.name}</span>
                          {it.amount && (
                            <span style={{ fontSize: '11px', color: '#444', whiteSpace: 'nowrap' }}>
                              {it.amount}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: '18px', fontSize: '10px', color: '#666', textAlign: 'center' }}>MealPrep Pro</div>
          </div>
        );
      })()}
</div>
  );
}
