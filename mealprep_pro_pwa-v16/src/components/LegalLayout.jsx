import { Link } from 'react-router-dom';

export const COMPANY = 'Elise Cellucci, LLC';
export const EFFECTIVE_DATE = 'November 5, 2026';

export function LegalFooterLinks({ className = '' }) {
  return (
    <span className={className}>
      <Link to="/help" className="hover:underline">How to use</Link>
      {' · '}
      <Link to="/privacy" className="hover:underline">Privacy</Link>
      {' · '}
      <Link to="/terms" className="hover:underline">Terms</Link>
      {' · '}
      <Link to="/contact" className="hover:underline">Contact</Link>
    </span>
  );
}

export default function LegalLayout({ title, children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-lg font-bold text-emerald-600">🥗 Mealplanner.cloud</Link>
          <Link to="/auth" className="text-sm font-semibold text-emerald-600 hover:underline">Log in</Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
        <div className="legal-body text-gray-700 leading-relaxed space-y-4 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:mt-8 [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_a]:text-emerald-600 [&_a]:underline">
          {children}
        </div>
      </main>
      <footer className="text-center text-gray-400 text-sm py-6 border-t">
        © 2026 {COMPANY} · <LegalFooterLinks />
      </footer>
    </div>
  );
}
