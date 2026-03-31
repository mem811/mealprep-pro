import { useEffect, useMemo, useState } from "react";
import pb from "../lib/pb";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { listFoodLogsByDate, deleteFoodLogEntry, updateFoodLogEntry } from "../lib/foodLog";

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

function n0(v) {
  const num = Number(v);
  return Number.isFinite(num) ? num : 0;
}

function round0(v) {
  return Math.round(n0(v));
}

// Open Food Facts helpers
function offKcalPer100g(product) {
  // OFF often uses "energy-kcal_100g" in nutriments
  return n0(product?.nutriments?.["energy-kcal_100g"]);
}

function offMacroPer100g(product, key) {
  // keys: proteins_100g, carbohydrates_100g, fat_100g
  return n0(product?.nutriments?.[`${key}_100g`]);
}

function scalePer100g(per100g, grams) {
  return (n0(per100g) * n0(grams)) / 100;
}

async function lookupOpenFoodFacts(barcode) {
  const clean = String(barcode || "").replace(/\D/g, "");
  if (!clean) throw new Error("Please enter a barcode.");

  const url = `https://world.openfoodfacts.org/api/v2/product/${clean}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Lookup failed (${res.status})`);
  const data = await res.json();

  if (data?.status !== 1) throw new Error("Not found in Open Food Facts.");

  return { barcode: clean, product: data.product };
}

