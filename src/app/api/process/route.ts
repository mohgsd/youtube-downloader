import { NextResponse } from 'next/server';
import { getYtDlpInstance } from '@/lib/ytDlpBinary';
import path from 'path';
import { promises as fs } from 'fs';
import os from 'os';
import axios from 'axios';

// YouTube URL validation regex
const youtubeUrlRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;

// Extract YouTube video ID from URL
function extractVideoId(url: string): string | null {
  if (!url) return null;
  
  // Handle youtu.be format
  if (url.includes('youtu.be/')) {
    const id = url.split('youtu.be/')[1]?.split(/[?&#]/)[0];
    return id || null;
  }
  
  // Handle youtube.com format
  const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
  return match && match[1] ? match[1] : null;
}

export async function POST(request: Request) {
  console.log('Process request received');
  
  try {
    const body = await request.json();
    const { url } = body;
    
    console.log('Processing YouTube URL:', url);

    // Validate input
    if (!url) {
      return NextResponse.json({ error: 'YouTube URL is required' }, { status: 400 });
    }

    // Validate YouTube URL
    if (!youtubeUrlRegex.test(url)) {
      return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
    }

    // Extract video ID for fallback methods
    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json({ error: 'Could not extract YouTube video ID from URL' }, { status: 400 });
    }

    console.log('Extracted video ID:', videoId);

    try {
      // Try using yt-dlp
      try {
        console.log('Attempting to use yt-dlp...');
        // Get yt-dlp instance
        const ytDlp = await getYtDlpInstance();
        
        // Get video information
        console.log('Getting video info with yt-dlp...');
        const videoInfo = await ytDlp.getVideoInfo(url);
        const videoTitle = videoInfo.title || 'YouTube Video';
        const thumbnailUrl = videoInfo.thumbnail || '';
        
        console.log('Video info retrieved:', { videoTitle, thumbnailUrl: thumbnailUrl.substring(0, 50) + '...' });

        // Generate download URLs for both formats - always use our own API
        const mp3Url = `/api/download?url=${encodeURIComponent(url)}&format=mp3&title=${encodeURIComponent(videoTitle)}`;
        const mp4Url = `/api/download?url=${encodeURIComponent(url)}&format=mp4&title=${encodeURIComponent(videoTitle)}`;
        
        console.log('Generated download URLs:', { mp3Url, mp4Url });
        
        return NextResponse.json({
          title: videoTitle,
          thumbnail: thumbnailUrl,
          mp3Url,
          mp4Url,
        });
      } catch (ytDlpError) {
        console.error('yt-dlp error:', ytDlpError);
        
        // Fallback to using YouTube API to get basic info (but still use our download API)
        try {
          console.log('Falling back to noembed API...');
          // Use a free YouTube info API as fallback
          const apiResponse = await axios.get(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
          
          if (apiResponse.data && apiResponse.data.title) {
            const title = apiResponse.data.title;
            const thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
            
            console.log('Info retrieved from API:', { title, thumbnail });
            
            // Still use our own download endpoints
            const mp3Url = `/api/download?url=${encodeURIComponent(url)}&format=mp3&title=${encodeURIComponent(title)}`;
            const mp4Url = `/api/download?url=${encodeURIComponent(url)}&format=mp4&title=${encodeURIComponent(title)}`;
            
            return NextResponse.json({
              title,
              thumbnail,
              mp3Url,
              mp4Url,
              note: 'Processing via alternative method'
            });
          }
        } catch (apiError) {
          console.error('API fallback error:', apiError);
          // Continue to the generic fallback below
        }
        
        // Generic fallback with just the video ID
        console.log('Using generic fallback with video ID only');
        const fallbackTitle = videoId;
        const fallbackThumbnail = `https://img.youtube.com/vi/${videoId}/0.jpg`;
        
        const mp3Url = `/api/download?url=${encodeURIComponent(url)}&format=mp3&title=${fallbackTitle}`;
        const mp4Url = `/api/download?url=${encodeURIComponent(url)}&format=mp4&title=${fallbackTitle}`;
        
        return NextResponse.json({
          title: `YouTube Video (${fallbackTitle})`,
          thumbnail: fallbackThumbnail,
          mp3Url,
          mp4Url,
          note: 'Limited information available for this video. Downloads may still work.'
        });
      }
    } catch (setupError) {
      console.error('yt-dlp setup error:', setupError);
      
      // Even when yt-dlp setup fails, try to use our download endpoint directly
      console.log('Falling back to direct download with video ID only');
      return NextResponse.json({
        title: `YouTube Video (${videoId})`,
        thumbnail: `https://img.youtube.com/vi/${videoId}/0.jpg`,
        mp3Url: `/api/download?url=${encodeURIComponent(url)}&format=mp3&title=${videoId}`,
        mp4Url: `/api/download?url=${encodeURIComponent(url)}&format=mp4&title=${videoId}`,
        note: 'Using alternative extraction method. Download quality may vary.'
      });
    }
  } catch (error) {
    console.error('Processing error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process YouTube video' },
      { status: 500 }
    );
  }
} 