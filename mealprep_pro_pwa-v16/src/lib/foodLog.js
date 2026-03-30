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
  // Do NOT send logged_at. PocketBase uses `created`.
  return pb.collection("food_log").create(data);
}

export async function deleteFoodLogEntry(id) {
  return pb.collection("food_log").delete(id);
}
