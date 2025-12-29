import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Maria Knoop Editor',
  description: 'PDF-based Restnutzungsdauer Gutachten Editor',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-gray-100">
        <header className="bg-white border-b border-gray-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold text-gray-900">
                Maria Knoop Editor
              </h1>
              <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded">
                Labs
              </span>
            </div>
            <span className="text-xs text-gray-400">
              Restnutzungsdauer Gutachten
            </span>
          </div>
        </header>
        <main className="p-6">{children}</main>
      </body>
    </html>
  );
}
