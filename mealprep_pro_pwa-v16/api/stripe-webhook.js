import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const config = {
  api: {
    bodyParser: false,
  },
};

// Subscription statuses that keep Pro switched on.
// past_due = Stripe is still retrying a failed card, so give them the grace period.
// Anything else (canceled, unpaid, incomplete_expired, paused...) drops back to free.
const PRO_STATUSES = ['trialing', 'active', 'past_due'];

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function setUserPlan(userId, plan, customerId) {
  const authRes = await fetch(
    `${process.env.POCKETBASE_URL}/api/collections/_superusers/auth-with-password`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identity: process.env.POCKETBASE_ADMIN_EMAIL,
        password: process.env.POCKETBASE_ADMIN_PASSWORD,
      }),
    }
  );
  if (!authRes.ok) throw new Error('PocketBase admin login failed');
  const { token } = await authRes.json();

  const body = { plan };
  if (customerId) body.stripe_customer_id = customerId;

  const pbRes = await fetch(
    `${process.env.POCKETBASE_URL}/api/collections/users/records/${userId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    }
  );
  if (!pbRes.ok) {
    const err = await pbRes.json().catch(() => ({}));
    throw new Error(`PocketBase update failed: ${JSON.stringify(err)}`);
  }
  console.log(`User ${userId} set to ${plan}`);
}

// Look up the subscription fresh from Stripe so events arriving out of order
// can't leave someone on the wrong plan.
async function syncFromSubscription(subscriptionId) {
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const userId = sub.metadata?.userId;
  if (!userId) {
    console.warn(`Subscription ${subscriptionId} has no userId; skipping`);
    return;
  }
  const plan = PRO_STATUSES.includes(sub.status) ? 'pro' : 'free';
  await setUserPlan(userId, plan, sub.customer);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawBody = await getRawBody(req);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  try {
    const obj = event.data.object;

    switch (event.type) {
      // Checkout finished (trial started or first payment)
      case 'checkout.session.completed':
        if (obj.subscription) {
          await syncFromSubscription(obj.subscription);
        } else if (obj.metadata?.userId) {
          await setUserPlan(obj.metadata.userId, 'pro', obj.customer);
        }
        break;

      // Subscription started, changed, cancelled, or ended
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await syncFromSubscription(obj.id);
        break;

      // Card failed or a renewal was paid: re-check the subscription status
      case 'invoice.payment_failed':
      case 'invoice.paid':
        if (obj.subscription) await syncFromSubscription(obj.subscription);
        break;

      default:
        break;
    }
  } catch (err) {
    console.error(`Error handling ${event.type}:`, err);
    // 500 tells Stripe to retry later
    return res.status(500).json({ error: err.message });
  }

  return res.status(200).json({ received: true });
}
