"use client";

import { useState } from 'react';

interface DownloadResultProps {
  title: string;
  thumbnail: string;
  mp3Url?: string;
  mp4Url?: string;
  error?: string;
  note?: string;
}

export default function DownloadResult({ title, thumbnail, mp3Url, mp4Url, error, note }: DownloadResultProps) {
  const [mp3Status, setMp3Status] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [mp4Status, setMp4Status] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDownload = async (url: string, format: 'mp3' | 'mp4') => {
    const setStatus = format === 'mp3' ? setMp3Status : setMp4Status;
    setStatus('loading');
    setErrorMessage(null);
    
    console.log(`Starting ${format} download from: ${url}`);
    
    try {
      // Using fetch API to get the file as a blob
      const response = await fetch(url);
      console.log(`Download response status: ${response.status}`);
      console.log(`Response headers:`, Object.fromEntries(response.headers));
      
      if (!response.ok) {
        let errorMsg = `Download failed with status: ${response.status}`;
        
        // Try to get more detailed error from response if possible
        try {
          const errorData = await response.json();
          if (errorData && errorData.error) {
            errorMsg = errorData.error;
            if (errorData.details) {
              errorMsg += `: ${errorData.details}`;
            } else if (errorData.message) {
              errorMsg += `: ${errorData.message}`;
            }
          }
        } catch (parseError) {
          // If we can't parse JSON, just use the original error message
          console.error('Error parsing error response:', parseError);
        }
        
        throw new Error(errorMsg);
      }
      
      // Get the blob from the response
      const blob = await response.blob();
      console.log(`Download blob received, size: ${blob.size} bytes, type: ${blob.type}`);
      
      if (blob.size === 0) {
        throw new Error(`Received empty file (0 bytes)`);
      }
      
      // Get the filename from the Content-Disposition header, or use a default name
      let filename = `${title.replace(/[^\w\s]/gi, '')}.${format}`;
      const contentDisposition = response.headers.get('content-disposition');
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }
      console.log(`Using filename: ${filename}`);
      
      // Create a URL for the blob
      const downloadUrl = window.URL.createObjectURL(blob);
      
      // Create a temporary link and click it to start the download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      
      console.log('Triggering download...');
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      console.log('Download initiated successfully');
      
      setStatus('success');
    } catch (error) {
      console.error(`Download error:`, error);
      setStatus('error');
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to download file';
      setErrorMessage(errorMessage);
      
      // Use a more user-friendly notification than an alert
      console.error(`Download failed: ${errorMessage}`);
    }
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 my-4 text-red-700">
        <p className="font-medium">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white border shadow-sm rounded-lg overflow-hidden my-4">
      <div className="flex flex-col md:flex-row">
        {thumbnail && (
          <div className="md:w-1/3 flex-shrink-0">
            <img src={thumbnail} alt={title} className="w-full h-auto object-cover" />
          </div>
        )}
        <div className="p-4 md:w-2/3">
          <h2 className="text-xl font-semibold mb-2">{title}</h2>
          
          {note && (
            <p className="text-amber-600 text-sm mb-3">{note}</p>
          )}
          
          <div className="flex flex-col sm:flex-row gap-3">
            {mp3Url && (
              <button
                onClick={() => handleDownload(mp3Url, 'mp3')}
                disabled={mp3Status === 'loading'}
                className={`px-4 py-2 rounded font-medium transition ${
                  mp3Status === 'loading' 
                    ? 'bg-blue-200 text-blue-700 cursor-wait' 
                    : mp3Status === 'success'
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : mp3Status === 'error'
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                {mp3Status === 'loading' 
                  ? 'Downloading...' 
                  : mp3Status === 'success' 
                  ? 'Downloaded MP3' 
                  : mp3Status === 'error'
                  ? 'Retry MP3' 
                  : 'Download MP3 (Audio)'}
              </button>
            )}
            
            {mp4Url && (
              <button
                onClick={() => handleDownload(mp4Url, 'mp4')}
                disabled={mp4Status === 'loading'}
                className={`px-4 py-2 rounded font-medium transition ${
                  mp4Status === 'loading' 
                    ? 'bg-blue-200 text-blue-700 cursor-wait' 
                    : mp4Status === 'success'
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : mp4Status === 'error'
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                {mp4Status === 'loading' 
                  ? 'Downloading...' 
                  : mp4Status === 'success' 
                  ? 'Downloaded MP4' 
                  : mp4Status === 'error'
                  ? 'Retry MP4' 
                  : 'Download MP4 (Video)'}
              </button>
            )}
          </div>
          
          {errorMessage && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
              <p className="font-medium">Error: {errorMessage}</p>
              
              <div className="mt-2 text-sm space-y-2">
                {errorMessage.includes('copyright') && (
                  <>
                    <p>This video has copyright restrictions that prevent it from being downloaded.</p>
                    <p>Try another video that allows downloads or has a Creative Commons license.</p>
                  </>
                )}
                
                {errorMessage.includes('age-restricted') && (
                  <>
                    <p>YouTube requires authentication for age-restricted videos.</p>
                    <p>Try another video that doesn't have age restrictions.</p>
                  </>
                )}
                
                {errorMessage.includes('private') && (
                  <>
                    <p>This video is set to private by the owner or has been removed.</p>
                    <p>Check if the URL is correct and the video is publicly available.</p>
                  </>
                )}
                
                {errorMessage.includes('region') && (
                  <>
                    <p>This video is not available in your region due to geographical restrictions.</p>
                    <p>Try another video without region restrictions.</p>
                  </>
                )}
                
                {errorMessage.includes('limit') && (
                  <>
                    <p>Our server has reached a temporary download limit.</p>
                    <p>Please wait a few minutes and try again.</p>
                  </>
                )}
                
                {!errorMessage.includes('copyright') && 
                 !errorMessage.includes('age-restricted') && 
                 !errorMessage.includes('private') && 
                 !errorMessage.includes('region') && 
                 !errorMessage.includes('limit') && (
                  <>
                    <p>The download failed, possibly due to one of these reasons:</p>
                    <ul className="list-disc list-inside">
                      <li>The video is protected or restricted</li>
                      <li>The video is too large or long</li>
                      <li>The server couldn't process this specific video</li>
                      <li>YouTube may have changed its structure</li>
                    </ul>
                    <p className="mt-1">Please try again or use a different video.</p>
                  </>
                )}
              </div>
              
              <div className="mt-3 text-xs bg-blue-50 p-2 rounded text-blue-700">
                <p>
                  <span className="font-medium">Pro tip:</span> Not all YouTube videos can be downloaded due to 
                  copyright, privacy, or technical limitations.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 