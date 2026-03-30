import pb from "./pb";

export async function listFoodLogsByDate(dateStr) {
  // dateStr like "2026-03-30"
  const start = new Date(`${dateStr}T00:00:00.000Z`).toISOString();
  const end = new Date(`${dateStr}T00:00:00.000Z`);
  end.setUTCDate(end.getUTCDate() + 1);

  return pb.collection("food_log").getList(1, 500, {
    sort: "-created",
    filter: `date >= "${start}" && date < "${end.toISOString()}"`,
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