export default function FoodLogPage() {
  const [dateStr, setDateStr] = useState(toDateOnlyUTC());
  const [entries, setEntries] = useState([]); // ALWAYS array
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [deletingId, setDeletingId] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null); // { id, name } | null

  const [editing, setEditing] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Barcode lookup
  const [barcodeInput, setBarcodeInput] = useState("");
  const [lookingUp, setLookingUp] = useState(false);

  // Scanner modal
  const [scanOpen, setScanOpen] = useState(false);
  const [scanError, setScanError] = useState("");

  // “Add food” modal after lookup
  const [addFood, setAddFood] = useState(null);
  // addFood shape:
  // {
  //   barcode, name, meal_type, grams,
  //   per100g: { calories, protein, carbs, fat },
  //   notes
  // }

  const [savingNew, setSavingNew] = useState(false);

  const isMobile = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
  }, []);

  useEffect(() => {
    let alive = true;

    async function run() {
      setLoading(true);
      setError("");

      try {
        const res = await listFoodLogsByDate(dateStr);
        const items = Array.isArray(res?.items) ? res.items : [];
        if (alive) setEntries(items);
      } catch (err) {
        if (alive) {
          setEntries([]);
          setError(err?.message || "Failed to load food log entries.");
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [dateStr]);

  const totals = useMemo(() => {
    return entries.reduce(
      (acc, e) => {
        acc.calories += n0(e?.calories);
        acc.protein += n0(e?.protein);
        acc.carbs += n0(e?.carbs);
        acc.fat += n0(e?.fat);
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [entries]);

  function requestDelete(entry) {
    setConfirmDelete({ id: entry.id, name: entry.name });
  }

  async function confirmDeleteNow() {
    if (!confirmDelete?.id) return;

    try {
      setDeletingId(confirmDelete.id);
      await deleteFoodLogEntry(confirmDelete.id);
      setEntries((prev) => prev.filter((e) => e.id !== confirmDelete.id));
      setConfirmDelete(null);
    } catch (err) {
      alert(err?.message || "Failed to delete entry.");
    } finally {
      setDeletingId("");
    }
  }

  function requestEdit(entry) {
    setEditing({
      id: entry.id,
      meal_type: entry.meal_type || "",
      name: entry.name || "",
      calories: n0(entry.calories),
      protein: n0(entry.protein),
      carbs: n0(entry.carbs),
      fat: n0(entry.fat),
      servings: entry.servings ?? "",
      notes: entry.notes || "",
    });
  }

  async function saveEdit() {
    if (!editing?.id) return;

    try {
      setSavingEdit(true);

      const payload = {
        meal_type: editing.meal_type,
        name: editing.name,
        calories: n0(editing.calories),
        protein: n0(editing.protein),
        carbs: n0(editing.carbs),
        fat: n0(editing.fat),
        servings: editing.servings === "" ? null : n0(editing.servings),
        notes: editing.notes || "",
      };

      await updateFoodLogEntry(editing.id, payload);

      setEntries((prev) => prev.map((e) => (e.id === editing.id ? { ...e, ...payload } : e)));
      setEditing(null);
    } catch (err) {
      alert(err?.message || "Failed to save changes.");
    } finally {
      setSavingEdit(false);
    }
  }

  function buildAddFoodFromOff(barcode, product) {
    const name =
      product?.product_name ||
      product?.product_name_en ||
      product?.generic_name ||
      product?.brands ||
      "Scanned food";

    const per100g = {
      calories: offKcalPer100g(product),
      protein: offMacroPer100g(product, "proteins"),
      carbs: offMacroPer100g(product, "carbohydrates"),
      fat: offMacroPer100g(product, "fat"),
    };

    return {
      barcode,
      name,
      meal_type: "Snack",
      grams: 100,
      per100g,
      notes: "",
    };
  }

  function computedFromAddFood(state) {
    const grams = n0(state?.grams || 0);
    const per100g = state?.per100g || {};
    return {
      calories: round0(scalePer100g(per100g.calories, grams)),
      protein: round0(scalePer100g(per100g.protein, grams)),
      carbs: round0(scalePer100g(per100g.carbs, grams)),
      fat: round0(scalePer100g(per100g.fat, grams)),
    };
  }

  async function doLookup(barcode) {
    try {
      setLookingUp(true);
      const { barcode: clean, product } = await lookupOpenFoodFacts(barcode);
      setAddFood(buildAddFoodFromOff(clean, product));
    } catch (e) {
      alert(e?.message || "Lookup failed.");
    } finally {
      setLookingUp(false);
    }
  }

  async function saveNewFoodLogEntry() {
    if (!addFood) return;

    try {
      setSavingNew(true);

      const totalsNow = computedFromAddFood(addFood);

      const userId = pb.authStore.model?.id;
      if (!userId) throw new Error("Not signed in.");

      const payload = {
        user: userId,
        date: dateStr,
        meal_type: addFood.meal_type || "Snack",
        name: addFood.name || "Food",
        calories: totalsNow.calories,
        protein: totalsNow.protein,
        carbs: totalsNow.carbs,
        fat: totalsNow.fat,
        servings: null,
        notes: addFood.notes || "",
        // Optional: store barcode info so you can use it later (add these fields to PB if you want):
        // barcode: addFood.barcode,
        // grams: n0(addFood.grams),
      };

      const created = await pb.collection("food_log").create(payload);

      // Update UI immediately
      setEntries((prev) => [created, ...prev]);
      setAddFood(null);
      setBarcodeInput("");
    } catch (e) {
      alert(e?.message || "Failed to add entry.");
    } finally {
      setSavingNew(false);
    }
  }

  // Start/stop scanner when modal opens
  useEffect(() => {
    if (!scanOpen) return;

    let qr = null;
    let stopped = false;

    async function start() {
      setScanError("");

      try {
        qr = new Html5Qrcode("barcode-reader");

        const config = {
  fps: 10,
  qrbox: { width: 280, height: 180 },
  formatsToSupport: [
    Html5QrcodeSupportedFormats.EAN_13,
    Html5QrcodeSupportedFormats.EAN_8,
    Html5QrcodeSupportedFormats.UPC_A,
    Html5QrcodeSupportedFormats.UPC_E,
  ],
};

await qr.start(
  { facingMode: { exact: "environment" } },
  config,
  async (decodedText) => {
    if (stopped) return;
    stopped = true;

    try {
      await qr.stop();
    } catch {}

    setScanOpen(false);
    await doLookup(decodedText);
  },
  () => {}
);
      } catch (e) {
        setScanError(e?.message || "Unable to start camera.");
      }
    }

    start();

    return () => {
      stopped = true;
      if (qr) {
        qr.stop().catch(() => {});
      }
    };
  }, [scanOpen]);

  return (
    <div className="p-4 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <button
          className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors font-semibold"
          onClick={() => setDateStr(addDaysUTC(dateStr, -1))}
        >
          Prev
        </button>

        <div className="text-sm text-gray-500">Food Log</div>

        <button
          className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors font-semibold"
          onClick={() => setDateStr(addDaysUTC(dateStr, 1))}
        >
          Next
        </button>
      </div>

      <div className="mt-2 flex items-center justify-center">
        <div className="text-lg font-bold text-gray-900">{dateStr}</div>
      </div>

      {/* Scan / lookup */}
      <div className="mt-4 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        {isMobile ? (
          <button
            onClick={() => setScanOpen(true)}
            className="px-3 py-2 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors"
          >
            Scan barcode
          </button>
        ) : null}

        <div className="flex-1 flex gap-2">
          <input
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            placeholder="Enter barcode (UPC/EAN)"
            className="flex-1 px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          />

          <button
            onClick={() => doLookup(barcodeInput)}
            disabled={lookingUp}
            className="px-3 py-2 rounded-xl bg-white border border-gray-200 font-semibold hover:bg-gray-50 disabled:opacity-50"
          >
            {lookingUp ? "Looking up..." : "Lookup"}
          </button>
        </div>
      </div>

      {/* Totals */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div className="p-3 rounded-2xl bg-white border border-gray-100 shadow-sm">
          <div className="text-gray-500 text-xs font-semibold uppercase tracking-wide">Calories</div>
          <div className="mt-1 text-xl font-bold text-gray-900">{Math.round(totals.calories)}</div>
        </div>

        <div className="p-3 rounded-2xl bg-white border border-gray-100 shadow-sm">
          <div className="text-gray-500 text-xs font-semibold uppercase tracking-wide">Protein</div>
          <div className="mt-1 text-xl font-bold text-gray-900">{Math.round(totals.protein)}g</div>
        </div>

        <div className="p-3 rounded-2xl bg-white border border-gray-100 shadow-sm">
          <div className="text-gray-500 text-xs font-semibold uppercase tracking-wide">Carbs</div>
          <div className="mt-1 text-xl font-bold text-gray-900">{Math.round(totals.carbs)}g</div>
        </div>

        <div className="p-3 rounded-2xl bg-white border border-gray-100 shadow-sm">
          <div className="text-gray-500 text-xs font-semibold uppercase tracking-wide">Fat</div>
          <div className="mt-1 text-xl font-bold text-gray-900">{Math.round(totals.fat)}g</div>
        </div>
      </div>

      {/* Entries */}
      <div className="mt-6">
        {loading ? (
          <div className="text-gray-500">Loading…</div>
        ) : error ? (
          <div className="text-red-600 text-sm">{error}</div>
        ) : entries.length === 0 ? (
          <div className="text-gray-500">No entries for this day.</div>
        ) : (
          <ul className="space-y-3">
            {entries.map((e) => (
              <li key={e.id} className="p-4 rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={
                          "inline-flex items-center px-2 py-1 rounded-full border text-xs font-bold " +
                          mealPillClass(e.meal_type)
                        }
                      >
                        {e.meal_type || "Meal"}
                      </span>

                      <div className="font-semibold text-gray-900 truncate">{e.name}</div>
                    </div>

                    <div className="mt-2 text-sm text-gray-600">
                      <span className="font-semibold text-gray-800">{e.calories ?? 0}</span> cal
                      <span className="mx-2 text-gray-300">•</span>
                      P <span className="font-semibold text-gray-800">{e.protein ?? 0}</span>g
                      <span className="mx-2 text-gray-300">•</span>
                      C <span className="font-semibold text-gray-800">{e.carbs ?? 0}</span>g
                      <span className="mx-2 text-gray-300">•</span>
                      F <span className="font-semibold text-gray-800">{e.fat ?? 0}</span>g
                      {e.servings ? (
                        <>
                          <span className="mx-2 text-gray-300">•</span>
                          <span className="text-gray-700">{e.servings} servings</span>
                        </>
                      ) : null}
                    </div>

                    {e.notes ? <div className="mt-2 text-sm text-gray-700">{e.notes}</div> : null}
                  </div>

                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <div className="text-xs text-gray-500">
                      {e.created
                        ? new Date(e.created).toLocaleTimeString([], {
                            hour: "numeric",
                            minute: "2-digit",
                          })
                        : ""}
                    </div>

                    <div className="flex items-center gap-2">
                      <button onClick={() => requestEdit(e)} className="text-xs font-semibold text-gray-700 hover:text-gray-900">
                        Edit
                      </button>

                      <button
                        onClick={() => requestDelete(e)}
                        disabled={deletingId === e.id}
                        className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
                      >
                        {deletingId === e.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Scanner modal */}
      {scanOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setScanOpen(false)} />
          <div className="relative w-[92%] max-w-md rounded-2xl bg-white shadow-xl border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-900">Scan barcode</div>
              <button className="text-sm font-semibold text-gray-500 hover:text-gray-700" onClick={() => setScanOpen(false)}>
                Close
              </button>
            </div>

            <div className="mt-3 rounded-xl overflow-hidden border border-gray-200">
              <div id="barcode-reader" className="w-full" />
            </div>

            {scanError ? <div className="mt-3 text-sm text-red-600">{scanError}</div> : null}

            <div className="mt-3 text-xs text-gray-500">
              Point your camera at the barcode. If the camera doesn’t open, check browser permissions.
            </div>
          </div>
        </div>
      )}

      {/* Add food modal */}
      {addFood && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => (savingNew ? null : setAddFood(null))} />

          <div className="relative w-[92%] max-w-lg rounded-2xl bg-white shadow-xl border border-gray-100 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-gray-900">Add scanned food</div>
                <div className="text-xs text-gray-500 mt-0.5">Default is per 100g. Adjust grams to match your portion.</div>
              </div>

              <button
                className="text-sm font-semibold text-gray-500 hover:text-gray-700"
                onClick={() => setAddFood(null)}
                disabled={savingNew}
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-xs font-semibold text-gray-600">
                Name
                <input
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  value={addFood.name}
                  onChange={(ev) => setAddFood((p) => ({ ...p, name: ev.target.value }))}
                />
              </label>

              <label className="text-xs font-semibold text-gray-600">
                Meal type
                <input
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  value={addFood.meal_type}
                  onChange={(ev) => setAddFood((p) => ({ ...p, meal_type: ev.target.value }))}
                  placeholder="Breakfast / Lunch / Dinner / Snack"
                />
              </label>

              <label className="text-xs font-semibold text-gray-600">
                Grams
                <input
                  type="number"
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  value={addFood.grams}
                  onChange={(ev) => setAddFood((p) => ({ ...p, grams: ev.target.value }))}
                />
              </label>

              <label className="text-xs font-semibold text-gray-600 sm:col-span-2">
                Notes
                <textarea
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-200 min-h-[80px]"
                  value={addFood.notes}
                  onChange={(ev) => setAddFood((p) => ({ ...p, notes: ev.target.value }))}
                  placeholder="Optional"
                />
              </label>
            </div>

            {/* Live computed macros */}
            {(() => {
              const t = computedFromAddFood(addFood);
              return (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                  <div className="p-2 rounded-xl bg-gray-50">
                    <div className="text-xs text-gray-500">Calories</div>
                    <div className="font-bold">{t.calories}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-gray-50">
                    <div className="text-xs text-gray-500">Protein</div>
                    <div className="font-bold">{t.protein}g</div>
                  </div>
                  <div className="p-2 rounded-xl bg-gray-50">
                    <div className="text-xs text-gray-500">Carbs</div>
                    <div className="font-bold">{t.carbs}g</div>
                  </div>
                  <div className="p-2 rounded-xl bg-gray-50">
                    <div className="text-xs text-gray-500">Fat</div>
                    <div className="font-bold">{t.fat}g</div>
                  </div>
                </div>
              );
            })()}

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 disabled:opacity-50"
                onClick={() => setAddFood(null)}
                disabled={savingNew}
              >
                Cancel
              </button>

              <button
                className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
                onClick={saveNewFoodLogEntry}
                disabled={savingNew}
              >
                {savingNew ? "Saving..." : "Log it"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => (deletingId ? null : setConfirmDelete(null))} />

          <div className="relative w-[92%] max-w-sm rounded-2xl bg-white shadow-xl border border-gray-100 p-4">
            <div className="text-sm font-semibold text-gray-900">Delete entry?</div>
            <div className="mt-1 text-sm text-gray-600">
              This will permanently delete <span className="font-medium">{confirmDelete.name || "this entry"}</span>.
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 disabled:opacity-50"
                onClick={() => setConfirmDelete(null)}
                disabled={!!deletingId}
              >
                Cancel
              </button>

              <button
                className="px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
                onClick={confirmDeleteNow}
                disabled={!!deletingId}
              >
                {deletingId ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => (savingEdit ? null : setEditing(null))} />

          <div className="relative w-[92%] max-w-lg rounded-2xl bg-white shadow-xl border border-gray-100 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-gray-900">Edit entry</div>
                <div className="text-xs text-gray-500 mt-0.5">Update meal details and macros.</div>
              </div>

              <button
                className="text-sm font-semibold text-gray-500 hover:text-gray-700"
                onClick={() => setEditing(null)}
                disabled={savingEdit}
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-xs font-semibold text-gray-600">
                Meal type
                <input
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  value={editing.meal_type}
                  onChange={(ev) => setEditing((p) => ({ ...p, meal_type: ev.target.value }))}
                />
              </label>

              <label className="text-xs font-semibold text-gray-600">
                Name
                <input
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  value={editing.name}
                  onChange={(ev) => setEditing((p) => ({ ...p, name: ev.target.value }))}
                />
              </label>

              <label className="text-xs font-semibold text-gray-600">
                Calories
                <input
                  type="number"
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  value={editing.calories}
                  onChange={(ev) => setEditing((p) => ({ ...p, calories: ev.target.value }))}
                />
              </label>

              <label className="text-xs font-semibold text-gray-600">
                Servings
                <input
                  type="number"
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  value={editing.servings}
                  onChange={(ev) => setEditing((p) => ({ ...p, servings: ev.target.value }))}
                  placeholder="Optional"
                />
              </label>

              <label className="text-xs font-semibold text-gray-600">
                Protein (g)
                <input
                  type="number"
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  value={editing.protein}
                  onChange={(ev) => setEditing((p) => ({ ...p, protein: ev.target.value }))}
                />
              </label>

              <label className="text-xs font-semibold text-gray-600">
                Carbs (g)
                <input
                  type="number"
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  value={editing.carbs}
                  onChange={(ev) => setEditing((p) => ({ ...p, carbs: ev.target.value }))}
                />
              </label>

              <label className="text-xs font-semibold text-gray-600">
                Fat (g)
                <input
                  type="number"
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  value={editing.fat}
                  onChange={(ev) => setEditing((p) => ({ ...p, fat: ev.target.value }))}
                />
              </label>

              <label className="text-xs font-semibold text-gray-600 sm:col-span-2">
                Notes
                <textarea
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-200 min-h-[90px]"
                  value={editing.notes}
                  onChange={(ev) => setEditing((p) => ({ ...p, notes: ev.target.value }))}
                />
              </label>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 disabled:opacity-50"
                onClick={() => setEditing(null)}
                disabled={savingEdit}
              >
                Cancel
              </button>

              <button
                className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
                onClick={saveEdit}
                disabled={savingEdit}
              >
                {savingEdit ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
