export default function PricingTable() {
  return (
    <section className="px-6 py-20 max-w-5xl mx-auto">
      <h2 className="text-3xl font-bold text-center mb-4">Simple, honest pricing</h2>
      <p className="text-center text-gray-500 mb-12">Start free. Upgrade when you're ready.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-3xl mx-auto">

        {/* FREE PLAN */}
        <div className="border border-gray-200 rounded-2xl p-8">
          <div className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">Free</div>
          <div className="text-4xl font-bold mb-1">$0</div>
          <div className="text-gray-400 text-sm mb-6">Always free</div>
          <ul className="space-y-3 text-sm text-gray-600 mb-8">
            {[
              'Save up to 15 recipes',
              'Weekly meal plan grid',
              'Auto-generated grocery list',
              'Serving size scaling',
              'Installable as PWA',
            ].map((f) => (
              <li key={f} className="flex items-center gap-2">
                <span className="text-emerald-500">✓</span> {f}
              </li>
            ))}
          </ul>
          <a
            href="/auth?plan=free"
            className="block text-center border border-gray-300 text-gray-700 rounded-xl py-3 hover:bg-gray-50 transition"
          >
            Get started free
          </a>
        </div>

        {/* PRO PLAN */}
        <div className="border-2 border-emerald-500 rounded-2xl p-8 relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
            Most popular
          </div>
          <div className="text-sm font-semibold text-emerald-600 uppercase tracking-wide mb-2">Pro</div>
          <div className="text-4xl font-bold mb-1">$6<span className="text-lg font-normal text-gray-400">/mo</span></div>
          <div className="text-gray-400 text-sm mb-6">or $50/yr — save 30%</div>
          <ul className="space-y-3 text-sm text-gray-600 mb-8">
            {[
              'Everything in Free',
              'Unlimited recipe saves',
              'Import from any recipe website',
              'Grocery list by store category',
              'Nutrition estimates (cal, protein, carbs)',
              'Saved grocery staples templates',
              'Monthly meal history',
              'Weekly meal summary emails',
            ].map((f) => (
              <li key={f} className="flex items-center gap-2">
                <span className="text-emerald-500">✓</span> {f}
              </li>
            ))}
          </ul>
          <a
            href="/auth?plan=pro"
            className="block text-center bg-emerald-600 text-white rounded-xl py-3 hover:bg-emerald-700 transition font-semibold"
          >
            Try Pro free for 14 days →
          </a>
          <p className="text-xs text-center text-gray-400 mt-2">No credit card required</p>
        </div>

      </div>
    </section>
  )
}
