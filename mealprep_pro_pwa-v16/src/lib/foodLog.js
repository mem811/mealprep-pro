import pb from "./pb";

function toPbDateTimeString(d) {
  // Convert "2026-03-30T00:00:00.000Z" -> "2026-03-30 00:00:00.000Z"
  return d.toISOString().replace("T", " ");
}

export async function listFoodLogsByDate(dateStr) {
  const start = new Date(`${dateStr}T00:00:00.000Z`);
  const end = new Date(`${dateStr}T00:00:00.000Z`);
  end.setUTCDate(end.getUTCDate() + 1);

  const startStr = toPbDateTimeString(start);
  const endStr = toPbDateTimeString(end);

  return pb.collection("food_log").getList(1, 500, {
    sort: "-created",
    filter: `date >= "${startStr}" && date < "${endStr}"`,
    expand: "recipe",
  });
}
/**
 * Create a food log entry.
 * For later (when you add an in-app entry form):
 * - pass dateStr: "YYYY-MM-DD"
 * - we store it at UTC noon so it never shifts days across timezones
 */
export async function createFoodLogEntry(data) {
  // allow either { dateStr } or { date }
  const dateStr = data.dateStr || data.date;

  // store at UTC noon for stability across timezones
  const utcNoonIso = new Date(`${dateStr}T12:00:00.000Z`).toISOString();

  const payload = {
    ...data,
    date: utcNoonIso,
  };

  delete payload.dateStr;

  return pb.collection("food_log").create(payload);
}

export async function deleteFoodLogEntry(id) {
  return pb.collection("food_log").delete(id);
}
