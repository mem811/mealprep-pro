// Shared helper for server functions that need PocketBase superuser access.
// Files starting with "_" in /api are not exposed as routes by Vercel.

const PB = () => process.env.POCKETBASE_URL;

export async function adminToken() {
  const res = await fetch(`${PB()}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identity: process.env.POCKETBASE_ADMIN_EMAIL,
      password: process.env.POCKETBASE_ADMIN_PASSWORD,
    }),
  });
  if (!res.ok) throw new Error('PocketBase admin login failed');
  const { token } = await res.json();
  return token;
}

export async function pbFetch(path, token, options = {}) {
  return fetch(`${PB()}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
}
