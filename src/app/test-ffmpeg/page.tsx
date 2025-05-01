'use client';

import React from 'react';

export default function TestFfmpeg() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">YouTube Downloader Information</h1>
      
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h2 className="text-xl font-semibold mb-2 text-blue-800">About This Application</h2>
        <p className="text-blue-700">
          This YouTube downloader uses browser-based methods for downloading videos without requiring
          server-side dependencies like ffmpeg or yt-dlp. It works by redirecting to trusted third-party
          services that handle the YouTube extraction process.
        </p>
      </div>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border rounded-lg">
            <h3 className="font-medium text-lg mb-2">1. Enter URL</h3>
            <p className="text-gray-600">
              Paste a YouTube video link in the input field and click "Prepare Video".
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-medium text-lg mb-2">2. Choose Format</h3>
            <p className="text-gray-600">
              Select whether you want to download as MP3 (audio) or MP4 (video).
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-medium text-lg mb-2">3. Complete Download</h3>
            <p className="text-gray-600">
              Follow the instructions on the third-party service that opens in a new tab.
            </p>
          </div>
        </div>
      </div>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Available Download Services</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b">Service</th>
                <th className="py-2 px-4 border-b">MP3 Support</th>
                <th className="py-2 px-4 border-b">MP4 Support</th>
                <th className="py-2 px-4 border-b">Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-2 px-4 border-b">Y2mate</td>
                <td className="py-2 px-4 border-b text-center">✅</td>
                <td className="py-2 px-4 border-b text-center">✅</td>
                <td className="py-2 px-4 border-b">Supports multiple quality options</td>
              </tr>
              <tr>
                <td className="py-2 px-4 border-b">SaveFrom</td>
                <td className="py-2 px-4 border-b text-center">✅</td>
                <td className="py-2 px-4 border-b text-center">✅</td>
                <td className="py-2 px-4 border-b">Fast downloads with fewer ads</td>
              </tr>
              <tr>
                <td className="py-2 px-4 border-b">YTMP3</td>
                <td className="py-2 px-4 border-b text-center">✅</td>
                <td className="py-2 px-4 border-b text-center">✅</td>
                <td className="py-2 px-4 border-b">Simple interface, works well for audio</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
        <h3 className="font-medium text-yellow-800">Important Note:</h3>
        <p className="text-yellow-700 mt-1">
          This application does not store or process any videos on its own servers. It simply provides
          a convenient interface to access third-party services. Please ensure you only download content
          you have the right to access, and be aware that each service may have its own terms of use.
        </p>
      </div>
      
      <div className="mt-6">
        <a
          href="/"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Back to Home
        </a>
      </div>
    </div>
  );
} 