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
            <p>Your download should begin in a new tab. If nothing happens, please check if popups are blocked.</p>
          </div>
        )}
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <a
            href={`/api/proxy-download?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=mp3`}
            target="_blank"
            onClick={(e) => {
              e.preventDefault();
              handleDownload('mp3');
            }}
            className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
            </svg>
            Download MP3 (Audio)
          </a>
          
          <a
            href={`/api/proxy-download?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=mp4`}
            target="_blank"
            onClick={(e) => {
              e.preventDefault();
              handleDownload('mp4');
            }}
            className="flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
            </svg>
            Download MP4 (Video)
          </a>
        </div>
        
        <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
          <h3 className="font-semibold text-yellow-800">How It Works:</h3>
          <p className="text-yellow-700 mt-1">
            Our service connects to a reliable third-party provider that specializes in YouTube downloads.
            We redirect you to their service which handles the technical aspects of extracting the video.
          </p>
          <p className="text-yellow-700 mt-2 text-sm">
            <strong>Note:</strong> Only download content you have the right to access.
          </p>
        </div>
      </div>
    </div>
  );
} 