import pb from './pb';

// Free plan allowance (keep in sync with the pricing table)
export const FREE_RECIPE_LIMIT = 15;

export const isProUser = () => pb.authStore.model?.plan === 'pro';

// How many recipes the signed-in user has saved
export async function countMyRecipes() {
  const userId = pb.authStore.model?.id;
  if (!userId) return 0;
  const res = await pb.collection('recipes').getList(1, 1, {
    filter: `user = "${userId}"`,
    fields: 'id',
  });
  return res.totalItems;
}
