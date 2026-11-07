import { Link } from 'react-router-dom';
import LegalLayout from '../components/LegalLayout';
import { FREE_RECIPE_LIMIT } from '../lib/plans';

// Customer guide. Keep the wording in step with the button labels in the app.

const Step = ({ n, title, children }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex gap-4">
    <div className="w-8 h-8 shrink-0 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center">{n}</div>
    <div className="space-y-1">
      <h3 className="font-bold text-gray-900">{title}</h3>
      <div className="text-gray-600">{children}</div>
    </div>
  </div>
);

export default function HelpPage() {
  return (
    <LegalLayout title="How to use MealPrep Pro">
      <p>Plan your week in three steps: save recipes, put them on your planner, and shop from the list it makes for you.</p>

      <div className="space-y-3 not-prose">
        <Step n={1} title="Save your recipes">
          Go to <strong>Recipes</strong> and tap <strong>+ Add Recipe</strong>. Type it in, or paste the recipe text and let the app fill in the form for you.
        </Step>
        <Step n={2} title="Plan your week">
          On a recipe, tap <strong>Add to Planner</strong>, then pick the day and meal. Or tap <strong>+</strong> on any day in the <strong>Planner</strong>.
        </Step>
        <Step n={3} title="Shop from your list">
          Open <strong>Grocery</strong>. Every ingredient for the week is added up and sorted by aisle. Tick items off as you shop.
        </Step>
      </div>

      <h2>Recipes</h2>
      <ul>
        <li><strong>Add a recipe:</strong> Recipes → <strong>+ Add Recipe</strong>. Only the title is required.</li>
        <li><strong>Paste recipe text:</strong> copy a recipe from anywhere, tap <strong>Paste recipe text</strong> and the ingredients and steps are filled in for you. Check them over, then save.</li>
        <li><strong>Find a recipe:</strong> use the search box, or sort by highest rated, quickest cook time or calories.</li>
        <li><strong>Favorites and ratings:</strong> tap the heart to favorite a recipe. Open it to give it stars and add your own notes, like swaps or what the family thought.</li>
        <li><strong>Nutrition:</strong> on a recipe, tap <strong>Get from website</strong> or <strong>Calculate from Ingredients</strong> to see calories, protein, carbs and fat per serving.</li>
        <li><strong>Print:</strong> open a recipe and tap the printer icon.</li>
      </ul>

      <h2>Planner</h2>
      <ul>
        <li>Your week shows breakfast, lunch, dinner and snack for each day. Use the arrows to move between weeks.</li>
        <li><strong>Batch size:</strong> when you add a recipe, use <strong>−</strong> and <strong>+</strong> to make half, double or more. The grocery list and nutrition update to match.</li>
        <li><strong>✅ Ate this:</strong> tap it under a planned meal to add it to your Food Log in one step.</li>
      </ul>

      <h2>Grocery list</h2>
      <ul>
        <li>Built automatically from the meals on your planner for that week. There's nothing to type.</li>
        <li>The same ingredient from different recipes is combined into one line with the total amount.</li>
        <li>Tap an item to tick it off. Your ticks are saved, so you can close the app and come back.</li>
        <li>Use the arrows to see next week's list, or tap <strong>Print</strong> for a paper copy of what you still need.</li>
      </ul>

      <h2>Food Log</h2>
      <ul>
        <li>See what you ate each day with totals for calories, protein, carbs and fat.</li>
        <li>Add food by tapping <strong>✅ Ate this</strong> on the planner, picking from your <strong>Food Library</strong>, <strong>scanning a barcode</strong> with your phone camera, or typing it in yourself.</li>
        <li>Set your daily targets under Profile → <strong>Daily Nutritional Goals</strong> to see how each day compares.</li>
      </ul>
      <p className="text-sm text-gray-500">Nutrition numbers are estimates. See our <Link to="/terms">Terms</Link>.</p>

      <h2>Put it on your phone's home screen</h2>
      <p>MealPrep Pro works in your browser, and you can add it to your home screen so it opens like an app.</p>
      <ul>
        <li><strong>iPhone (Safari):</strong> tap the Share button, then <strong>Add to Home Screen</strong>.</li>
        <li><strong>Android (Chrome):</strong> tap the ⋮ menu, then <strong>Add to Home screen</strong> or <strong>Install app</strong>.</li>
      </ul>

      <h2>Pro features</h2>
      <ul>
        <li><strong>Unlimited recipes.</strong> The Free plan holds {FREE_RECIPE_LIMIT}.</li>
        <li><strong>Import from any recipe website:</strong> on Add Recipe, paste the recipe's web address and tap <strong>Import</strong>.</li>
        <li><strong>Save button for your browser:</strong> on a computer, drag the Save button from the Add Recipe page to your bookmarks bar. On any recipe website, click it and the recipe comes straight into MealPrep Pro.</li>
      </ul>
      <p>
        Try Pro free for 14 days from your <Link to="/app/profile">Profile</Link>. No card is needed for the trial.
        To update your card, see invoices or cancel, go to Profile → <strong>Manage subscription</strong>.
      </p>

      <h2>Your account</h2>
      <ul>
        <li><strong>Forgot your password?</strong> On the sign-in page, tap <strong>Forgot password?</strong> and we'll email you a link.</li>
        <li><strong>Delete your account:</strong> Profile → <strong>Delete my account</strong>. This removes your recipes, plans and logs for good and cancels any subscription.</li>
      </ul>

      <h2>Still stuck?</h2>
      <p>Send us a message through the <Link to="/contact">contact form</Link> and we'll reply by email.</p>
    </LegalLayout>
  );
}
