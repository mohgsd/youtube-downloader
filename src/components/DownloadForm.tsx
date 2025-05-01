"use client";

import { useState, FormEvent } from 'react';

interface DownloadFormProps {
  onSubmit: (url: string) => void;
  loading: boolean;
}

export default function DownloadForm({ onSubmit, loading }: DownloadFormProps) {
  const [urlInput, setUrlInput] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (urlInput) {
      onSubmit(urlInput);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-secondary bg-opacity-50 p-6 rounded-lg shadow-lg">
      <div className="mb-6">
        <label htmlFor="youtube-link" className="block mb-2 font-medium">
          Enter YouTube Video URL
        </label>
        <input
          id="youtube-link"
          type="url"
          className="input"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          required
        />
        <p className="mt-2 text-sm opacity-70">
          Enter a valid YouTube video URL to process it for download
        </p>
      </div>

      <button
        type="submit"
        disabled={loading || !urlInput}
        className={`btn btn-primary w-full ${
          loading || !urlInput ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {loading ? 'Processing...' : 'Process Video'}
      </button>
    </form>
  );
} 