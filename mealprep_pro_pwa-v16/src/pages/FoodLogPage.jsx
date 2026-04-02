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
  const [manualFood, setManualFood] = useState({
    name: "", meal_type: "Snack", calories: "", protein: "", carbs: "",
    fat: "", servings: "1", serving_size_label: "", notes: ""
  });
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
      const cached = await lookupFoodLibrary(clean);
      if (cached) { setAddFood(buildAddFoodFromLibrary(cached)); return true; }
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
    const servings = n0(entry.servings) || 1;
    const perServing = {
      calories: entry.calories_per_serving ? n0(entry.calories_per_serving) : Math.round(n0(entry.calories) / servings),
      protein: entry.protein_per_serving ? n0(entry.protein_per_serving) : Math.round(n0(entry.protein) / servings),
      carbs: entry.carbs_per_serving ? n0(entry.carbs_per_serving) : Math.round(n0(entry.carbs) / servings),
      fat: entry.fat_per_serving ? n0(entry.fat_per_serving) : Math.round(n0(entry.fat) / servings),
    };
    setEditing({
      id: entry.id, meal_type: entry.meal_type || "", name: entry.name || "",
      calories: n0(entry.calories), protein: n0(entry.protein),
      carbs: n0(entry.carbs), fat: n0(entry.fat),
      servings: entry.servings ?? "",
      notes: entry.notes || "",
      perServing,
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
      setManualFood({ name: "", meal_type: "Snack", calories: "", protein: "", carbs: "", fat: "", servings: "1", serving_size_label: "", notes: "" });
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
      <div className="mt-4 flex flex-wrap gap-2 items-center">
        {isMobile && (
          <button onClick={() => setScanOpen(true)} className="px-3 py-2 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 text-sm">
            📷 Scan
          </button>
        )}
        <input value={barcodeInput} onChange={(e) => setBarcodeInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && doLookup(barcodeInput)}
          placeholder="Enter barcode (UPC/EAN)"
          className="w-48 px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-200 text-sm" />
        <button onClick={() => doLookup(barcodeInput)} disabled={lookingUp}
          className="px-3 py-2 rounded-xl bg-white border border-gray-200 font-semibold hover:bg-gray-50 disabled:opacity-50 text-sm">
          {lookingUp ? "..." : "Lookup"}
        </button>
        <button onClick={openLibrary}
          className="px-3 py-2 rounded-xl bg-white border border-gray-200 font-semibold hover:bg-gray-50 text-sm">
          📋 Food Library
        </button>
        <button onClick={() => setManualOpen(true)}
          className="px-3 py-2 rounded-xl bg-white border border-gray-200 font-semibold hover:bg-gray-50 text-sm">
          ✏️ Add manually
        </button>
      </div>

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
              <div className="text
