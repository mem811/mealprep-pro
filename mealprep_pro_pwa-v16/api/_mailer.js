import nodemailer from 'nodemailer';

// Sends email through the Gmail account set in Vercel (SMTP_USER / SMTP_PASS).
// Returns false without sending if those aren't set yet.
export async function sendMail(message) {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) return false;
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user, pass },
  });
  await transporter.sendMail({ from: `"MealPrep Pro" <${user}>`, ...message });
  return true;
}

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Branded email shell matching the app (emerald green, rounded card)
export function brandedHtml({ heading, bodyHtml, buttonText, buttonUrl }) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f3f4f6;font-family:Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:24px;overflow:hidden;">
<tr><td style="background:#10b981;padding:28px 32px;text-align:center;color:#ffffff;font-size:22px;font-weight:bold;">🥗 MealPrep Pro</td></tr>
<tr><td style="padding:32px;color:#374151;font-size:16px;line-height:1.6;">
<h1 style="margin:0 0 16px;font-size:22px;color:#111827;">${esc(heading)}</h1>
${bodyHtml}
${buttonUrl ? `<p style="text-align:center;margin:28px 0 8px;"><a href="${buttonUrl}" style="display:inline-block;background:#10b981;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 28px;border-radius:14px;">${esc(buttonText)}</a></p>` : ''}
</td></tr>
<tr><td style="padding:20px 32px;border-top:1px solid #f3f4f6;color:#9ca3af;font-size:12px;text-align:center;">
Elise Cellucci, LLC · Pennsylvania, USA<br>
<a href="https://mealplanner.cloud/contact" style="color:#10b981;">Contact us</a> · <a href="https://mealplanner.cloud/privacy" style="color:#10b981;">Privacy</a>
</td></tr></table></td></tr></table></body></html>`;
}

export { esc };
