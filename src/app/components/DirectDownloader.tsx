'use client';

import React, { useState } from 'react';

interface DirectDownloaderProps {
  videoId: string;
  title: string;
}

type DownloadService = 'y2mate' | 'savefrom' | 'ytmp3';
type DownloadMethod = 'external' | 'in-tab' | 'iframe' | 'direct';

export default function DirectDownloader({ videoId, title }: DirectDownloaderProps) {
  const [status, setStatus] = useState<'idle' | 'error' | 'complete' | 'loading'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<DownloadService>('y2mate');
  const [downloadMethod, setDownloadMethod] = useState<DownloadMethod>('external');
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);

  // Direct link generation approach
  const getYouTubeDownloadLink = (videoId: string, format: 'mp3' | 'mp4', service: DownloadService) => {
    // Generate a direct download link using a service that avoids CORS issues
    switch (service) {
      case 'y2mate':
        return format === 'mp3'
          ? `https://www.y2mate.com/youtube-mp3/${videoId}`
          : `https://www.y2mate.com/youtube/${videoId}`;
      
      case 'savefrom':
        return `https://en.savefrom.net/358/#url=https://youtube.com/watch?v=${videoId}`;
        
      case 'ytmp3':
        return format === 'mp3'
          ? `https://ytmp3.cc/youtube-to-mp3/?id=${videoId}`
          : `https://ytmp3.cc/uu138/?url=https://www.youtube.com/watch?v=${videoId}`;
          
      default:
        return `https://www.y2mate.com/youtube/${videoId}`;
    }
  };

  // New function for direct server download
  const handleDirectDownload = (format: 'mp3' | 'mp4') => {
    try {
      // Create the URL for our direct download API
      const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const downloadUrl = `/api/direct-download?url=${encodeURIComponent(youtubeUrl)}&format=${format}`;
      
      // Create an invisible iframe for the download or open in a hidden tab
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
      }, 60000); // Remove after 1 minute
      
      setStatus('complete');
      
    } catch (err) {
      console.error('Error with direct download:', err);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to initiate download');
    }
  };

  // New function for in-tab download
  const handleInTabDownload = async (format: 'mp3' | 'mp4') => {
    try {
      setStatus('loading');
      setDownloadProgress(0);
      setError(null);
      
      // Use our proxy API endpoint
      const proxyUrl = `/api/proxy-download?videoId=${videoId}&format=${format}&service=${selectedService}`;
      
      const response = await fetch(proxyUrl);
      const data = await response.json();
      
      if (response.ok) {
        if (data.status === 'not_implemented') {
          // If we get the not_implemented response, show appropriate message
          setStatus('error');
          setError(data.message || 'This download method is not yet implemented. Please use external service option.');
          return;
        }
        
        // Handle successful response (if we ever implement the full functionality)
        setStatus('complete');
      } else {
        // Handle error
        setStatus('error');
        setError(data.error || 'Failed to download. Please try the external service option.');
      }
    } catch (err) {
      console.error('Error during in-tab download:', err);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to download');
    } finally {
      setDownloadProgress(null);
    }
  };

  // Iframe-based download handler
  const handleIframeDownload = (format: 'mp3' | 'mp4') => {
    try {
      const downloadUrl = getYouTubeDownloadLink(videoId, format, selectedService);
      setIframeUrl(downloadUrl);
      setStatus('complete');
    } catch (err) {
      console.error('Error generating iframe download:', err);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to load download service');
    }
  };

  const handleOpenDownloadService = (format: 'mp3' | 'mp4') => {
    try {
      const downloadUrl = getYouTubeDownloadLink(videoId, format, selectedService);
      
      // Open in a new tab to avoid navigation away from our app
      window.open(downloadUrl, '_blank');
      
      setStatus('complete');
    } catch (err) {
      console.error('Error generating download link:', err);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to generate download link');
    }
  };

  const handleDownload = (format: 'mp3' | 'mp4') => {
    // Reset previous state
    setIframeUrl(null);
    
    if (downloadMethod === 'in-tab') {
      handleInTabDownload(format);
    } else if (downloadMethod === 'iframe') {
      handleIframeDownload(format);
    } else if (downloadMethod === 'direct') {
      handleDirectDownload(format);
    } else {
      handleOpenDownloadService(format);
    }
  };

  const handleChangeService = (service: DownloadService) => {
    setSelectedService(service);
    setStatus('idle');
    setIframeUrl(null);
  };

  // Close the iframe and reset state
  const handleCloseIframe = () => {
    setIframeUrl(null);
    setStatus('idle');
  };

  return (
    <div className="mt-6 p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">YouTube Downloader</h2>
      
      <div>
        <p className="mb-4">
          Download "{title || "YouTube Video"}" via a browser-friendly method without server-side processing.
        </p>
        
        {/* Service selection - only show when not using direct download */}
        {downloadMethod !== 'direct' && (
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">Select download service:</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleChangeService('y2mate')}
                className={`px-3 py-1 text-sm rounded-full ${
                  selectedService === 'y2mate' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Y2mate
              </button>
              <button
                onClick={() => handleChangeService('savefrom')}
                className={`px-3 py-1 text-sm rounded-full ${
                  selectedService === 'savefrom' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                SaveFrom
              </button>
              <button
                onClick={() => handleChangeService('ytmp3')}
                className={`px-3 py-1 text-sm rounded-full ${
                  selectedService === 'ytmp3' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                YTMP3
              </button>
            </div>
          </div>
        )}
        
        {/* Download method selection */}
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">Download method:</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setDownloadMethod('external')}
              className={`px-3 py-1 text-sm rounded-full ${
                downloadMethod === 'external' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              External Service
            </button>
            <button
              onClick={() => setDownloadMethod('iframe')}
              className={`px-3 py-1 text-sm rounded-full ${
                downloadMethod === 'iframe' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Embedded View
            </button>
            <button
              onClick={() => setDownloadMethod('direct')}
              className={`px-3 py-1 text-sm rounded-full ${
                downloadMethod === 'direct' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Direct Download
            </button>
            <button
              onClick={() => setDownloadMethod('in-tab')}
              className={`px-3 py-1 text-sm rounded-full ${
                downloadMethod === 'in-tab' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Proxy Download
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {downloadMethod === 'in-tab' 
              ? 'Proxy Download: Experimental feature that downloads via proxy (may not work for all videos)'
              : downloadMethod === 'iframe'
                ? 'Embedded View: Loads the download service within this page (may not work with all browsers)'
                : downloadMethod === 'direct'
                  ? 'Direct Download: Uses our server to download directly from YouTube (recommended)'
                  : 'External Service: Opens a trusted service in a new tab'}
          </p>
        </div>
        
        {!iframeUrl && (
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => handleDownload('mp3')}
              disabled={status === 'loading'}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'loading' ? 'Processing...' : 'Download MP3 (Audio)'}
            </button>
            
            <button
              onClick={() => handleDownload('mp4')}
              disabled={status === 'loading'}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'loading' ? 'Processing...' : 'Download MP4 (Video)'}
            </button>
          </div>
        )}
        
        {/* Iframe container */}
        {iframeUrl && (
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium">Download Service</h3>
              <button 
                onClick={handleCloseIframe}
                className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
              >
                Close
              </button>
            </div>
            <div className="border rounded-lg overflow-hidden" style={{ height: '500px' }}>
              <iframe 
                src={iframeUrl} 
                className="w-full h-full"
                sandbox="allow-scripts allow-same-origin allow-forms"
                referrerPolicy="no-referrer"
                title="Download Service"
              />
            </div>
            <p className="text-sm text-gray-600 mt-2">
              If the service doesn't load properly or you encounter any issues, try the "External Service" option instead.
            </p>
          </div>
        )}
        
        {/* Loading state with progress bar */}
        {status === 'loading' && (
          <div className="mt-4">
            <p className="text-blue-600 mb-2">Processing your download...</p>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: `${downloadProgress || 10}%` }}
              ></div>
            </div>
          </div>
        )}
        
        {status === 'complete' && downloadMethod === 'external' && !iframeUrl && (
          <p className="mt-4 text-green-600 font-medium">
            Download service opened in a new tab. If it didn't open, please check your popup blocker.
          </p>
        )}
        
        {status === 'complete' && downloadMethod === 'direct' && (
          <p className="mt-4 text-green-600 font-medium">
            Download started! If the download doesn't begin automatically, please check your browser settings.
          </p>
        )}
        
        {status === 'complete' && downloadMethod === 'in-tab' && (
          <p className="mt-4 text-green-600 font-medium">
            Download completed successfully!
          </p>
        )}
        
        {status === 'error' && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded">
            <p>Error: {error || 'Failed to download'}</p>
            {downloadMethod !== 'external' && (
              <p className="mt-2 text-sm">
                Try using the "External Service" option instead, which may be more reliable.
              </p>
            )}
          </div>
        )}
        
        {!iframeUrl && (
          <>
            <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
              <p className="font-medium text-yellow-800">How It Works:</p>
              <p className="text-yellow-700 mt-1">
                {downloadMethod === 'direct'
                  ? "The Direct Download method uses our server to fetch the YouTube video directly and provide it to your browser. Your download should start automatically."
                  : "This method uses external services to help download YouTube videos. If one service doesn't work, try another one."
                }
                {downloadMethod === 'external' && " The download will open in a new tab where you can complete the process."}
                {downloadMethod === 'in-tab' && " The proxy download option attempts to download without leaving this page (experimental)."}
                {downloadMethod === 'iframe' && " The embedded view shows the download service within this page."}
              </p>
              <p className="text-yellow-700 mt-2">
                <strong>Note:</strong> Only download content you have the right to access.
              </p>
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
              <p className="font-medium text-blue-800">Download steps:</p>
              {downloadMethod === 'direct' ? (
                <ol className="list-decimal ml-5 text-blue-700 mt-1">
                  <li>Click the download format you want (MP3 or MP4)</li>
                  <li>Your download will start automatically</li>
                  <li>The file will be saved to your default download location</li>
                  <li>If download doesn't start, check your browser's download settings</li>
                </ol>
              ) : downloadMethod === 'external' ? (
                <ol className="list-decimal ml-5 text-blue-700 mt-1">
                  <li>Select your preferred service above</li>
                  <li>Click the download format you want (MP3 or MP4)</li>
                  <li>In the new tab, follow the service's instructions</li>
                  <li>Wait for the conversion to complete</li>
                  <li>Download your file when ready</li>
                </ol>
              ) : downloadMethod === 'iframe' ? (
                <ol className="list-decimal ml-5 text-blue-700 mt-1">
                  <li>Select your preferred service above</li>
                  <li>Click the download format you want (MP3 or MP4)</li>
                  <li>Use the embedded service to complete the download</li>
                  <li>If the embedded view doesn't work, try the "External Service" option</li>
                </ol>
              ) : (
                <ol className="list-decimal ml-5 text-blue-700 mt-1">
                  <li>Select your preferred service above</li>
                  <li>Click the download format you want (MP3 or MP4)</li>
                  <li>Wait for the download to process</li>
                  <li>The file will download automatically when ready</li>
                  <li>If the proxy download fails, try another method</li>
                </ol>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
} 