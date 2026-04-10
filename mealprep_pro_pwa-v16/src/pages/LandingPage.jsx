import PricingTable from '../components/landing/PricingTable';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user) navigate('/app');
  }, [user]);

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">

      {/* NAV */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
        <span className="text-xl font-bold text-emerald-600">🥗 Mealplanner.cloud</span>
        <div className="flex gap-4 items-center">
          <a href="/auth" className="text-sm text-gray-500 hover:text-gray-800">Log in</a>
          <a href="/auth" className="text-sm bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700">
            Get started free
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section className="text-center px-6 py-20 max-w-3xl mx-auto">
        <h1 className="text-5xl font-bold leading-tight mb-4">
          Plan your meals.<br />Skip the stress.
        </h1>
        <p className="text-xl text-gray-500 mb-8">
          Save your recipes, build your week, and get a ready-to-shop grocery list — in minutes.
        </p>
        <a
          href="/auth"
          className="inline-block bg-emerald-600 text-white text-lg px-8 py-4 rounded-xl hover:bg-emerald-700 transition"
        >
          Start free → no credit card required
        </a>
      </section>

      {/* PROBLEM */}
      <section className="bg-gray-50 px-6 py-16 text-center">
        <div className="max-w-2xl mx-auto">
          <p className="text-2xl font-semibold mb-4">
            You know what you want to cook. You just never have a plan.
          </p>
          <p className="text-gray-500 text-lg">
            Every Sunday you stare into the fridge, forget half your groceries, and end up ordering
            takeout by Thursday anyway. Most meal planning apps are bloated fitness trackers — built
            for fitness bros, not real home cooks.
          </p>
          <p className="text-emerald-600 font-bold text-xl mt-6">Mealplanner.cloud fixes that.</p>
        </div>
      </section>

      {/* FEATURES WITH SCREENSHOTS */}
      <section className="px-6 py-20 max-w-5xl mx-auto space-y-24">
        <h2 className="text-3xl font-bold text-center">How it works</h2>

        <div className="flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1">
            <div className="text-3xl mb-3">📅</div>
            <h3 className="text-2xl font-bold mb-3">Plan your week in seconds</h3>
            <p className="text-gray-500 text-lg">Drag your favorite recipes onto a simple weekly grid — breakfast, lunch, dinner. Change your mind? Just drag again.</p>
          </div>
          <div className="flex-1">
            <img src="/screenshot-planner.png" alt="Meal planner" className="rounded-2xl shadow-xl w-full" />
          </div>
        </div>

        <div className="flex flex-col md:flex-row-reverse items-center gap-12">
          <div className="flex-1">
            <div className="text-3xl mb-3">🗂</div>
            <h3 className="text-2xl font-bold mb-3">Save your recipes, your way</h3>
            <p className="text-gray-500 text-lg">Add recipes manually or import straight from any website with one click. Organized, searchable, forever yours.</p>
          </div>
          <div className="flex-1">
            <img src="/screenshot-recipes.png" alt="Recipe library" className="rounded-2xl shadow-xl w-full" />
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1">
            <div className="text-3xl mb-3">🛒</div>
            <h3 className="text-2xl font-bold mb-3">Grocery list, auto-generated</h3>
            <p className="text-gray-500 text-lg">Every ingredient from every meal, combined and sorted by category. No more forgotten items at the store.</p>
          </div>
          <div className="flex-1">
            <img src="/screenshot-grocery.png" alt="Grocery list" className="rounded-2xl shadow-xl w-full" />
          </div>
        </div>

        <div className="flex flex-col md:flex-row-reverse items-center gap-12">
          <div className="flex-1">
            <div className="text-3xl mb-3">🔥</div>
            <h3 className="text-2xl font-bold mb-3">Track what you eat</h3>
            <p className="text-gray-500 text-lg">Log your meals and track calories, protein, carbs and fat. See your nutrition at a glance every day.</p>
          </div>
          <div className="flex-1">
            <img src="/screenshot-food-log.png" alt="Food log" className="rounded-2xl shadow-xl w-full" />
          </div>
        </div>
      </section>

      {/* PRICING */}
      <PricingTable />

      {/* SOCIAL PROOF */}
      <section className="bg-gray-50 px-6 py-16 max-w-3xl mx-auto text-center">
        <h2 className="text-2xl font-bold mb-8">Built for real home cooks</h2>
        <div className="space-y-6">
          {[
            { quote: 'I finally stopped forgetting things at the grocery store. My whole week is planned before I even leave the house.', label: 'Early user' },
            { quote: 'Importing recipes from Skinnytaste with one click is a game changer. I used to spend 20 minutes typing everything in.', label: 'Pro user' },
          ].map(({ quote, label }) => (
            <div key={label} className="bg-white rounded-2xl p-6 shadow-sm text-left">
              <p className="text-gray-600 italic">"{quote}"</p>
              <p className="text-sm text-gray-400 mt-2">— {label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* BOTTOM CTA */}
      <section className="text-center px-6 py-20">
        <h2 className="text-3xl font-bold mb-4">Ready to actually stick to your meal plan?</h2>
        <p className="text-gray-500 mb-8">Join home cooks who plan smarter every week.</p>
        <a
          href="/auth"
          className="inline-block bg-emerald-600 text-white text-lg px-8 py-4 rounded-xl hover:bg-emerald-700 transition"
        >
          Get started free →
        </a>
        <p className="text-sm text-gray-400 mt-3">No credit card. No app download. Just better meal planning.</p>
      </section>

      {/* FOOTER */}
      <footer className="text-center text-gray-400 text-sm py-6 border-t">
        © 2026 Mealplanner.cloud · <a href="/auth" className="hover:underline">Log in</a>
      </footer>

    </div>
  )
}
