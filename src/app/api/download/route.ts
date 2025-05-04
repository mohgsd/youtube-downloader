import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import * as fsSync from 'fs';
import os from 'os';
import { Readable } from 'stream';
import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createWriteStream } from 'fs';
import ytdl from 'ytdl-core'; // Direct import of ytdl-core
import { randomUUID } from 'crypto';

const execPromise = promisify(exec);

// YouTube URL validation regex
const youtubeUrlRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;

// Configuration
const DOWNLOAD_DIR = path.join(os.tmpdir(), 'yt-downloads');
const MAX_CACHE_TIME = 3600000; // 1 hour in milliseconds
const CACHE_CLEANUP_INTERVAL = 1800000; // 30 minutes in milliseconds

// This config is necessary for streaming responses in Next.js
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

// Create download directory if it doesn't exist
try {
  if (!fsSync.existsSync(DOWNLOAD_DIR)) {
    fsSync.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  }
} catch (error) {
  console.error('Error setting up download directory:', error);
}

// Extract video ID from URL
function extractVideoId(url: string): string | null {
  if (!url) return null;
  
  if (url.includes('youtu.be/')) {
    const id = url.split('youtu.be/')[1]?.split(/[?&#]/)[0];
    return id || null;
  }
  
  const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
  return match && match[1] ? match[1] : null;
}

// Attempt to download directly using ytdl-core
async function downloadWithYtdlCore(url: string, format: string, outputPath: string): Promise<boolean> {
  return new Promise(async (resolve, reject) => {
    try {
      console.log(`Attempting ytdl-core download for URL: ${url}, format: ${format}`);
      
      // Get basic info about the video
      const info = await ytdl.getInfo(url);
      console.log(`Video info retrieved for "${info.videoDetails.title}"`);
      
      // Set up stream options based on format
      const options: ytdl.downloadOptions = {
        quality: format === 'mp3' ? 'highestaudio' : 'highest',
      };
      
      if (format === 'mp3') {
        options.filter = 'audioonly';
      }
      
      // Start the download
      const downloadStream = ytdl(url, options);
      const fileStream = createWriteStream(outputPath);
      
      downloadStream.on('error', (err) => {
        console.error('Download stream error:', err);
        reject(err);
      });
      
      fileStream.on('error', (err) => {
        console.error('File stream error:', err);
        reject(err);
      });
      
      fileStream.on('finish', () => {
        console.log(`Download completed: ${outputPath}`);
        resolve(true);
      });
      
      // Pipe the download to the file
      downloadStream.pipe(fileStream);
      
    } catch (error) {
      console.error('ytdl-core download failed:', error);
      resolve(false);
    }
  });
}

// Fallback to using a third-party service API
async function downloadWithPublicApi(videoId: string, format: string, outputPath: string): Promise<boolean> {
  try {
    console.log(`Attempting public API fallback for video ID: ${videoId}, format: ${format}`);
    
    // Use a publicly available API service
    const apiUrl = `https://pipedapi.kavin.rocks/streams/${videoId}`;
    console.log(`Requesting stream info from: ${apiUrl}`);
    
    const response = await axios.get(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      timeout: 10000
    });
    
    if (response.status !== 200 || !response.data) {
      console.error(`Failed to get stream info: ${response.status}`);
      return false;
    }
    
    console.log('Stream info retrieved successfully');
    const streamData = response.data;
    
    // Choose appropriate stream based on format
    let streamUrl = null;
    
    if (format === 'mp3') {
      // For MP3, get the audio-only stream with highest quality
      const audioStreams = streamData.audioStreams || [];
      if (audioStreams.length > 0) {
        // Sort by bitrate (descending)
        const sortedAudio = [...audioStreams].sort((a, b) => 
          parseInt(b.bitrate || '0') - parseInt(a.bitrate || '0'));
        streamUrl = sortedAudio[0].url;
        console.log(`Selected audio stream with bitrate: ${sortedAudio[0].bitrate}`);
      }
    } else {
      // For MP4, prefer streams that have both audio and video
      const videoStreams = streamData.videoStreams || [];
      if (videoStreams.length > 0) {
        // First check for streams that include both audio and video
        const videoWithAudio = videoStreams.filter((s: any) => s.format?.includes('video/mp4') && !s.videoOnly);
        
        if (videoWithAudio.length > 0) {
          // Sort by quality (descending)
          const sortedVideos = [...videoWithAudio].sort((a: any, b: any) => 
            parseInt(b.quality?.replace('p', '') || '0') - 
            parseInt(a.quality?.replace('p', '') || '0'));
          
          streamUrl = sortedVideos[0].url;
          console.log(`Selected video stream with quality: ${sortedVideos[0].quality}`);
        } else {
          // If no combined streams, just get the highest quality video
          const sortedVideos = [...videoStreams].sort((a: any, b: any) => 
            parseInt(b.quality?.replace('p', '') || '0') - 
            parseInt(a.quality?.replace('p', '') || '0'));
          
          streamUrl = sortedVideos[0].url;
          console.log(`Selected video-only stream with quality: ${sortedVideos[0].quality}`);
        }
      }
    }
    
    if (!streamUrl) {
      console.error('No suitable streams found');
      return false;
    }
    
    console.log(`Downloading from stream URL: ${streamUrl.substring(0, 100)}...`);
    
    // Download the stream
    const streamResponse = await axios({
      method: 'GET',
      url: streamUrl,
      responseType: 'stream',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (streamResponse.status !== 200) {
      console.error(`Failed to download stream: ${streamResponse.status}`);
      return false;
    }
    
    // Save to file
    const writer = createWriteStream(outputPath);
    
    return new Promise((resolve) => {
      streamResponse.data.pipe(writer);
      
      writer.on('finish', async () => {
        try {
          const stats = await fs.stat(outputPath);
          console.log(`Public API download complete, size: ${stats.size} bytes`);
          resolve(stats.size > 0);
        } catch (statError) {
          console.error('Error checking output file:', statError);
          resolve(false);
        }
      });
      
      writer.on('error', (err) => {
        console.error('Write stream error:', err);
        resolve(false);
      });
    });
  } catch (error) {
    console.error('Public API fallback failed:', error);
    return false;
  }
}

// Function to sanitize filename
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^\w\s]/gi, '')
    .replace(/\s+/g, '_')
    .substring(0, 100); // Limit length for safety
}

