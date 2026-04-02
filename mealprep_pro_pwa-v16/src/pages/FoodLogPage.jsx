import { useEffect, useMemo, useState, useCallback } from "react";
import pb from "../lib/pb";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { listFoodLogsByDate, deleteFoodLogEntry, updateFoodLogEntry } from "../lib/foodLog";
import { lookupFoodLibrary, saveFoodLibrary } from "../lib/foodLibrary";
import { getUserGoals } from "../lib/userGoals";

function toDateOnlyUTC(date = new Date()) {
  return date.toISOString().slice(0, 10);
}
function addDaysUTC(dateStr, deltaDays) {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}
function mealPillClass(mealType) {
  const t = (mealType || "").toLowerCase();
  if (t.includes("breakfast")) return "bg-amber-50 text-amber-700 border-amber-200";
  if (t.includes("lunch")) return "bg-green-50 text-green-700 border-green-200";
  if (t.includes("dinner")) return "bg-blue-50 text-blue-700 border-blue-200";
  if (t.includes("snack")) return "bg-purple-50 text-purple-700 border-purple-200";
  return "bg-gray-50 text-gray-700 border-gray-200";
}
function n0(v) { const num = Number(v); return Number.isFinite(num) ? num : 0; }
function round0(v) { return Math.round(n0(v)); }
function offKcalPer100g(product) { return n0(product?.nutriments?.["energy-kcal_100g"]); }
function offMacroPer100g(product, key) { return n0(product?.nutriments?.[`${key}_100g`]); }
function scalePer100g(per100g, grams) { return (n0(per100g) * n0(grams)) / 100; }

