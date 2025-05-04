'use client';

import React, { useState } from 'react';

interface DirectDownloaderProps {
  videoId: string;
  title: string;
}

export default function DirectDownloader({ videoId, title }: DirectDownloaderProps) {
  const [status, setStatus] = useState<'idle' | 'error' | 'complete' | 'loading'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [showFallback, setShowFallback] = useState(false);

  // Function for direct server download
  const handleDirectDownload = (format: 'mp3' | 'mp4') => {
    try {
      setStatus('loading');
      setError(null);
      setShowFallback(false);
      
      // Create the URL for our direct download API
      const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const downloadUrl = `/api/direct-download?url=${encodeURIComponent(youtubeUrl)}&format=${format}`;
      
      // For debugging - let's log the download URL
      console.log(`Downloading from: ${downloadUrl}`);
      
      // Use window.location to directly navigate to the download URL
      // This is the most reliable method for server-side streaming downloads
      const downloadWindow = window.open(downloadUrl, '_blank');
      
      if (!downloadWindow) {
        setStatus('error');
        setError('Popup blocked. Please allow popups for this site to download.');
        return;
      }
      
      // Show complete status after a brief delay
      setTimeout(() => {
        setStatus('complete');
      }, 2000);
      
      // Set up a fallback timer for error message and show fallback option
      setTimeout(() => {
        if (status === 'loading') {
          setStatus('error');
          setError('Download may not have started. Try the alternative download method below.');
          setShowFallback(true);
        }
      }, 10000); // 10 second timeout - reduced from 20s for better UX
      
    } catch (err) {
      console.error('Error with direct download:', err);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to initiate download');
      setShowFallback(true);
    }
  };

  // Function for fallback download through external service
  const handleFallbackDownload = (format: 'mp3' | 'mp4') => {
    try {
      const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const proxyUrl = `/api/proxy-download?url=${encodeURIComponent(youtubeUrl)}&format=${format}`;
      
      console.log(`Using fallback download: ${proxyUrl}`);
      
      // Open in a new tab
      window.open(proxyUrl, '_blank');
      
    } catch (err) {
      console.error('Error with fallback download:', err);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to initiate fallback download');
    }
  };

  return (
    <div className="mt-6 p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">YouTube Download</h2>
      
      <div>
        <p className="mb-4">
          Download "<span className="font-semibold">{title || "YouTube Video"}</span>" in your preferred format.
        </p>
        
        {status === 'loading' && (
          <div className="mb-4 p-4 bg-blue-50 text-blue-700 rounded-lg text-center">
            <p>Preparing your download...</p>
            <div className="w-full bg-gray-200 rounded-full h-2.5 my-4">
              <div className="bg-blue-600 h-2.5 rounded-full animate-pulse w-full"></div>
            </div>
            <p className="text-sm">This may take a few moments depending on the video size</p>
          </div>
        )}
        
        {status === 'error' && (
          <div className="p-4 mb-6 bg-red-50 text-red-700 rounded-lg">
            <p>{error || "An error occurred during download. Please try again."}</p>
          </div>
        )}
        
        {status === 'complete' && (
          <div className="p-4 mb-6 bg-green-50 text-green-700 rounded-lg">
            <p>Your download should begin shortly. If nothing happens, try clicking the download button again.</p>
          </div>
        )}
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <a
            href={`/api/direct-download?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=mp3`}
            target="_blank"
            onClick={(e) => {
              e.preventDefault();
              handleDirectDownload('mp3');
            }}
            className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
            Download MP3 (Audio)
          </a>
          
          <a
            href={`/api/direct-download?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=mp4`}
            target="_blank"
            onClick={(e) => {
              e.preventDefault();
              handleDirectDownload('mp4');
            }}
            className="flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm3 2h6v4H7V5zm8 8v2h-2v-2h2zm-2-2h2v-2h-2v2zm-4 4h2v-2H9v2zm-2 0v-2H5v2h2zm-2-4h2v-2H5v2z" clipRule="evenodd" />
            </svg>
            Download MP4 (Video)
          </a>
        </div>
        
        {/* Alternative download options when the main method fails */}
        {showFallback && (
          <div className="mt-8 border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Alternative Download Method</h3>
            <p className="mb-4">If the download didn't work, try our alternative method:</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => handleFallbackDownload('mp3')}
                className="flex items-center justify-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                </svg>
                Alternative MP3 Download
              </button>
              
              <button
                onClick={() => handleFallbackDownload('mp4')}
                className="flex items-center justify-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                </svg>
                Alternative MP4 Download
              </button>
            </div>
          </div>
        )}
        
        <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
          <h3 className="font-semibold text-yellow-800">How It Works:</h3>
          <p className="text-yellow-700 mt-1">
            Our service processes YouTube videos and delivers them to you as downloadable files.
            If the primary method doesn't work, our alternative method connects to a reliable external service.
          </p>
          <p className="text-yellow-700 mt-2 text-sm">
            <strong>Note:</strong> Only download content you have the right to access.
          </p>
        </div>
      </div>
    </div>
  );
} 