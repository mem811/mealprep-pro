import { Link } from 'react-router-dom';
import LegalLayout, { COMPANY, EFFECTIVE_DATE } from '../components/LegalLayout';

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service">
      <p className="text-sm text-gray-500">Effective {EFFECTIVE_DATE}</p>

      <p>
        These terms are an agreement between you and {COMPANY} ("we", "us") for your use of
        MealPrep Pro at mealplanner.cloud (the "App"). By creating an account or using the App,
        you agree to these terms and our <Link to="/privacy">Privacy Policy</Link>.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>You must be at least 13 years old to use the App.</li>
        <li>Give accurate information and keep your password safe. You are responsible for activity on your account.</li>
        <li>You can delete your account at any time from the Profile page.</li>
      </ul>

      <h2>Free and Pro plans</h2>
      <ul>
        <li>The free plan is free. MealPrep Pro is a paid subscription, billed monthly or yearly at the price shown when you sign up.</li>
        <li>New Pro subscriptions may start with a free trial. Unless you cancel before the trial ends, you will be charged when it ends.</li>
        <li><strong>Subscriptions renew automatically</strong> at the end of each billing period until you cancel.</li>
        <li>You can cancel at any time. You keep Pro until the end of the period you have paid for, and you will not be charged again.</li>
        <li>Except where the law requires otherwise, payments are non-refundable and we do not give refunds for partial periods.</li>
        <li>If we change prices, we will tell you in advance, and the new price applies from your next billing period.</li>
        <li>Payments are handled by Stripe and are also subject to Stripe's terms.</li>
      </ul>

      <h2>Your content</h2>
      <p>
        You own the recipes, plans and other content you add. You give us permission to store and
        process it only so we can run the App for you. Only add content you have the right to use.
      </p>

      <h2>Acceptable use</h2>
      <p>Please do not misuse the App. For example, do not:</p>
      <ul>
        <li>try to access other people's accounts or data, or interfere with the App's security;</li>
        <li>use bots or scripts to overload, scrape or copy the App;</li>
        <li>use the App for anything illegal.</li>
      </ul>
      <p>We may suspend or close accounts that break these terms.</p>

      <h2>Nutrition information is not medical advice</h2>
      <p>
        Nutrition values, calorie counts and points shown in the App are estimates from recipes,
        product databases and third-party services, and may be inaccurate. The App is for general
        meal planning only. It is not medical, dietary or health advice. Talk to a doctor or
        registered dietitian about your health, allergies or dietary needs, and always check food
        labels.
      </p>

      <h2>The service</h2>
      <p>
        We work to keep the App running and improving, but we may change, pause or stop features.
        If we ever shut down the App, we will give you reasonable notice so you can save your
        information.
      </p>

      <h2>Disclaimers and limits of liability</h2>
      <p>
        The App is provided "as is" and "as available", without warranties of any kind, to the
        fullest extent the law allows. To the fullest extent the law allows, {COMPANY} is not
        liable for indirect, incidental or consequential damages, or for loss of data or profits.
        Our total liability for any claim relating to the App is limited to the amount you paid us
        in the 12 months before the claim.
      </p>

      <h2>Governing law</h2>
      <p>
        These terms are governed by the laws of the Commonwealth of Pennsylvania, USA. Any dispute
        will be handled in the state or federal courts located in Pennsylvania.
      </p>

      <h2>Changes to these terms</h2>
      <p>
        We may update these terms. If we make important changes, we will update the date above and
        let you know in the App or by email. Continuing to use the App means you accept the new
        terms.
      </p>

      <h2>Contact us</h2>
      <p>
        {COMPANY}, Pennsylvania, USA. Reach us through our <Link to="/contact">contact form</Link>.
      </p>
    </LegalLayout>
  );
}
