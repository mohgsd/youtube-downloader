'use client';

import React, { useState } from 'react';

interface DirectDownloaderProps {
  videoId: string;
  title: string;
}

export default function DirectDownloader({ videoId, title }: DirectDownloaderProps) {
  const [status, setStatus] = useState<'idle' | 'error' | 'complete' | 'loading'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);

  // Function for direct server download
  const handleDirectDownload = (format: 'mp3' | 'mp4') => {
    try {
      setStatus('loading');
      // Create the URL for our direct download API
      const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const downloadUrl = `/api/direct-download?url=${encodeURIComponent(youtubeUrl)}&format=${format}`;
      
      // Create an invisible iframe for the download
      // This allows the browser to handle the download without leaving the page
      const downloadFrame = document.createElement('iframe');
      downloadFrame.style.display = 'none';
      downloadFrame.src = downloadUrl;
      document.body.appendChild(downloadFrame);
      
      // Set a timeout to remove the iframe after the download has started
      setTimeout(() => {
        if (downloadFrame.parentNode) {
          document.body.removeChild(downloadFrame);
        }
        setStatus('complete');
      }, 3000); // Show loading for 3 seconds
      
    } catch (err) {
      console.error('Error with direct download:', err);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to initiate download');
    }
  };

  return (
    <div className="mt-6 p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">YouTube Downloader</h2>
      
      <div>
        <p className="mb-4">
          Download "{title || "YouTube Video"}" directly from our server.
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
            <p>Download started! If your download doesn't begin automatically, try again or check your browser's download settings.</p>
          </div>
        )}
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <button
            onClick={() => handleDirectDownload('mp3')}
            disabled={status === 'loading'}
            className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
            Download MP3 (Audio)
          </button>
          
          <button
            onClick={() => handleDirectDownload('mp4')}
            disabled={status === 'loading'}
            className="flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm3 2h6v4H7V5zm8 8v2h-2v-2h2zm-2-2h2v-2h-2v2zm-4 4h2v-2H9v2zm-2 0v-2H5v2h2zm-2-4h2v-2H5v2z" clipRule="evenodd" />
            </svg>
            Download MP4 (Video)
          </button>
        </div>
        
        <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
          <h3 className="font-semibold text-yellow-800">How It Works:</h3>
          <p className="text-yellow-700 mt-1">
            This downloader uses our server to process and deliver YouTube videos directly to you. 
            Downloads are processed securely on our server and then sent to your browser.
          </p>
          <p className="text-yellow-700 mt-2 text-sm">
            <strong>Note:</strong> Only download content you have the right to access.
          </p>
        </div>
      </div>
    </div>
  );
} 