// Main handler function
export async function GET(request: NextRequest) {
  try {
    // Get parameters from request
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get('url');
    const format = searchParams.get('format') as 'mp3' | 'mp4';
    
    if (!url) {
      return NextResponse.json({ 
        error: 'Missing required parameter: url' 
      }, { status: 400 });
    }
    
    // Validate the format
    if (!['mp3', 'mp4'].includes(format)) {
      return NextResponse.json({ 
        error: 'Invalid format. Must be mp3 or mp4' 
      }, { status: 400 });
    }
    
    // Validate YouTube URL
    if (!youtubeUrlRegex.test(url)) {
      return NextResponse.json({ 
        error: 'Invalid YouTube URL' 
      }, { status: 400 });
    }
    
    // Extract the video ID for validation and caching
    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json({ 
        error: 'Could not extract video ID from URL' 
      }, { status: 400 });
    }

    try {
      // Get video info to determine the title
      const info = await ytdl.getInfo(url);
      const videoTitle = sanitizeFilename(info.videoDetails.title) || videoId;
      
      // Generate a unique filename
      const uniqueId = randomUUID().substring(0, 8);
      const outputFilename = `${videoTitle}_${uniqueId}.${format}`;
      const outputPath = path.join(DOWNLOAD_DIR, outputFilename);
      
      console.log(`Preparing to download "${videoTitle}" (${videoId}) in ${format} format`);
      
      // Try primary download method
      let downloadSuccess = await downloadWithYtdlCore(url, format, outputPath);
      
      // If primary method fails, try fallback
      if (!downloadSuccess) {
        console.log('Primary download method failed, trying fallback...');
        downloadSuccess = await downloadWithPublicApi(videoId, format, outputPath);
      }
      
      if (!downloadSuccess) {
        return NextResponse.json({
          error: 'Failed to download video after trying multiple methods',
        }, { status: 500 });
      }
      
      // Check if the file exists
      try {
        await fs.access(outputPath);
      } catch (accessError) {
        return NextResponse.json({
          error: 'Failed to access downloaded file',
          details: accessError instanceof Error ? accessError.message : String(accessError)
        }, { status: 500 });
      }
      
      // Create response headers
      const headers = new Headers();
      headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(outputFilename)}"`);
      
      if (format === 'mp3') {
        headers.set('Content-Type', 'audio/mpeg');
      } else {
        headers.set('Content-Type', 'video/mp4');
      }
      
      // Stream the file directly to the client
      const fileBuffer = await fs.readFile(outputPath);
      
      // Schedule file deletion after a short time
      setTimeout(async () => {
        try {
          await fs.unlink(outputPath);
          console.log(`Deleted temporary file: ${outputPath}`);
        } catch (unlinkError) {
          console.error('Error deleting temporary file:', unlinkError);
        }
      }, 60000); // Delete after 1 minute
      
      return new Response(fileBuffer, {
        headers,
        status: 200,
      });
      
    } catch (downloadError) {
      console.error('Download error:', downloadError);
      return NextResponse.json({
        error: 'Failed to download video',
        details: downloadError instanceof Error ? downloadError.message : String(downloadError)
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 