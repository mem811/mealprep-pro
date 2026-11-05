import { adminToken, pbFetch } from './_pbAdmin.js';

// Messages are saved to a PocketBase collection only superusers can read,
// so no email address is ever published on the site.
const COLLECTION = 'contact_messages';

const COLLECTION_SCHEMA = {
  name: COLLECTION,
  type: 'base',
  listRule: null,
  viewRule: null,
  createRule: null,
  updateRule: null,
  deleteRule: null,
  fields: [
    { name: 'name', type: 'text', max: 200 },
    { name: 'email', type: 'email', required: true },
    { name: 'topic', type: 'text', max: 100 },
    { name: 'message', type: 'text', required: true, max: 5000 },
    { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
  ],
};

async function saveMessage(token, data) {
  return pbFetch(`/api/collections/${COLLECTION}/records`, token, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name = '', email = '', topic = '', message = '', website = '' } = req.body || {};

  // Hidden "website" field: real people never fill it in, spam bots do
  if (website) return res.status(200).json({ sent: true });

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || message.trim().length < 5) {
    return res.status(400).json({ error: 'Please enter a valid email and a message.' });
  }

  const data = {
    name: String(name).slice(0, 200),
    email: String(email).slice(0, 200),
    topic: String(topic).slice(0, 100),
    message: String(message).slice(0, 5000),
  };

  try {
    const token = await adminToken();
    let saved = await saveMessage(token, data);

    // First message ever: create the private collection, then save again
    if (saved.status === 404) {
      await pbFetch('/api/collections', token, {
        method: 'POST',
        body: JSON.stringify(COLLECTION_SCHEMA),
      });
      saved = await saveMessage(token, data);
    }
    if (!saved.ok) throw new Error(`Save failed with ${saved.status}`);

    return res.status(200).json({ sent: true });
  } catch (err) {
    console.error('Contact form failed:', err);
    return res.status(500).json({ error: 'Sorry, your message could not be sent. Please try again later.' });
  }
}
