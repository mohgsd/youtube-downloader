'use client';

import React, { useState } from 'react';

interface DirectDownloaderProps {
  videoId: string;
  title: string;
}

export default function DirectDownloader({ videoId, title }: DirectDownloaderProps) {
  const [status, setStatus] = useState<'idle' | 'error' | 'complete' | 'loading'>('idle');
  const [error, setError] = useState<string | null>(null);

  // Function to handle the download via proxy service
  const handleDownload = (format: 'mp3' | 'mp4') => {
    try {
      setStatus('loading');
      setError(null);
      
      // Create the YouTube URL
      const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
      
      // Use the proxy download route which redirects to a reliable service
      const proxyUrl = `/api/proxy-download?url=${encodeURIComponent(youtubeUrl)}&format=${format}`;
      
      console.log(`Starting download via proxy: ${proxyUrl}`);
      
      // Open in a new tab
      const downloadWindow = window.open(proxyUrl, '_blank');
      
      if (!downloadWindow) {
        setStatus('error');
        setError('Popup blocked. Please allow popups for this site to download.');
        return;
      }
      
      // Show complete status after a brief delay
      setTimeout(() => {
        setStatus('complete');
      }, 2000);
      
      // Set up a fallback timer for error message
      setTimeout(() => {
        if (status === 'loading') {
          setStatus('error');
          setError('Download may not have started. Please try again or check if the video is available.');
        }
      }, 10000); // 10 second timeout
      
    } catch (err) {
      console.error('Error initiating download:', err);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to initiate download');
    }
  };

  return (
    <div className="mt-6 p-6 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl shadow-md border border-purple-100">
      <div className="flex flex-col md:flex-row gap-4 items-center mb-6">
        <div className="w-full md:w-1/3 aspect-video bg-black rounded-lg overflow-hidden shadow-md">
          <img 
            src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`} 
            alt={title}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback to medium quality if maxresdefault is not available
              (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
            }}
          />
        </div>
        <div className="w-full md:w-2/3">
          <h2 className="text-xl font-bold mb-2 text-purple-800">{title || "YouTube Video"}</h2>
          <p className="text-sm text-purple-600 mb-4">Ready to download in your preferred format</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a
              href={`/api/proxy-download?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=mp3`}
              target="_blank"
              onClick={(e) => {
                e.preventDefault();
                handleDownload('mp3');
              }}
              className="flex items-center justify-center px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
              </svg>
              Download MP3
            </a>
            
            <a
              href={`/api/proxy-download?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=mp4`}
              target="_blank"
              onClick={(e) => {
                e.preventDefault();
                handleDownload('mp4');
              }}
              className="flex items-center justify-center px-6 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-lg hover:from-indigo-600 hover:to-indigo-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
              </svg>
              Download MP4
            </a>
          </div>
        </div>
      </div>
      
      {status === 'loading' && (
        <div className="mb-4 p-4 bg-indigo-50 text-indigo-700 rounded-lg text-center border border-indigo-100 shadow-sm">
          <p className="font-medium">Preparing your download...</p>
          <div className="w-full bg-indigo-100 rounded-full h-2.5 my-4">
            <div className="bg-indigo-600 h-2.5 rounded-full animate-pulse w-full"></div>
          </div>
          <p className="text-sm">A new tab will open with your download options</p>
        </div>
      )}
      
      {status === 'error' && (
        <div className="p-4 mb-6 bg-red-50 text-red-700 rounded-lg border border-red-100 shadow-sm">
          <p className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error || "An error occurred during download. Please try again."}
          </p>
        </div>
      )}
      
      {status === 'complete' && (
        <div className="p-4 mb-6 bg-green-50 text-green-700 rounded-lg border border-green-100 shadow-sm">
          <p className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            A new tab has opened with your download. If nothing appears, please check if popups are blocked by your browser.
          </p>
        </div>
      )}
      
      <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-100">
        <h3 className="font-semibold text-purple-800 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          How It Works:
        </h3>
        <p className="text-purple-700 mt-1 text-sm">
          Our service connects to a reliable third-party provider that specializes in YouTube downloads.
          We redirect you to their service which handles the technical aspects of extracting the video.
        </p>
        <p className="text-purple-700 mt-2 text-xs font-medium">
          <span className="bg-purple-200 text-purple-800 px-2 py-1 rounded-full">Note:</span> Only download content you have the right to access.
        </p>
      </div>
    </div>
  );
} 