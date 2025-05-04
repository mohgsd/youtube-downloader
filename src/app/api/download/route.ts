import { NextRequest, NextResponse } from 'next/server';
import { getYtDlpInstance } from '@/lib/ytDlpBinary';
import path from 'path';
import { promises as fs } from 'fs';
import os from 'os';
import { Readable } from 'stream';
import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createWriteStream } from 'fs';
import ytdl from 'ytdl-core'; // Direct import of ytdl-core
import { checkDependencies } from '@/lib/dependencyCheck';
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
  if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  }
  
  // Set up periodic cleanup of old files
  setInterval(() => {
    cleanupOldFiles();
  }, CACHE_CLEANUP_INTERVAL);
  
} catch (error) {
  console.error('Error setting up download directory:', error);
}

// Function to clean up old files
async function cleanupOldFiles() {
  try {
    const now = Date.now();
    const files = fs.readdirSync(DOWNLOAD_DIR);
    
    for (const file of files) {
      const filePath = path.join(DOWNLOAD_DIR, file);
      const stats = fs.statSync(filePath);
      
      // Delete files older than MAX_CACHE_TIME
      if (now - stats.mtimeMs > MAX_CACHE_TIME) {
        fs.unlinkSync(filePath);
        console.log(`Deleted old file: ${file}`);
      }
    }
  } catch (error) {
    console.error('Error cleaning up old files:', error);
  }
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

// Attempt to download directly using ffmpeg if available
async function tryFfmpegDownload(url: string, outputPath: string, format: string): Promise<boolean> {
  try {
    const videoId = extractVideoId(url);
    if (!videoId) {
      console.error('ffmpeg download failed: Could not extract video ID');
      return false;
    }
    
    // Try to check if ffmpeg is available
    try {
      const { stdout } = await execPromise('ffmpeg -version');
      console.log('ffmpeg is available:', stdout.substring(0, 50) + '...');
    } catch (ffmpegCheckError) {
      console.error('ffmpeg not available:', ffmpegCheckError);
      return false;
    }
    
    // Build the ffmpeg command based on format
    let command;
    if (format === 'mp3') {
      // For MP3, explicitly extract audio only and convert to MP3
      command = `ffmpeg -i "https://www.youtube.com/watch?v=${videoId}" -vn -q:a 0 -f mp3 "${outputPath}" -y`;
    } else {
      // For MP4, ensure we're getting both video and audio in a single MP4 container
      command = `ffmpeg -i "https://www.youtube.com/watch?v=${videoId}" -c:v libx264 -c:a aac -f mp4 "${outputPath}" -y`;
    }
    
    console.log('Attempting ffmpeg download:', command);
    try {
      const { stdout, stderr } = await execPromise(command);
      console.log('ffmpeg download output:', stdout);
      console.log('ffmpeg download errors/warnings:', stderr);
    } catch (ffmpegExecError) {
      console.error('ffmpeg execution failed:', ffmpegExecError);
      return false;
    }
    
    // Verify the file exists and has content
    try {
      const stats = await fs.stat(outputPath);
      console.log(`ffmpeg download successful, file size: ${stats.size} bytes`);
      return stats.size > 0;
    } catch (statError) {
      console.error('ffmpeg download failed - file not found or empty:', statError);
      return false;
    }
  } catch (error) {
    console.error('ffmpeg download failed with unexpected error:', error);
    return false;
  }
}

// Attempt to download directly from a YouTube stream
async function tryDirectDownload(videoId: string, format: string, outputPath: string): Promise<boolean> {
  try {
    console.log(`Attempting direct download for video ID: ${videoId}, format: ${format}`);
    
    // No need to check if ytdl-core is installed - it's in package.json
    try {
      // Using dynamic import for ytdl-core to avoid server-side import issues
      const ytdl = await import('ytdl-core').then(m => m.default);
      console.log('Successfully imported ytdl-core');
      
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      
      try {
        // Verify the video is available
        console.log('Getting video info...');
        const videoInfo = await ytdl.getInfo(videoUrl);
        console.log(`Video info retrieved: ${videoInfo.videoDetails.title}`);
        
        // Create a writable stream to the output file
        const outputStream = createWriteStream(outputPath);
        
        // Set up options
        const options: any = {
          quality: format === 'mp3' ? 'highestaudio' : 'highest',
        };
        
        if (format === 'mp3') {
          options.filter = 'audioonly';
        }
        
        // Get the download stream
        console.log('Creating download stream...');
        const downloadStream = ytdl(videoUrl, options);
        
        // Handle completion and errors via promise
        return new Promise((resolve, reject) => {
          outputStream.on('finish', async () => {
            try {
              const stats = await fs.stat(outputPath);
              console.log(`Direct download complete, size: ${stats.size} bytes`);
              resolve(stats.size > 0);
            } catch (err: unknown) {
              console.error('Error checking output file:', err);
              resolve(false);
            }
          });
          
          outputStream.on('error', (err) => {
            console.error('Output stream error:', err);
            reject(err);
          });
          
          downloadStream.on('error', (err) => {
            console.error('Download stream error:', err);
            reject(err);
          });
          
          // Pipe the download stream to the output file
          console.log('Starting download...');
          downloadStream.pipe(outputStream);
        });
      } catch (videoError) {
        console.error('Error getting video info:', videoError);
        return false;
      }
    } catch (importError) {
      console.error('Error importing ytdl-core:', importError);
      return false;
    }
  } catch (error) {
    console.error(`Direct download failed:`, error);
    return false;
  }
}

// Add a new fallback method using exclusively node libraries
async function tryFallbackNodeDownload(videoId: string, format: string, outputPath: string): Promise<boolean> {
  try {
    console.log(`Attempting last resort Node-only download for video ID: ${videoId}, format: ${format}`);
    
    // Use node-fetch for direct requests (already a dependency in package.json)
    const nodeFetch = await import('node-fetch').then(m => m.default);
    
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    // First, get the video page HTML
    const response = await nodeFetch(videoUrl);
    if (!response.ok) {
      console.error(`Failed to fetch video page: ${response.status} ${response.statusText}`);
      return false;
    }
    
    const html = await response.text();
    console.log(`Fetched video page HTML (${html.length} bytes)`);
    
    // Extract video info
    const titleMatch = html.match(/<meta name="title" content="([^"]+)"/);
    const title = titleMatch ? titleMatch[1] : 'unknown';
    console.log(`Video title: ${title}`);
    
    // Look for direct media URLs in the page
    const urlMatch = html.match(/(?:"url":")(https:\/\/[^"]+\.(?:mp4|webm)[^"]*)/g);
    
    if (!urlMatch || urlMatch.length === 0) {
      console.error('No direct media URLs found in the page');
      return false;
    }
    
    // Clean up the URLs and choose the most appropriate one
    const mediaUrls = urlMatch.map(u => u.replace('"url":"', '').replace(/\\u0026/g, '&'));
    console.log(`Found ${mediaUrls.length} potential media URLs`);
    
    let targetUrl: string | null = null;
    
    if (format === 'mp3') {
      // For MP3, prefer audio-only streams
      targetUrl = mediaUrls.find(url => url.includes('audio')) || mediaUrls[0];
    } else {
      // For MP4, prefer higher quality video
      targetUrl = mediaUrls.find(url => url.includes('hd720')) || 
                 mediaUrls.find(url => url.includes('hd1080')) || 
                 mediaUrls[0];
    }
    
    if (!targetUrl) {
      console.error('Could not select an appropriate media URL');
      return false;
    }
    
    console.log(`Selected media URL: ${targetUrl.substring(0, 100)}...`);
    
    // Download the media file
    const mediaResponse = await nodeFetch(targetUrl);
    if (!mediaResponse.ok || !mediaResponse.body) {
      console.error(`Failed to fetch media: ${mediaResponse.status} ${mediaResponse.statusText}`);
      return false;
    }
    
    // At this point, we know body is not null
    const responseBody = mediaResponse.body;
    
    // Write to output file
    const writer = createWriteStream(outputPath);
    
    return new Promise((resolve, reject) => {
      responseBody.pipe(writer);
      
      writer.on('finish', async () => {
        try {
          const stats = await fs.stat(outputPath);
          console.log(`Fallback Node download complete, size: ${stats.size} bytes`);
          
          // For MP3, we'd ideally convert from webm/mp4 to mp3 here
          // but we're returning the raw audio for simplicity
          
          resolve(stats.size > 0);
        } catch (statError) {
          console.error('Error checking output file:', statError);
          resolve(false);
        }
      });
      
      writer.on('error', (err) => {
        console.error('Write stream error:', err);
        reject(err);
      });
    });
  } catch (error) {
    console.error('Fallback Node download failed:', error);
    return false;
  }
}

// Add a new emergency fallback using a third-party service
async function tryEmergencyServiceFallback(videoId: string, format: string, outputPath: string): Promise<boolean> {
  try {
    console.log(`Attempting emergency service fallback for video ID: ${videoId}, format: ${format}`);
    
    // Use a publicly available API service that still works with current YouTube changes
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
    
    return new Promise((resolve, reject) => {
      streamResponse.data.pipe(writer);
      
      writer.on('finish', async () => {
        try {
          const stats = await fs.stat(outputPath);
          console.log(`Emergency service download complete, size: ${stats.size} bytes`);
          resolve(stats.size > 0);
        } catch (statError) {
          console.error('Error checking output file:', statError);
          resolve(false);
        }
      });
      
      writer.on('error', (err) => {
        console.error('Write stream error:', err);
        reject(err);
      });
    });
  } catch (error) {
    console.error('Emergency service fallback failed:', error);
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
    
    // Extract the video ID for validation and caching
    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json({ 
        error: 'Invalid YouTube URL format' 
      }, { status: 400 });
    }
    
    // Generate a unique filename based on video ID and format
    const uniqueId = randomUUID().substring(0, 8);
    let outputFilename = `${videoId}_${uniqueId}.${format}`;
    let outputPath = path.join(DOWNLOAD_DIR, outputFilename);
    
    // Setup yt-dlp options based on format
    let ytDlpOptions = '';
    
    if (format === 'mp3') {
      // For MP3 format
      ytDlpOptions = [
        '-f bestaudio',
        '--extract-audio',
        '--audio-format mp3',
        '--audio-quality 0',
        '--no-playlist',
        '--no-warnings',
        '--quiet'
      ].join(' ');
    } else {
      // For MP4 format
      ytDlpOptions = [
        '-f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best"',
        '--merge-output-format mp4',
        '--no-playlist',
        '--no-warnings',
        '--quiet'
      ].join(' ');
    }
    
    console.log(`Starting download for video ID: ${videoId} in ${format} format`);
    
    // Execute yt-dlp to download the file
    try {
      // Get video info first to get the title
      const { stdout: infoOutput } = await execPromise(`yt-dlp --print title --no-warnings --quiet "${url}"`);
      const videoTitle = sanitizeFilename(infoOutput.trim()) || videoId;
      
      // Update the output filename with the video title
      outputFilename = `${videoTitle}.${format}`;
      outputPath = path.join(DOWNLOAD_DIR, outputFilename);
      
      // Check if file already exists (simple caching)
      if (!fs.existsSync(outputPath)) {
        console.log(`Downloading ${videoTitle} in ${format} format...`);
        
        // Execute the download command
        const downloadCommand = `yt-dlp ${ytDlpOptions} -o "${outputPath}" "${url}"`;
        await execPromise(downloadCommand);
        
        console.log(`Download completed: ${outputPath}`);
      } else {
        console.log(`Using cached file: ${outputPath}`);
      }
      
      // Check if the file exists after download attempt
      if (!fs.existsSync(outputPath)) {
        throw new Error('Download failed - output file not found');
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
      const fileBuffer = fs.readFileSync(outputPath);
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