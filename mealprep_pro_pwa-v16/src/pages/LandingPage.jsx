// import PricingTable from '../components/landing/PricingTable'
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
        <span className="text-xl font-bold text-green-600">🥗 Mealplanner.cloud</span>
        <div className="flex gap-4 items-center">
          <a href="/auth" className="text-sm text-gray-500 hover:text-gray-800">Log in</a>
          <a href="/auth" className="text-sm bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
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
          href="/signup"
          className="inline-block bg-green-600 text-white text-lg px-8 py-4 rounded-xl hover:bg-green-700 transition"
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
          <p className="text-green-600 font-bold text-xl mt-6">Mealplanner.cloud fixes that.</p>
        </div>
      </section>

      {/* FEATURES */}
      <section className="px-6 py-20 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">How it works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          {[
            { icon: '🗂', title: 'Save your recipes, your way', desc: 'Add manually or import from any recipe website in one click. Organized, searchable, forever yours.' },
            { icon: '📅', title: 'Plan your week in seconds', desc: 'Drag recipes onto a simple weekly grid — breakfast, lunch, dinner. Change your mind? Just drag again.' },
            { icon: '🛒', title: 'Grocery list, auto-generated', desc: 'Every ingredient from every meal, combined and sorted by category. No more forgotten items.' },
            { icon: '📱', title: 'Works like a real app', desc: 'Install on your phone straight from the browser. No app store. Always up to date.' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="bg-gray-50 rounded-2xl p-6">
              <div className="text-3xl mb-3">{icon}</div>
              <h3 className="font-semibold text-lg mb-1">{title}</h3>
              <p className="text-gray-500">{desc}</p>
            </div>
          ))}
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
          href="/signup"
          className="inline-block bg-green-600 text-white text-lg px-8 py-4 rounded-xl hover:bg-green-700 transition"
        >
          Get started free →
        </a>
        <p className="text-sm text-gray-400 mt-3">No credit card. No app download. Just better meal planning.</p>
      </section>

      {/* FOOTER */}
      <footer className="text-center text-gray-400 text-sm py-6 border-t">
        © 2026 Mealplanner.cloud · <a href="/login" className="hover:underline">Log in</a>
      </footer>

    </div>
  )
}
