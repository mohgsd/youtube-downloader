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

const execPromise = promisify(exec);

// YouTube URL validation regex
const youtubeUrlRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;

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

export async function GET(request: NextRequest) {
  console.log('Download request received', {
    url: request.nextUrl.toString(),
    params: Object.fromEntries(request.nextUrl.searchParams.entries())
  });
  
  let tempDir = '';
  let outputPath = '';
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get('url');
    const format = searchParams.get('format');
    const title = searchParams.get('title') || 'download';

    console.log('Processing download request', { url, format, title });

    if (!url) {
      return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
    }

    if (!format || !['mp3', 'mp4'].includes(format)) {
      return NextResponse.json({ error: 'Invalid format parameter' }, { status: 400 });
    }

    // Validate YouTube URL
    if (!youtubeUrlRegex.test(url)) {
      return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
    }

    // Check dependencies before proceeding
    const dependencies = await checkDependencies();
    
    // If ffmpeg is required for the format and not installed, return early
    if (format === 'mp3' && !dependencies.ffmpeg.installed) {
      console.log('FFMPEG is required but not installed. Installation instructions:', 
        dependencies.ffmpeg.installationInstructions);
      
      return NextResponse.json({
        error: 'Required dependency missing: ffmpeg is required for MP3 conversion but is not installed on your system.',
        message: 'ffmpeg is required for MP3 conversion but is not installed on your system.',
        diagnostics: {
          missingDependencies: [{
            name: 'ffmpeg',
            instructions: dependencies.ffmpeg.installationInstructions
          }]
        }
      }, { status: 422 });
    }

    // Create a temporary directory for downloads
    try {
      console.log(`Creating temporary directory in ${os.tmpdir()}`);
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'yt-dlp-'));
      console.log(`Temporary directory created at: ${tempDir}`);
      
      // Check if we have write permissions to this directory
      try {
        const testFile = path.join(tempDir, 'test.txt');
        await fs.writeFile(testFile, 'test');
        await fs.unlink(testFile);
        console.log('Successfully verified write permissions to temp directory');
      } catch (permError) {
        console.error('Write permission test failed:', permError);
        // Try creating in current directory instead
        const fallbackDir = path.join(process.cwd(), 'temp');
        console.log(`Trying fallback directory: ${fallbackDir}`);
        await fs.mkdir(fallbackDir, { recursive: true });
        tempDir = await fs.mkdtemp(path.join(fallbackDir, 'yt-dlp-'));
        console.log(`Using fallback temp directory: ${tempDir}`);
      }
    } catch (tempDirError) {
      console.error('Failed to create temporary directory:', tempDirError);
      return NextResponse.json(
        { error: 'Server error: failed to create temporary directory for download' },
        { status: 500 }
      );
    }
    
    outputPath = path.join(tempDir, `${Date.now()}.${format}`);
    console.log('Created temporary file path:', outputPath);
    
    let downloadSuccess = false;
    let capturedErrors: Record<string, any> = {};

    try {
      // Method 1: Use yt-dlp to download the file directly with proper format
      try {
        console.log('Attempting yt-dlp download method');
        // Get yt-dlp instance
        console.log('Getting yt-dlp instance...');
        const ytDlp = await getYtDlpInstance();
        console.log('yt-dlp instance obtained');
        
        // Set the appropriate format options - these options are critical for getting a single file
        const options: any = {
          output: outputPath,
          noCheckCertificates: true,
          preferFreeFormats: false, // Don't prefer free formats to avoid separate streams
          noWarnings: true,
          mergeOutputFormat: format === 'mp4' ? 'mp4' : 'mp3', // Force merging into a single file
        };

        if (format === 'mp3') {
          // For MP3, explicitly extract audio only
          Object.assign(options, {
            extractAudio: true,
            audioFormat: 'mp3',
            audioQuality: '0', // Best quality
            format: 'bestaudio/best', // Select best audio
            postprocessorArgs: ['-id3v2_version', '3'], // Ensure ID3 tags are properly set
          });
        } else {
          // For MP4, select best quality that includes both video and audio in a single container
          Object.assign(options, {
            format: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best', // Prefer MP4 compatible streams
            mergeOutputFormat: 'mp4',
            embedSubs: false, // Don't include subtitles
            embedThumbnail: false, // Don't include thumbnail
            addMetadata: false, // Don't add extra metadata
          });
        }

        console.log('Download options:', options);
        // Download the file
        console.log('Starting yt-dlp download...');
        await ytDlp.downloadFile(url, outputPath, options);
        console.log('yt-dlp download completed');
        
        // Verify file exists and has content
        try {
          const stats = await fs.stat(outputPath);
          console.log('File downloaded, size:', stats.size);
          downloadSuccess = stats.size > 0;
        } catch (statError) {
          console.error('yt-dlp download verification failed:', statError);
          // Continue to other methods
        }
      } catch (ytDlpError) {
        console.error('yt-dlp download error:', ytDlpError);
        // Log more details if available
        if (ytDlpError instanceof Error) {
          console.error('Error message:', ytDlpError.message);
          console.error('Error stack:', ytDlpError.stack);
        }
        capturedErrors.ytDlp = ytDlpError;
        // Continue to other methods
      }

      // Method 2: Try ffmpeg as a fallback (better at combining streams into a single file)
      if (!downloadSuccess && dependencies.ffmpeg.installed) {
        console.log('Attempting ffmpeg fallback method');
        try {
          downloadSuccess = await tryFfmpegDownload(url, outputPath, format);
          console.log('ffmpeg download result:', downloadSuccess);
        } catch (ffmpegError) {
          console.error('ffmpeg approach failed:', ffmpegError);
          capturedErrors.ffmpeg = ffmpegError;
          // Continue to final error handling
        }
      }

      // Method 3: Last resort - try direct download from stream
      if (!downloadSuccess) {
        console.log('Attempting direct download as a last resort...');
        const videoId = extractVideoId(url || '');
        
        if (videoId) {
          try {
            downloadSuccess = await tryDirectDownload(videoId, format || 'mp4', outputPath);
            console.log('Direct download result:', downloadSuccess);
          } catch (directError) {
            console.error('Direct download approach failed:', directError);
            capturedErrors.direct = directError;
          }
          
          // Method 4: Final fallback using node-only approach if everything else failed
          if (!downloadSuccess) {
            console.log('Attempting final node-only fallback method...');
            try {
              downloadSuccess = await tryFallbackNodeDownload(videoId, format || 'mp4', outputPath);
              console.log('Fallback node download result:', downloadSuccess);
            } catch (fallbackError) {
              console.error('Fallback node download failed:', fallbackError);
              capturedErrors.fallback = fallbackError;
            }
            
            // Method 5: Emergency fallback using a third-party service
            if (!downloadSuccess) {
              console.log('Attempting emergency service fallback method...');
              try {
                downloadSuccess = await tryEmergencyServiceFallback(videoId, format || 'mp4', outputPath);
                console.log('Emergency service fallback result:', downloadSuccess);
              } catch (emergencyError) {
                console.error('Emergency service fallback failed:', emergencyError);
                capturedErrors.emergency = emergencyError;
              }
            }
          }
        } else {
          console.error('Could not extract video ID for direct download');
        }
      }

      // Check if any method succeeded
      if (downloadSuccess) {
        try {
          console.log('Download successful, reading file...');
          // Read the file
          const fileBuffer = await fs.readFile(outputPath);
          console.log('File read into buffer, size:', fileBuffer.length);
          
          // Delete the temporary file
          await fs.unlink(outputPath).catch((err) => {
            console.error('Error deleting temp file:', err);
          });
          
          // Try to remove the temp directory
          await fs.rmdir(tempDir).catch((err) => {
            console.error('Error removing temp directory:', err);
          });

          // Reset tempDir to avoid cleanup in finally block
          tempDir = '';

          // Set the content type based on format
          const contentType = format === 'mp3' ? 'audio/mpeg' : 'video/mp4';
          const filename = `${encodeURIComponent(title.replace(/[\/\\:*?"<>|]/g, '_'))}.${format}`;
          
          // Prepare headers - critical for forcing a single file download
          const headers = new Headers();
          headers.set('Content-Disposition', `attachment; filename="${filename}"`);
          headers.set('Content-Type', contentType);
          headers.set('Content-Length', fileBuffer.length.toString());
          
          // Add cache control and pragma to prevent caching
          headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
          headers.set('Pragma', 'no-cache');
          headers.set('Expires', '0');
          
          console.log('Sending response with headers:', Object.fromEntries(headers.entries()));
          
          // Return the content as a single file
          return new Response(fileBuffer, {
            headers,
            status: 200,
          });
        } catch (fileError) {
          console.error('File reading error:', fileError);
          if (fileError instanceof Error) {
            console.error('Error details:', fileError.message);
            console.error('Error stack:', fileError.stack);
          }
        }
      }

      // If we reach here, all methods failed
      console.error('All download methods failed');
      
      // Determine the most likely cause of failure based on collected errors
      let errorMessage = 'Failed to download the video. It may be protected or unavailable.';
      let detailedMessage = 'We tried multiple methods to download this content but all failed.';
      let missingDependencies = [];
      
      // Check for missing dependencies
      if (!dependencies.ffmpeg.installed) {
        missingDependencies.push({
          name: 'ffmpeg',
          instructions: dependencies.ffmpeg.installationInstructions
        });
      }
      
      if (!dependencies.ytDlp.installed) {
        missingDependencies.push({
          name: 'yt-dlp',
          instructions: dependencies.ytDlp.installationInstructions
        });
      }
      
      // Add all captured errors to a diagnostic object for logging
      const errorDiagnostics = {
        yt_dlp: capturedErrors.ytDlp ? String(capturedErrors.ytDlp) : null,
        ffmpeg: capturedErrors.ffmpeg ? String(capturedErrors.ffmpeg) : null,
        ytdl_core: capturedErrors.direct ? String(capturedErrors.direct) : null,
        node_fetch: capturedErrors.fallback ? String(capturedErrors.fallback) : null,
        emergency: capturedErrors.emergency ? String(capturedErrors.emergency) : null,
        missingDependencies
      };
      
      console.error('Error diagnostics:', JSON.stringify(errorDiagnostics, null, 2));
      
      // Look for known error patterns
      if (capturedErrors.ytDlp) {
        const errorStr = String(capturedErrors.ytDlp);
        
        if (errorStr.includes('copyright')) {
          errorMessage = 'This video cannot be downloaded due to copyright restrictions';
          detailedMessage = 'YouTube has blocked this video from being downloaded due to copyright claims.';
        } else if (errorStr.includes('age') || errorStr.includes('restricted')) {
          errorMessage = 'This video is age-restricted and cannot be downloaded';
          detailedMessage = 'Age-restricted videos require authentication which our downloader does not support.';
        } else if (errorStr.includes('private') || errorStr.includes('unavailable')) {
          errorMessage = 'This video is private or unavailable';
          detailedMessage = 'The video may be set to private by the owner or has been removed from YouTube.';
        } else if (errorStr.includes('region') || errorStr.includes('country')) {
          errorMessage = 'This video is not available in your region';
          detailedMessage = 'YouTube has restricted this video from being viewed in your country.';
        } else if (errorStr.includes('quota') || errorStr.includes('limit')) {
          errorMessage = 'Download limit reached';
          detailedMessage = 'Our server has reached a temporary download limit. Please try again later.';
        } else if (errorStr.includes('binary')) {
          errorMessage = 'YouTube downloader component is missing';
          detailedMessage = 'The server is missing required components to download videos. Please contact the administrator.';
        } else if (errorStr.includes('signature') || errorStr.includes('cipher')) {
          errorMessage = 'YouTube has updated their systems';
          detailedMessage = 'YouTube has changed how videos are accessed. Please try again later when our system is updated.';
        }
      } else if (capturedErrors.direct) {
        // Check ytdl-core specific errors
        const errorStr = String(capturedErrors.direct);
        
        if (errorStr.includes('age')) {
          errorMessage = 'This video is age-restricted and cannot be downloaded';
          detailedMessage = 'Age-restricted videos require authentication which our downloader does not support.';
        } else if (errorStr.includes('private')) {
          errorMessage = 'This video is private or unavailable';
          detailedMessage = 'The video may be set to private by the owner or has been removed from YouTube.';
        } else if (errorStr.includes('COPYRIGHT')) {
          errorMessage = 'This video cannot be downloaded due to copyright restrictions';
          detailedMessage = 'YouTube has blocked this video from being downloaded due to copyright claims.';
        } else if (errorStr.includes('decode') || errorStr.includes('parse')) {
          errorMessage = 'Unable to decode this video';
          detailedMessage = 'YouTube has recently changed their systems and our downloader needs to be updated.';
        } else if (errorStr.includes('signature') || errorStr.includes('cipher')) {
          errorMessage = 'Signature verification failed';
          detailedMessage = 'YouTube has updated their security system. Our downloader needs to be updated.';
        }
      } else if (capturedErrors.emergency) {
        // Check emergency service specific errors
        const errorStr = String(capturedErrors.emergency);
        
        if (errorStr.includes('status code: 404') || errorStr.includes('not found')) {
          errorMessage = 'Video not found on YouTube';
          detailedMessage = 'This video might have been deleted or made private by the owner.';
        } else if (errorStr.includes('timeout')) {
          errorMessage = 'Request timed out';
          detailedMessage = 'The emergency download service is taking too long to respond. Please try again later.';
        } else if (errorStr.includes('unavailable')) {
          errorMessage = 'Video unavailable through emergency service';
          detailedMessage = 'The video might be restricted in some way that prevents downloading.';
        } else if (errorStr.includes('rate') || errorStr.includes('limit')) {
          errorMessage = 'Rate limit reached on emergency service';
          detailedMessage = 'Too many requests have been made to the download service. Please try again later.';
        }
      }
      
      // If we have missing dependencies, add that to the error message
      if (missingDependencies.length > 0) {
        errorMessage = 'Required dependencies are missing';
        detailedMessage = `The following required components are missing: ${missingDependencies.map(d => d.name).join(', ')}.`;
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          message: detailedMessage,
          diagnostics: {
            ...errorDiagnostics,
            missingDependencies: missingDependencies
          }
        },
        { status: 500 }
      );
    } catch (allMethodsError) {
      console.error('All download methods failed with error:', allMethodsError);
      if (allMethodsError instanceof Error) {
        console.error('Error details:', allMethodsError.message);
        console.error('Error stack:', allMethodsError.stack);
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to download the video. All available methods failed.',
          details: allMethodsError instanceof Error ? allMethodsError.message : String(allMethodsError),
          diagnostics: {
            error: allMethodsError instanceof Error ? allMethodsError.message : String(allMethodsError),
            stack: allMethodsError instanceof Error ? allMethodsError.stack : undefined
          }
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Download error:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to download content' },
      { status: 500 }
    );
  } finally {
    // Clean up temporary directory if it exists and wasn't cleared yet
    if (tempDir) {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (cleanupError) {
        console.error('Error during cleanup:', cleanupError);
      }
    }
  }
} 