import { useEffect, useMemo, useState } from "react";
import { listFoodLogsByDate } from "../lib/foodLog";

function toDateOnlyLocal(date = new Date()) {
  // local date -> YYYY-MM-DD
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(dateStr, deltaDays) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + deltaDays);
  return toDateOnlyLocal(d);
}

export default function FoodLogPage() {
  const [dateStr, setDateStr] = useState(toDateOnlyLocal());
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function run() {
      setLoading(true);
      try {
        const rows = await listFoodLogsByDate(dateStr);
        if (alive) setEntries(rows);
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
        acc.calories += Number(e.calories || 0);
        acc.protein += Number(e.protein || 0);
        acc.carbs += Number(e.carbs || 0);
        acc.fat += Number(e.fat || 0);
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [entries]);

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <button
          className="px-3 py-2 rounded bg-gray-100"
          onClick={() => setDateStr(addDays(dateStr, -1))}
        >
          Prev
        </button>

        <div className="font-semibold">{dateStr}</div>

        <button
          className="px-3 py-2 rounded bg-gray-100"
          onClick={() => setDateStr(addDays(dateStr, 1))}
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
                  <div className="text-xs text-gray-500">
                    {new Date(e.created).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
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