async function lookupOpenFoodFacts(barcode) {
  const clean = String(barcode || "").replace(/\D/g, "");
  if (!clean) throw new Error("Please enter a barcode.");
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${clean}`);
  if (!res.ok) throw new Error(`Lookup failed (${res.status})`);
  const data = await res.json();
  if (data?.status !== 1) throw new Error("Not found in Open Food Facts.");
  return { barcode: clean, product: data.product };
}

export default function FoodLogPage() {
  const [dateStr, setDateStr] = useState(toDateOnlyUTC());
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [editing, setEditing] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanError, setScanError] = useState("");
  const [addFood, setAddFood] = useState(null);
  const [savingNew, setSavingNew] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryItems, setLibraryItems] = useState([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [librarySearch, setLibrarySearch] = useState("");
  const [manualOpen, setManualOpen] = useState(false);
  const [manualFood, setManualFood] = useState({ name: "", meal_type: "Snack", calories: "", protein: "", carbs: "", fat: "", servings: "1", serving_size_label: "", notes: "" });
  const [savingManual, setSavingManual] = useState(false);

  const isMobile = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
  }, []);
  
  const [goals, setGoals] = useState(null);

useEffect(() => {
  getUserGoals().then(setGoals);
}, []);

  useEffect(() => {
    let alive = true;
    async function run() {
      setLoading(true); setError("");
      try {
        const res = await listFoodLogsByDate(dateStr);
        const items = Array.isArray(res?.items) ? res.items : [];
        if (alive) setEntries(items);
      } catch (err) {
        if (alive) { setEntries([]); setError(err?.message || "Failed to load."); }
      } finally { if (alive) setLoading(false); }
    }
    run();
    return () => { alive = false; };
  }, [dateStr]);

  const totals = useMemo(() => entries.reduce(
    (acc, e) => { acc.calories += n0(e?.calories); acc.protein += n0(e?.protein); acc.carbs += n0(e?.carbs); acc.fat += n0(e?.fat); return acc; },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  ), [entries]);
  const filteredLibrary = useMemo(() => {
  if (!librarySearch.trim()) return libraryItems;
  const q = librarySearch.toLowerCase();
  return libraryItems.filter(
    (item) => item.name?.toLowerCase().includes(q) || item.brand?.toLowerCase().includes(q)
  );
}, [libraryItems, librarySearch]);

  // ZXing scanner
  useEffect(() => {
    if (!scanOpen) return;
    let reader = null; let stopped = false;
    async function start() {
      setScanError("");
      try {
        reader = new BrowserMultiFormatReader();
        const videoEl = document.getElementById("barcode-video");
        if (!videoEl) return;
        await reader.decodeFromConstraints(
          { video: { facingMode: "environment" } }, videoEl,
          async (result) => {
            if (stopped || !result) return;
            const clean = String(result.getText()).replace(/\D/g, "");
            if (clean.length === 8 || clean.length === 12 || clean.length === 13) {
              stopped = true;
              try { reader.reset(); } catch {}
              setScanOpen(false);
              await doLookup(clean);
            }
          }
        );
      } catch (e) { setScanError(e?.message || "Could not access camera."); }
    }
    start();
    return () => { stopped = true; try { reader?.reset(); } catch {} };
  }, [scanOpen]);

  function buildAddFoodFromLibrary(item) {
    return {
      barcode: item.barcode,
      name: item.name,
      brand: item.brand || "",
      meal_type: "Snack",
      servings: 1,
      serving_size_g: n0(item.serving_size_g),
      serving_size_label: item.serving_size_label || "",
      per_serving: {
        calories: n0(item.calories_per_serving),
        protein: n0(item.protein_per_serving),
        carbs: n0(item.carbs_per_serving),
        fat: n0(item.fat_per_serving),
      },
      notes: "",
      fromLibrary: true,
    };
  }

  function buildAddFoodFromOff(barcode, product) {
    const name = product?.product_name || product?.product_name_en || product?.generic_name || product?.brands || "Scanned food";
    const serving_size_g = n0(product?.serving_quantity) || 100;
    const serving_size_label = product?.serving_size || `${serving_size_g}g`;
    return {
      barcode, name,
      brand: product?.brands || "",
      meal_type: "Snack",
      servings: 1,
      serving_size_g,
      serving_size_label,
      per_serving: {
        calories: round0(scalePer100g(offKcalPer100g(product), serving_size_g)),
        protein: round0(scalePer100g(offMacroPer100g(product, "proteins"), serving_size_g)),
        carbs: round0(scalePer100g(offMacroPer100g(product, "carbohydrates"), serving_size_g)),
        fat: round0(scalePer100g(offMacroPer100g(product, "fat"), serving_size_g)),
      },
      per100g: {
        calories: offKcalPer100g(product),
        protein: offMacroPer100g(product, "proteins"),
        carbs: offMacroPer100g(product, "carbohydrates"),
        fat: offMacroPer100g(product, "fat"),
      },
      notes: "",
      fromLibrary: false,
    };
  }

  function computedFromAddFood(state) {
    const s = n0(state?.servings || 0);
    const p = state?.per_serving || {};
    return {
      calories: round0(n0(p.calories) * s),
      protein: round0(n0(p.protein) * s),
      carbs: round0(n0(p.carbs) * s),
      fat: round0(n0(p.fat) * s),
    };
  }

  const doLookup = useCallback(async function (barcode) {
    const clean = String(barcode || "").replace(/\D/g, "");
    if (!clean) { alert("Please enter a barcode."); return false; }
    try {
      setLookingUp(true);
      // Check food library first
      const cached = await lookupFoodLibrary(clean);
      if (cached) { setAddFood(buildAddFoodFromLibrary(cached)); return true; }
      // Fall back to Open Food Facts
      const { barcode: b, product } = await lookupOpenFoodFacts(clean);
      setAddFood(buildAddFoodFromOff(b, product));
      return true;
    } catch (e) {
      alert(e?.message || "Lookup failed.");
      return false;
    } finally { setLookingUp(false); }
  }, []);

  async function openLibrary() {
    setLibraryOpen(true);
    setLibraryLoading(true);
    try {
      const res = await pb.collection("food_library").getList(1, 100, { sort: "name" });
      setLibraryItems(Array.isArray(res?.items) ? res.items : []);
    } catch { setLibraryItems([]); } finally { setLibraryLoading(false); }
  }

  async function saveNewFoodLogEntry() {
    if (!addFood) return;
    try {
      setSavingNew(true);
      const t = computedFromAddFood(addFood);
      const userId = pb.authStore.model?.id;
      if (!userId) throw new Error("Not signed in.");
      const created = await pb.collection("food_log").create({
        user: userId, date: dateStr,
        meal_type: addFood.meal_type || "Snack",
        name: addFood.name || "Food",
        calories: t.calories, protein: t.protein, carbs: t.carbs, fat: t.fat,
        calories_per_serving: n0(addFood.per_serving?.calories),
        protein_per_serving: n0(addFood.per_serving?.protein),
        carbs_per_serving: n0(addFood.per_serving?.carbs),
        fat_per_serving: n0(addFood.per_serving?.fat),
        servings: n0(addFood.servings),
        notes: addFood.notes || "",
      });
      // Save to food library if not already there
      if (!addFood.fromLibrary && addFood.barcode) {
        await saveFoodLibrary({
          barcode: addFood.barcode,
          name: addFood.name,
          brand: addFood.brand || "",
          serving_size_g: addFood.serving_size_g || 100,
          serving_size_label: addFood.serving_size_label || "",
          calories_per_serving: n0(addFood.per_serving?.calories),
          protein_per_serving: n0(addFood.per_serving?.protein),
          carbs_per_serving: n0(addFood.per_serving?.carbs),
          fat_per_serving: n0(addFood.per_serving?.fat),
        });
      }
      setEntries((prev) => [created, ...prev]);
      setAddFood(null);
      setBarcodeInput("");
    } catch (e) {
      alert(e?.message || "Failed to add entry.");
    } finally { setSavingNew(false); }
  }

  function requestDelete(entry) { setConfirmDelete({ id: entry.id, name: entry.name }); }
  async function confirmDeleteNow() {
    if (!confirmDelete?.id) return;
    try {
      setDeletingId(confirmDelete.id);
      await deleteFoodLogEntry(confirmDelete.id);
      setEntries((prev) => prev.filter((e) => e.id !== confirmDelete.id));
      setConfirmDelete(null);
    } catch (err) { alert(err?.message || "Failed to delete."); }
    finally { setDeletingId(""); }
  }

  function requestEdit(entry) {
    setEditing({
      id: entry.id, meal_type: entry.meal_type || "", name: entry.name || "",
      calories: n0(entry.calories), protein: n0(entry.protein),
      carbs: n0(entry.carbs), fat: n0(entry.fat),
      servings: entry.servings ?? "", notes: entry.notes || "",
    });
  }
  async function saveEdit() {
    if (!editing?.id) return;
    try {
      setSavingEdit(true);
      const payload = {
        meal_type: editing.meal_type, name: editing.name,
        calories: n0(editing.calories), protein: n0(editing.protein),
        carbs: n0(editing.carbs), fat: n0(editing.fat),
        servings: editing.servings === "" ? null : n0(editing.servings),
        notes: editing.notes || "",
      };
      await updateFoodLogEntry(editing.id, payload);
      setEntries((prev) => prev.map((e) => e.id === editing.id ? { ...e, ...payload } : e));
      setEditing(null);
    } catch (err) { alert(err?.message || "Failed to save."); }
    finally { setSavingEdit(false); }
  }
          async function saveManualEntry() {
                      if (!manualFood.name.trim()) { alert("Please enter a food name."); return; }
                      try {
                        setSavingManual(true);
                        const userId = pb.authStore.model?.id;
                        if (!userId) throw new Error("Not signed in.");
                        const created = await pb.collection("food_log").create({
                          user: userId, date: dateStr,
                          meal_type: manualFood.meal_type || "Snack",
                          name: manualFood.name,
                          calories: Number(manualFood.calories) || 0,
                          protein: Number(manualFood.protein) || 0,
                          carbs: Number(manualFood.carbs) || 0,
                          fat: Number(manualFood.fat) || 0,
                          servings: Number(manualFood.servings) || 1,
                          notes: manualFood.notes || "",
                        });
                        setEntries((prev) => [created, ...prev]);
                        setManualOpen(false);
                        setManualFood({ name: "", meal_type: "Snack", calories: "", protein: "", carbs: "", fat: "", servings: "1", notes: "" });
                      } catch (e) {
                        alert(e?.message || "Failed to add entry.");
                      } finally {
                        setSavingManual(false);
                      }
                    }

  return (
    <div className="p-4 max-w-3xl mx-auto">

      {/* Date nav */}
      <div className="flex items-center justify-between gap-3">
        <button className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 font-semibold" onClick={() => setDateStr(addDaysUTC(dateStr, -1))}>Prev</button>
        <div className="text-sm text-gray-500">Food Log</div>
        <button className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 font-semibold" onClick={() => setDateStr(addDaysUTC(dateStr, 1))}>Next</button>
      </div>
      <div className="mt-2 flex items-center justify-center">
        <div className="text-lg font-bold text-gray-900">{dateStr}</div>
      </div>

      {/* Scan / Lookup / Library row */}
      <div className="mt-4 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        {isMobile && (
          <button onClick={() => setScanOpen(true)} className="px-3 py-2 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700">
            📷 Scan
          </button>
        )}
        <div className="flex-1 flex gap-2">
          <input value={barcodeInput} onChange={(e) => setBarcodeInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doLookup(barcodeInput)}
            placeholder="Enter barcode (UPC/EAN)"
            className="flex-1 px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-200" />
          <button onClick={() => doLookup(barcodeInput)} disabled={lookingUp}
            className="px-3 py-2 rounded-xl bg-white border border-gray-200 font-semibold hover:bg-gray-50 disabled:opacity-50">
            {lookingUp ? "..." : "Lookup"}
          </button>
        </div>
        <button onClick={openLibrary}
          className="px-3 py-2 rounded-xl bg-white border border-gray-200 font-semibold hover:bg-gray-50 text-sm">
          📋 Food Library
        </button>
      </div>
          <button onClick={() => setManualOpen(true)}
            className="px-3 py-2 rounded-xl bg-white border border-gray-200 font-semibold hover:bg-gray-50 text-sm">
            ✏️ Add manually
          </button>
               
     {/* Totals + Progress */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          {[
            ["Calories", Math.round(totals.calories), "", goals?.calories],
            ["Protein", Math.round(totals.protein), "g", goals?.protein],
            ["Carbs", Math.round(totals.carbs), "g", goals?.carbs],
            ["Fat", Math.round(totals.fat), "g", goals?.fat],
          ].map(([label, val, unit, goal]) => {
    const pct = goal > 0 ? Math.min(100, Math.round((val / goal) * 100)) : null;
    const over = goal > 0 && val > goal;
    return (
      <div key={label} className="p-3 rounded-2xl bg-white border border-gray-100 shadow-sm">
        <div className="text-gray-500 text-xs font-semibold uppercase tracking-wide">{label}</div>
        <div className="mt-1 text-xl font-bold text-gray-900">{val}{unit}</div>
        {goal > 0 && (
          <>
            <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${over ? "bg-red-400" : "bg-emerald-400"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className={`mt-1 text-xs ${over ? "text-red-500" : "text-gray-400"}`}>
              {over ? `+${val - goal}${unit} over` : `${goal - val}${unit} left`}
            </div>
          </>
        )}
      </div>
    );
  })}
</div>

      {/* Entries */}
      <div className="mt-6">
        {loading ? <div className="text-gray-500">Loading…</div>
        : error ? <div className="text-red-600 text-sm">{error}</div>
        : entries.length === 0 ? <div className="text-gray-500">No entries for this day.</div>
        : (
          <ul className="space-y-3">
            {entries.map((e) => (
              <li key={e.id} className="p-4 rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={"inline-flex items-center px-2 py-1 rounded-full border text-xs font-bold " + mealPillClass(e.meal_type)}>{e.meal_type || "Meal"}</span>
                      <div className="font-semibold text-gray-900 truncate">{e.name}</div>
                    </div>
                    <div className="mt-2 text-sm text-gray-600">
                      <span className="font-semibold text-gray-800">{e.calories ?? 0}</span> cal
                      <span className="mx-2 text-gray-300">•</span>P <span className="font-semibold text-gray-800">{e.protein ?? 0}</span>g
                      <span className="mx-2 text-gray-300">•</span>C <span className="font-semibold text-gray-800">{e.carbs ?? 0}</span>g
                      <span className="mx-2 text-gray-300">•</span>F <span className="font-semibold text-gray-800">{e.fat ?? 0}</span>g
                      {e.servings ? <><span className="mx-2 text-gray-300">•</span><span>{e.servings} srv</span></> : null}
                    </div>
                    {e.notes ? <div className="mt-2 text-sm text-gray-700">{e.notes}</div> : null}
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <div className="text-xs text-gray-500">{e.created ? new Date(e.created).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : ""}</div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => requestEdit(e)} className="text-xs font-semibold text-gray-700 hover:text-gray-900">Edit</button>
                      <button onClick={() => requestDelete(e)} disabled={deletingId === e.id} className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50">{deletingId === e.id ? "Deleting..." : "Delete"}</button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Food Library modal */}
{libraryOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    <div className="absolute inset-0 bg-black/40" onClick={() => setLibraryOpen(false)} />
    <div className="relative w-[92%] max-w-lg rounded-2xl bg-white shadow-xl border border-gray-100 p-4 max-h-[80vh] flex flex-col">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-gray-900">📋 Food Library</div>
        <button className="text-sm font-semibold text-gray-500 hover:text-gray-700" onClick={() => setLibraryOpen(false)}>Close</button>
      </div>
      <input
        type="text"
        placeholder="Search foods..."
        value={librarySearch}
        onChange={(e) => setLibrarySearch(e.target.value)}
        className="mt-3 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
      />
      <div className="mt-3 overflow-y-auto flex-1">
        {libraryLoading ? <div className="text-sm text-gray-500 py-4 text-center">Loading…</div>
        : filteredLibrary.length === 0 ? <div className="text-sm text-gray-500 py-4 text-center">{libraryItems.length === 0 ? "No saved foods yet. Scan a barcode to add your first one!" : "No matches found."}</div>
        : (
          <ul className="space-y-2">
            {filteredLibrary.map((item) => (
              <li key={item.id}>
                <button
                  className="w-full text-left p-3 rounded-xl border border-gray-100 hover:bg-emerald-50 hover:border-emerald-200 transition-colors"
                  onClick={() => { setAddFood(buildAddFoodFromLibrary(item)); setLibraryOpen(false); setLibrarySearch(""); }}
                >
                  <div className="font-semibold text-gray-900 text-sm">{item.name}</div>
                  {item.brand ? <div className="text-xs text-gray-500">{item.brand}</div> : null}
                  <div className="mt-1 text-xs text-gray-500">
                    {item.serving_size_label || `${item.serving_size_g}g`} · {round0(item.calories_per_serving)} cal · P {round0(item.protein_per_serving)}g · C {round0(item.carbs_per_serving)}g · F {round0(item.fat_per_serving)}g
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  </div>
)}
{/* Manual entry modal */}
{manualOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    <div className="absolute inset-0 bg-black/40" onClick={() => savingManual ? null : setManualOpen(false)} />
    <div className="relative w-[92%] max-w-lg rounded-2xl bg-white shadow-xl border border-gray-100 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-gray-900">Add food manually</div>
          <div className="text-xs text-gray-500 mt-0.5">Enter nutrition info directly.</div>
        </div>
        <button className="text-sm font-semibold text-gray-500 hover:text-gray-700" onClick={() => setManualOpen(false)} disabled={savingManual}>Close</button>
      </div>
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="text-xs font-semibold text-gray-600 sm:col-span-2">Food name
          <input className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            value={manualFood.name} onChange={(e) => setManualFood((p) => ({ ...p, name: e.target.value }))}
            placeholder="e.g. Chicken breast, Greek yogurt..." />
        </label>
        <label className="text-xs font-semibold text-gray-600">Meal type
          <input className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            value={manualFood.meal_type} onChange={(e) => setManualFood((p) => ({ ...p, meal_type: e.target.value }))}
            placeholder="Breakfast / Lunch / Dinner / Snack" />
        </label>
        <label className="text-xs font-semibold text-gray-600">Servings
          <input type="number" step="0.5" min="0.5" className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            value={manualFood.servings} onChange={(e) => setManualFood((p) => ({ ...p, servings: e.target.value }))} />
        </label>
        <label className="text-xs font-semibold text-gray-600 sm:col-span-2">Serving size label
            <input className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              value={manualFood.serving_size_label}
              onChange={(e) => setManualFood((p) => ({ ...p, serving_size_label: e.target.value }))}
              placeholder="e.g. 1 cup, 2 tbsp, 1 slice (optional)" />
          </label>
        <label className="text-xs font-semibold text-gray-600">Calories
          <input type="number" className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            value={manualFood.calories} onChange={(e) => setManualFood((p) => ({ ...p, calories: e.target.value }))} placeholder="kcal" />
        </label>
        <label className="text-xs font-semibold text-gray-600">Protein (g)
          <input type="number" className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            value={manualFood.protein} onChange={(e) => setManualFood((p) => ({ ...p, protein: e.target.value }))} />
        </label>
        <label className="text-xs font-semibold text-gray-600">Carbs (g)
          <input type="number" className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            value={manualFood.carbs} onChange={(e) => setManualFood((p) => ({ ...p, carbs: e.target.value }))} />
        </label>
        <label className="text-xs font-semibold text-gray-600">Fat (g)
          <input type="number" className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            value={manualFood.fat} onChange={(e) => setManualFood((p) => ({ ...p, fat: e.target.value }))} />
        </label>
        <label className="text-xs font-semibold text-gray-600 sm:col-span-2">Notes
          <textarea className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-200 min-h-[60px]"
            value={manualFood.notes} onChange={(e) => setManualFood((p) => ({ ...p, notes: e.target.value }))} placeholder="Optional" />
        </label>
      </div>
      <div className="mt-4 flex items-center justify-end gap-2">
        <button className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 disabled:opacity-50" onClick={() => setManualOpen(false)} disabled={savingManual}>Cancel</button>
        <button className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50" onClick={saveManualEntry} disabled={savingManual}>{savingManual ? "Saving..." : "Log it"}</button>
      </div>
    </div>
  </div>
)}
      {/* Scanner modal */}
      {scanOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setScanOpen(false)} />
          <div className="relative w-[92%] max-w-md rounded-2xl bg-white shadow-xl border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-900">Scan barcode</div>
              <button className="text-sm font-semibold text-gray-500 hover:text-gray-700" onClick={() => setScanOpen(false)}>Close</button>
            </div>
            <div className="mt-3 rounded-xl overflow-hidden border border-gray-200 bg-black">
              <video id="barcode-video" className="w-full" playsInline muted autoPlay />
            </div>
            {scanError ? <div className="mt-3 text-sm text-red-600">{scanError}</div>
              : <div className="mt-3 text-xs text-gray-500">Point camera at the barcode. Hold steady.</div>}
            <div className="mt-3 flex gap-2">
              <input value={barcodeInput} onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Or type barcode manually"
                className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
              <button onClick={async () => { setScanOpen(false); await doLookup(barcodeInput); }} disabled={lookingUp}
                className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
                {lookingUp ? "..." : "Lookup"}
              </button>
            </div>
          </div>
        </div>
      )}
              {manualFood.serving_size_label && (
              <div className="mt-1 text-xs text-emerald-700 font-medium">
                1 serving = {manualFood.serving_size_label}
              </div>
            )}
      {/* Add food modal */}
      {addFood && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => savingNew ? null : setAddFood(null)} />
          <div className="relative w-[92%] max-w-lg rounded-2xl bg-white shadow-xl border border-gray-100 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-gray-900">{addFood.name}</div>
                {addFood.brand ? <div className="text-xs text-gray-500">{addFood.brand}</div> : null}
                <div className="text-xs text-gray-400 mt-0.5">1 serving = {addFood.serving_size_label || `${addFood.serving_size_g}g`}</div>
              </div>
              <button className="text-sm font-semibold text-gray-500 hover:text-gray-700" onClick={() => setAddFood(null)} disabled={savingNew}>Close</button>
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-xs font-semibold text-gray-600">Meal type
                <input className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  value={addFood.meal_type} onChange={(ev) => setAddFood((p) => ({ ...p, meal_type: ev.target.value }))}
                  placeholder="Breakfast / Lunch / Dinner / Snack" />
              </label>
              <label className="text-xs font-semibold text-gray-600">How many servings?
                <input type="number" step="0.5" min="0.5"
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  value={addFood.servings}
                  onChange={(ev) => setAddFood((p) => ({ ...p, servings: ev.target.value }))} />
                {(addFood.serving_size_label || addFood.serving_size_g) && (
                  <div className="mt-1 text-xs text-emerald-700 font-medium">
                    1 serving = {addFood.serving_size_label || `${addFood.serving_size_g}g`}
                  </div>
                )}
              </label>
              <label className="text-xs font-semibold text-gray-600 sm:col-span-2">Notes
                <textarea className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-200 min-h-[60px]"
                  value={addFood.notes} onChange={(ev) => setAddFood((p) => ({ ...p, notes: ev.target.value }))} placeholder="Optional" />
              </label>
            </div>
            {(() => {
              const t = computedFromAddFood(addFood);
              return (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                  {[["Calories", t.calories, ""], ["Protein", t.protein, "g"], ["Carbs", t.carbs, "g"], ["Fat", t.fat, "g"]].map(([label, val, unit]) => (
                    <div key={label} className="p-2 rounded-xl bg-gray-50">
                      <div className="text-xs text-gray-500">{label}</div>
                      <div className="font-bold">{val}{unit}</div>
                    </div>
                  ))}
                </div>
              );
            })()}
            <div className="mt-4 flex items-center justify-end gap-2">
              <button className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 disabled:opacity-50" onClick={() => setAddFood(null)} disabled={savingNew}>Cancel</button>
              <button className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50" onClick={saveNewFoodLogEntry} disabled={savingNew}>{savingNew ? "Saving..." : "Log it"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => deletingId ? null : setConfirmDelete(null)} />
          <div className="relative w-[92%] max-w-sm rounded-2xl bg-white shadow-xl border border-gray-100 p-4">
            <div className="text-sm font-semibold text-gray-900">Delete entry?</div>
            <div className="mt-1 text-sm text-gray-600">This will permanently delete <span className="font-medium">{confirmDelete.name || "this entry"}</span>.</div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-semibold disabled:opacity-50" onClick={() => setConfirmDelete(null)} disabled={!!deletingId}>Cancel</button>
              <button className="px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold disabled:opacity-50" onClick={confirmDeleteNow} disabled={!!deletingId}>{deletingId ? "Deleting..." : "Delete"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => savingEdit ? null : setEditing(null)} />
          <div className="relative w-[92%] max-w-lg rounded-2xl bg-white shadow-xl border border-gray-100 p-4">
            <div className="flex items-start justify-between gap-3">
              <div><div className="text-sm font-semibold text-gray-900">Edit entry</div><div className="text-xs text-gray-500 mt-0.5">Update meal details and macros.</div></div>
              <button className="text-sm font-semibold text-gray-500 hover:text-gray-700" onClick={() => setEditing(null)} disabled={savingEdit}>Close</button>
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-xs font-semibold text-gray-600">Meal type<input className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-200" value={editing.meal_type} onChange={(ev) => setEditing((p) => ({ ...p, meal_type: ev.target.value }))} /></label>
              <label className="text-xs font-semibold text-gray-600">Name<input className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-200" value={editing.name} onChange={(ev) => setEditing((p) => ({ ...p, name: ev.target.value }))} /></label>
              <label className="text-xs font-semibold text-gray-600">Calories<input type="number" className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-200" value={editing.calories} onChange={(ev) => setEditing((p) => ({ ...p, calories: ev.target.value }))} /></label>
              <label className="text-xs font-semibold text-gray-600">Servings<input type="number" className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-200" value={editing.servings} onChange={(ev) => setEditing((p) => ({ ...p, servings: ev.target.value }))} placeholder="Optional" /></label>
              <label className="text-xs font-semibold text-gray-600">Protein (g)<input type="number" className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-200" value={editing.protein} onChange={(ev) => setEditing((p) => ({ ...p, protein: ev.target.value }))} /></label>
              <label className="text-xs font-semibold text-gray-600">Carbs (g)<input type="number" className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-200" value={editing.carbs} onChange={(ev) => setEditing((p) => ({ ...p, carbs: ev.target.value }))} /></label>
              <label className="text-xs font-semibold text-gray-600">Fat (g)<input type="number" className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-200" value={editing.fat} onChange={(ev) => setEditing((p) => ({ ...p, fat: ev.target.value }))} /></label>
              <label className="text-xs font-semibold text-gray-600 sm:col-span-2">Notes<textarea className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-200 min-h-[90px]" value={editing.notes} onChange={(ev) => setEditing((p) => ({ ...p, notes: ev.target.value }))} /></label>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-semibold disabled:opacity-50" onClick={() => setEditing(null)} disabled={savingEdit}>Cancel</button>
              <button className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50" onClick={saveEdit} disabled={savingEdit}>{savingEdit ? "Saving..." : "Save"}</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
