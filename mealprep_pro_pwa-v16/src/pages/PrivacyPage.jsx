import { Link } from 'react-router-dom';
import LegalLayout, { COMPANY, EFFECTIVE_DATE } from '../components/LegalLayout';

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy">
      <p className="text-sm text-gray-500">Effective {EFFECTIVE_DATE}</p>

      <p>
        MealPrep Pro at mealplanner.cloud (the "App") is run by {COMPANY}, a Pennsylvania, USA
        company ("we", "us"). This policy explains what information we collect, how we use it,
        and the choices you have.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li><strong>Account details:</strong> your name, email address and password. Passwords are stored encrypted; we can never see them.</li>
        <li><strong>Your content:</strong> the recipes, meal plans, grocery lists, food log entries and nutrition goals you add.</li>
        <li><strong>Subscription details:</strong> your plan and a customer reference from our payment provider. We never see or store your full card number.</li>
        <li><strong>Messages:</strong> anything you send us through the contact form.</li>
        <li><strong>Technical information:</strong> basic data your browser sends automatically (such as IP address and browser type) that our hosting providers use to run and secure the service.</li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To run the App: save your plans, build grocery lists and show nutrition estimates.</li>
        <li>To manage your account and subscription, including password reset emails.</li>
        <li>To answer your questions and keep the App secure.</li>
      </ul>
      <p>We do not sell your personal information, and we do not show ads or use advertising trackers.</p>

      <h2>Services we share data with</h2>
      <p>We use trusted providers only as needed to run the App:</p>
      <ul>
        <li><strong>Stripe</strong> processes payments.</li>
        <li><strong>Vercel</strong> hosts the website.</li>
        <li><strong>Our database server</strong> stores your account and content.</li>
        <li><strong>Google</strong> delivers our emails and provides the fonts used on the site.</li>
        <li><strong>Spoonacular</strong> receives recipe links or titles you choose to import, to fetch recipe and nutrition details.</li>
        <li><strong>Open Food Facts</strong> receives product barcodes you scan, to look up nutrition information. Barcode scanning happens on your device; we do not store camera images.</li>
      </ul>
      <p>
        Foods you add by barcode may be saved to a shared food library (product name, brand and
        nutrition only, never your personal details) so other users can find them faster.
      </p>
      <p>We may also share information if the law requires it, or to protect the rights and safety of our users.</p>

      <h2>Cookies and local storage</h2>
      <p>
        We store a login token in your browser so you stay signed in, and the App may be saved to
        your device so it works offline. We do not use advertising or analytics cookies.
      </p>

      <h2>How long we keep it</h2>
      <p>
        We keep your information while your account is open. When you delete your account, we
        delete your account and content right away. Payment records may be kept by Stripe as
        required for tax and accounting.
      </p>

      <h2>Your choices and rights</h2>
      <ul>
        <li><strong>See and edit</strong> your information at any time in the App.</li>
        <li><strong>Delete your account</strong> from the Profile page. This also cancels any subscription.</li>
        <li><strong>Ask us</strong> for a copy of your data, or anything else about your privacy, using the <Link to="/contact">contact form</Link>.</li>
      </ul>
      <p>
        Depending on where you live (for example California, or the EU and UK), you may have
        additional rights, such as to access, correct, delete or move your data, or to object to
        how we use it. We honor these requests for all users, wherever they live.
      </p>

      <h2>Security</h2>
      <p>
        We use encrypted connections (HTTPS) and limit access to your data to you and the
        services listed above. No online service can be 100% secure, but we work to protect your
        information.
      </p>

      <h2>Children</h2>
      <p>The App is not meant for children under 13, and we do not knowingly collect their information.</p>

      <h2>Changes to this policy</h2>
      <p>
        If we make important changes, we will update the date above and let you know in the App or
        by email.
      </p>

      <h2>Contact us</h2>
      <p>
        {COMPANY}, Pennsylvania, USA. Reach us through our <Link to="/contact">contact form</Link>.
      </p>
    </LegalLayout>
  );
}
