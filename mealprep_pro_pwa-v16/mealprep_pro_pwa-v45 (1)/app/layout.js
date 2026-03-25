import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata = {
  title: 'MealPrep Pro',
  description: 'Your intelligent weekly meal planner',
  manifest: '/manifest.json',
  themeColor: '#4CAF78',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
      </head>
      <body className="pb-20 md:pb-0 md:pl-64 min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-7xl mx-auto p-4 md:p-8">
          {children}
        </main>
      </body>
    </html>
  );
}