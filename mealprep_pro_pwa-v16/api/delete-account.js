import Stripe from 'stripe';
import { adminToken, pbFetch, currentUser } from './_pbAdmin.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Everything a user owns. meal_slots go first because they hang off meal_plans.
// food_library is a shared barcode database, so it is left alone.
// Order matters: records that point at recipes/meal plans are removed before them.
const USER_DATA = [
  ['meal_slots', 'meal_plan.user'],
  ['food_log', 'user'],
  ['grocery_checks', 'user'],
  ['meal_plans', 'user'],
  ['recipes', 'user'],
  ['user_goals', 'user'],
  ['User_goals', 'user'],
  ['pins', 'user'],
];

async function deleteAllMatching(collection, field, userId, token) {
  const filter = encodeURIComponent(`${field}="${userId}"`);
  // Keep taking the first page until it is empty (deleting shifts the pages)
  for (let guard = 0; guard < 100; guard++) {
    const res = await pbFetch(
      `/api/collections/${collection}/records?perPage=200&fields=id&filter=${filter}`,
      token
    );
    // Collection missing or has no such field: nothing of theirs to delete
    if (res.status === 400 || res.status === 404) return;
    if (!res.ok) throw new Error(`Could not list ${collection}`);
    const { items } = await res.json();
    if (!items.length) return;
    for (const { id } of items) {
      const del = await pbFetch(`/api/collections/${collection}/records/${id}`, token, { method: 'DELETE' });
      if (!del.ok && del.status !== 404) throw new Error(`Could not delete from ${collection}`);
    }
  }
}

async function cancelSubscriptions(userId, customerId) {
  const subs = new Map();
  const found = await stripe.subscriptions.search({ query: `metadata['userId']:'${userId}'` });
  found.data.forEach((s) => subs.set(s.id, s));
  if (customerId) {
    const byCustomer = await stripe.subscriptions.list({ customer: customerId, status: 'all' });
    byCustomer.data.forEach((s) => subs.set(s.id, s));
  }
  for (const s of subs.values()) {
    if (!['canceled', 'incomplete_expired'].includes(s.status)) {
      await stripe.subscriptions.cancel(s.id);
    }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Confirm who is asking, using the user's own login token
  const user = await currentUser(req);
  if (!user) return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });

  try {
    // Stop billing first, so nobody is charged for a deleted account
    await cancelSubscriptions(user.id, user.stripe_customer_id);

    const token = await adminToken();
    for (const [collection, field] of USER_DATA) {
      await deleteAllMatching(collection, field, user.id, token);
    }

    const del = await pbFetch(`/api/collections/users/records/${user.id}`, token, { method: 'DELETE' });
    if (!del.ok && del.status !== 404) throw new Error('Could not delete the account');

    return res.status(200).json({ deleted: true });
  } catch (err) {
    console.error('Delete account failed:', err);
    return res.status(500).json({ error: 'Something went wrong deleting your account. Please contact us.' });
  }
}
