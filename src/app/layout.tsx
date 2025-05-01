import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'YouTube Downloader',
  description: 'Download YouTube videos as MP3 or MP4',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header className="bg-secondary py-4">
          <div className="container">
            <h1 className="text-2xl font-bold">YouTube Downloader</h1>
          </div>
        </header>
        <main className="container py-8">
          {children}
        </main>
        <footer className="bg-secondary py-4">
          <div className="container text-center text-sm">
            <p>&copy; {new Date().getFullYear()} YouTube Downloader. All rights reserved.</p>
          </div>
        </footer>
      </body>
    </html>
  );
} 