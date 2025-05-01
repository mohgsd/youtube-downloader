"use client";

import { useState } from 'react';
import DirectDownloader from './components/DirectDownloader';

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState<string | null>(null);

  // Function to extract video ID from URL
  const extractVideoId = (url: string): string | null => {
    if (!url) return null;
    
    if (url.includes('youtu.be/')) {
      const id = url.split('youtu.be/')[1]?.split(/[?&#]/)[0];
      return id || null;
    }
    
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match && match[1] ? match[1] : null;
  };

  // Extract title from URL (simplified for this version)
  const extractTitle = (url: string): string => {
    const parts = url.split('watch?v=');
    if (parts.length > 1) {
      return parts[1].split('&')[0];
    }
    return "YouTube Video";
  };

  const handleProcessVideo = async (event: React.FormEvent) => {
    event.preventDefault();
    
    setLoading(true);
    setError(null);
    setVideoId(null);
    
    try {
      if (!url.trim()) {
        throw new Error('Please enter a YouTube URL');
      }
      
      // Extract video ID
      const id = extractVideoId(url);
      if (!id) {
        throw new Error('Invalid YouTube URL');
      }
      
      // Set video info for download
      setVideoId(id);
      setVideoTitle(extractTitle(url));
      
    } catch (err) {
      console.error('Error processing video:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-8 bg-gray-100">
      <div className="w-full max-w-3xl">
        <div className="p-6 bg-white rounded-lg shadow-lg">
          <h1 className="text-3xl font-bold text-center mb-6 text-primary">YouTube Downloader</h1>
          
          <form onSubmit={handleProcessVideo} className="mb-6">
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
                disabled={loading}
                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Prepare Video'}
              </button>
            </div>
          </form>
          
          {error && (
            <div className="p-4 mb-6 bg-red-50 text-red-700 rounded-lg">
              <p>{error}</p>
            </div>
          )}
          
          {/* Display direct downloader */}
          {videoId && (
            <DirectDownloader 
              videoId={videoId}
              title={videoTitle || "YouTube Video"}
            />
          )}
          
          {/* Dependency checker link */}
          <div className="mt-8 text-center">
            <a 
              href="/test-ffmpeg" 
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Check System Dependencies
            </a>
          </div>
        </div>
      </div>
    </main>
  );
} 