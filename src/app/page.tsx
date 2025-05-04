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

  // Handle input change to extract video ID automatically
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
    
    // When URL is pasted, try to extract the video ID automatically
    if (newUrl.includes('youtube.com/watch?v=') || newUrl.includes('youtu.be/')) {
      const id = extractVideoId(newUrl);
      if (id) {
        setVideoId(id);
        setVideoTitle(extractTitle(newUrl));
        setError(null);
      }
    }
  };

  const handleProcessVideo = async (event: React.FormEvent) => {
    event.preventDefault();
    
    setLoading(true);
    setError(null);
    
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
    <main className="flex min-h-screen flex-col items-center p-8 bg-gradient-to-br from-purple-50 to-indigo-100">
      <div className="w-full max-w-3xl">
        <div className="p-8 bg-white rounded-xl shadow-lg border border-purple-100 backdrop-blur-sm bg-opacity-80">
          <h1 className="text-4xl font-bold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-indigo-600">
            YouTube Downloader
          </h1>
          
          <form onSubmit={handleProcessVideo} className="mb-8">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={url}
                onChange={handleInputChange}
                placeholder="Paste YouTube URL here..."
                className="flex-1 px-5 py-4 rounded-lg border border-purple-200 bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all shadow-sm"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:from-purple-600 hover:to-indigo-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : 'Download'}
              </button>
            </div>
          </form>
          
          {error && (
            <div className="p-4 mb-6 bg-red-50 text-red-700 rounded-lg border border-red-100 shadow-sm">
              <p className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </p>
            </div>
          )}
          
          {/* Display direct downloader */}
          {videoId && (
            <DirectDownloader 
              videoId={videoId}
              title={videoTitle || "YouTube Video"}
            />
          )}
          
          {/* Footer */}
          <div className="mt-12 text-center">
            <p className="text-purple-600 text-sm">
              Fast, reliable, and simple video downloads
            </p>
          </div>
        </div>
      </div>
    </main>
  );
} 