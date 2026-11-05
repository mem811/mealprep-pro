import { currentUser } from './_pbAdmin.js';
import { sendMail, brandedHtml, esc } from './_mailer.js';

// Sends the welcome email right after sign-up. Only for brand-new accounts
// (created in the last 15 minutes), so it can't be used to send repeats.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await currentUser(req);
  if (!user) return res.status(401).json({ error: 'Not signed in' });

  const created = new Date(String(user.created).replace(' ', 'T'));
  if (!(Date.now() - created.getTime() < 15 * 60 * 1000)) {
    return res.status(200).json({ sent: false });
  }

  const firstName = (user.name || '').trim().split(/\s+/)[0] || 'there';

  try {
    const sent = await sendMail({
      to: user.email,
      subject: 'Welcome to MealPrep Pro 🥗',
      text:
`Hi ${firstName},

Welcome to MealPrep Pro! Here's how to get going:

1. Add a few recipes you love (or import them from any recipe site with Pro).
2. Drop them into your weekly planner.
3. Your grocery list builds itself, sorted and ready for the store.

Start planning: https://mealplanner.cloud/app

Questions? Reach us anytime: https://mealplanner.cloud/contact

Happy planning!
MealPrep Pro`,
      html: brandedHtml({
        heading: `Welcome, ${firstName}!`,
        bodyHtml: `<p style="margin:0 0 12px;">Thanks for joining MealPrep Pro. Here's how to get going:</p>
<ol style="margin:0 0 12px;padding-left:20px;">
<li style="margin-bottom:6px;"><strong>Add a few recipes</strong> you love (or import them from any recipe site with Pro).</li>
<li style="margin-bottom:6px;"><strong>Drop them into your weekly planner.</strong></li>
<li><strong>Your grocery list builds itself</strong>, sorted and ready for the store.</li>
</ol>
<p style="margin:0;">Questions? Just use our <a href="https://mealplanner.cloud/contact" style="color:#10b981;">contact form</a>. We read every message.</p>`,
        buttonText: 'Start planning',
        buttonUrl: 'https://mealplanner.cloud/app',
      }),
    });
    return res.status(200).json(sent ? { sent } : { sent, reason: 'SMTP_USER / SMTP_PASS not set in Vercel' });
  } catch (err) {
    console.error('Welcome email failed:', err);
    // Short error code only (e.g. EAUTH = Gmail refused the login), never the password
    return res.status(200).json({ sent: false, reason: err.code || 'send failed',
      // TEMP diagnostic: which login Vercel is using (never the password itself)
      smtpUser: (process.env.SMTP_USER || '').trim(),
      smtpPassLength: (process.env.SMTP_PASS || '').replace(/\s+/g, '').length,
      env: process.env.VERCEL_ENV,
    });
  }
}
