import { useState } from 'react';
import { Loader2, CheckCircle } from 'lucide-react';
import LegalLayout from '../components/LegalLayout';
import pb from '../lib/pb';

const TOPICS = ['General question', 'Billing or subscription', 'Privacy or my data', 'Report a problem'];

const inputClass =
  'w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent';

export default function ContactPage() {
  const signedIn = pb.authStore.model;
  const [form, setForm] = useState({
    name: signedIn?.name || '',
    email: signedIn?.email || '',
    topic: TOPICS[0],
    message: '',
    website: '', // hidden spam trap
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Your message could not be sent. Please try again.');
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <LegalLayout title="Contact Us">
      {sent ? (
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
          <p className="text-emerald-700 font-medium">
            Thanks, {form.name || 'friend'}! Your message has been sent. We'll reply to {form.email} as soon as we can.
          </p>
        </div>
      ) : (
        <>
          <p>Questions, billing help, privacy requests or feedback: send us a message and we'll reply by email.</p>
          <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1.5">Your name</span>
                <input className={inputClass} value={form.name} onChange={set('name')} maxLength={200} />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1.5">Your email *</span>
                <input type="email" required className={inputClass} value={form.email} onChange={set('email')} />
              </label>
            </div>
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1.5">Topic</span>
              <select className={inputClass} value={form.topic} onChange={set('topic')}>
                {TOPICS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1.5">Message *</span>
              <textarea required rows={6} maxLength={5000} className={inputClass} value={form.message} onChange={set('message')} />
            </label>

            {/* Spam trap: hidden from people, bots fill it in */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={form.website}
              onChange={set('website')}
              className="hidden"
              aria-hidden="true"
            />

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-red-600 text-sm font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={sending}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2"
            >
              {sending ? (<><Loader2 className="w-5 h-5 animate-spin" />Sending...</>) : 'Send Message'}
            </button>
          </form>
        </>
      )}
    </LegalLayout>
  );
}
