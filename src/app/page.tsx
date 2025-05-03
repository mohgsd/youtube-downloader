"use client";

import { useState } from 'react';

export default function Home() {
  const [url, setUrl] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('This is a static demo version. Server-side functions are not available on GitHub Pages. For full functionality, please deploy to a server that supports Next.js server components.');
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-8 bg-gray-100">
      <div className="w-full max-w-3xl">
        <div className="p-6 bg-white rounded-lg shadow-lg">
          <h1 className="text-3xl font-bold text-center mb-6 text-primary">YouTube Downloader</h1>
          
          <form onSubmit={handleSubmit} className="mb-6">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter YouTube URL"
                className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Demo Version
              </button>
            </div>
          </form>
          
          {message && (
            <div className="p-4 mb-6 bg-yellow-50 text-yellow-700 rounded-lg">
              <p>{message}</p>
            </div>
          )}
          
          <div className="mt-8 text-center">
            <p className="text-gray-600">
              GitHub Pages static deployment - For demonstrating UI only
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Note: YouTube video downloading requires server-side processing unavailable on GitHub Pages
            </p>
          </div>
        </div>
      </div>
    </main>
  );
} 