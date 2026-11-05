import Stripe from 'stripe';
import { currentUser } from './_pbAdmin.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Opens Stripe's hosted page where customers update their card,
// see invoices, or cancel.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await currentUser(req);
  if (!user) return res.status(401).json({ error: 'Please sign in again.' });

  try {
    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const found = await stripe.subscriptions.search({ query: `metadata['userId']:'${user.id}'` });
      customerId = found.data[0]?.customer;
    }
    if (!customerId) {
      return res.status(404).json({ error: "We couldn't find a subscription for this account. Contact us if you think this is wrong." });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: 'https://mealplanner.cloud/app/profile',
    });
    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Billing portal failed:', err);
    return res.status(500).json({ error: 'Could not open subscription settings. Please try again.' });
  }
}
