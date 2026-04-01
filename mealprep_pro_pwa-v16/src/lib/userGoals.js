import pb from "./pb";

export async function getUserGoals() {
  try {
    const userId = pb.authStore.model?.id;
    if (!userId) return null;
    const res = await pb.collection("user_goals").getFirstListItem(`user="${userId}"`);
    return res;
  } catch {
    return null;
  }
}

export async function saveUserGoals(data) {
  const userId = pb.authStore.model?.id;
  if (!userId) throw new Error("Not signed in.");
  const existing = await getUserGoals();
  if (existing) {
    return await pb.collection("user_goals").update(existing.id, data);
  } else {
    return await pb.collection("user_goals").create({ ...data, user: userId });
  }
}