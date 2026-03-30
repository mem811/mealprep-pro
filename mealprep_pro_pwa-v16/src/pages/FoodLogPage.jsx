import { useEffect, useMemo, useState } from "react";
import { listFoodLogsByDate, deleteFoodLogEntry } from "../lib/foodLog";

function toDateOnlyUTC(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function addDaysUTC(dateStr, deltaDays) {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

export default function FoodLogPage() {
  const [dateStr, setDateStr] = useState(toDateOnlyUTC());
  const [entries, setEntries] = useState([]); // ALWAYS array
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState("");

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
        acc.calories += Number(e?.calories || 0);
        acc.protein += Number(e?.protein || 0);
        acc.carbs += Number(e?.carbs || 0);
        acc.fat += Number(e?.fat || 0);
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [entries]);

  async function handleDelete(id) {
    if (!id) return;
    if (!confirm("Delete this entry?")) return;

    try {
      setDeletingId(id);
      await deleteFoodLogEntry(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      alert(err?.message || "Failed to delete entry.");
    } finally {
      setDeletingId("");
    }
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <button
          className="px-3 py-2 rounded bg-gray-100"
          onClick={() => setDateStr(addDaysUTC(dateStr, -1))}
        >
          Prev
        </button>

        <div className="font-semibold">{dateStr}</div>

        <button
          className="px-3 py-2 rounded bg-gray-100"
          onClick={() => setDateStr(addDaysUTC(dateStr, 1))}
        >
          Next
        </button>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2 text-sm">
        <div className="p-2 rounded bg-gray-50">
          <div className="text-gray-500">Calories</div>
          <div className="font-semibold">{Math.round(totals.calories)}</div>
        </div>

        <div className="p-2 rounded bg-gray-50">
          <div className="text-gray-500">Protein</div>
          <div className="font-semibold">{Math.round(totals.protein)}g</div>
        </div>

        <div className="p-2 rounded bg-gray-50">
          <div className="text-gray-500">Carbs</div>
          <div className="font-semibold">{Math.round(totals.carbs)}g</div>
        </div>

        <div className="p-2 rounded bg-gray-50">
          <div className="text-gray-500">Fat</div>
          <div className="font-semibold">{Math.round(totals.fat)}g</div>
        </div>
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="text-gray-500">Loading…</div>
        ) : error ? (
          <div className="text-red-600 text-sm">{error}</div>
        ) : entries.length === 0 ? (
          <div className="text-gray-500">No entries for this day.</div>
        ) : (
          <ul className="space-y-2">
            {entries.map((e) => (
              <li key={e.id} className="p-3 rounded border">
                <div className="flex items-center justify-between">
                  <div className="font-medium">
                    {e.meal_type} · {e.name}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-xs text-gray-500">
                      {e.created
                        ? new Date(e.created).toLocaleTimeString([], {
                            hour: "numeric",
                            minute: "2-digit",
                          })
                        : ""}
                    </div>

                    <button
                      onClick={() => handleDelete(e.id)}
                      disabled={deletingId === e.id}
                      className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
                    >
                      {deletingId === e.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>

                <div className="mt-1 text-sm text-gray-600">
                  {e.calories ?? 0} cal · P {e.protein ?? 0}g · C {e.carbs ?? 0}g · F{" "}
                  {e.fat ?? 0}g
                  {e.servings ? ` · ${e.servings} servings` : ""}
                </div>

                {e.notes ? <div className="mt-2 text-sm">{e.notes}</div> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
