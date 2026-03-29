import pb from "./pb";

// Use date-only string: "YYYY-MM-DD"
export async function listFoodLogsByDate(dateStr) {
  return pb.collection("food_log").getFullList({
    filter: `date = "${dateStr}"`,
    sort: "created",            // timeline order (oldest -> newest)
    expand: "recipe",           // optional, if you want recipe details later
  });
}

export async function createFoodLogEntry(data) {
  // Do NOT send logged_at. PocketBase uses `created`.
  return pb.collection("food_log").create(data);
}

export async function deleteFoodLogEntry(id) {
  return pb.collection("food_log").delete(id);
}
