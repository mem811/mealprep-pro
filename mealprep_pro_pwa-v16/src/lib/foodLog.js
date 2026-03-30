import pb from "./pb";

export async function listFoodLogsByDate(dateStr) {
  // dateStr like "2026-03-30" (LOCAL day)
  const startLocal = new Date(`${dateStr}T00:00:00`); // local midnight
  const endLocal = new Date(`${dateStr}T00:00:00`);
  endLocal.setDate(endLocal.getDate() + 1); // next local midnight

  return pb.collection("food_log").getList(1, 500, {
    sort: "-created",
    filter: `date >= "${startLocal.toISOString()}" && date < "${endLocal.toISOString()}"`,
    expand: "recipe",
  });
}

export async function createFoodLogEntry(data) {
  // Expect data.dateStr like "YYYY-MM-DD"
  // Store as local noon to avoid timezone day-shifts
  const dateStr = data.dateStr || data.date; // depending on what you’re currently sending
  const localNoon = new Date(`${dateStr}T12:00:00`); // LOCAL 12:00
  const payload = {
    ...data,
    date: localNoon.toISOString(),
  };

  delete payload.dateStr; // keep only "date" for PB
  return pb.collection("food_log").create(payload);
}

export async function deleteFoodLogEntry(id) {
  return pb.collection("food_log").delete(id);
}
