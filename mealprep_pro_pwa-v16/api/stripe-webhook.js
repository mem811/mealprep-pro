import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const config = {
  api: {
    bodyParser: false, // Stripe needs the raw body to verify the signature
  },
};

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
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

  if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
  const userId = session.metadata?.userId;

  if (userId) {
    try {
      // Step 1: Get PocketBase admin token
      const authRes = await fetch(
        `${process.env.POCKETBASE_URL}/api/admins/auth-with-password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identity: process.env.POCKETBASE_ADMIN_EMAIL,
            password: process.env.POCKETBASE_ADMIN_PASSWORD,
          }),
        }
      );
      const { token } = await authRes.json();

      // Step 2: Update user plan to pro
      const pbRes = await fetch(
        `${process.env.POCKETBASE_URL}/api/collections/users/records/${userId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ plan: 'pro' }),
        }
      );

      if (!pbRes.ok) {
        const err = await pbRes.json();
        console.error('PocketBase update failed:', err);
        return res.status(500).json({ error: 'Failed to update user plan' });
      }

      console.log(`User ${userId} upgraded to Pro`);
    } catch (err) {
      console.error('Error updating PocketBase:', err);
      return res.status(500).json({ error: err.message });
    }
  }
}

res.status(200).json({ received: true });
}
    }
  }

  res.status(200).json({ received: true });
}
