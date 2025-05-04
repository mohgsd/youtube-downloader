import { NextRequest, NextResponse } from 'next/server';
import ytdl from 'ytdl-core';
import { Readable } from 'stream';

// This config is necessary for streaming responses in Next.js
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

// Maximum timeout for download attempts (15 seconds)
const DOWNLOAD_TIMEOUT = 15000;

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
    
    // Validate YouTube URL format
    if (!ytdl.validateURL(url)) {
      return NextResponse.json({ 
        error: 'Invalid YouTube URL format' 
      }, { status: 400 });
    }

    try {
      // Get video info with a custom request
      const info = await ytdl.getInfo(url, {
        requestOptions: {
          headers: {
            // Add common headers to appear more like a regular browser
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'max-age=0'
          }
        }
      });
      
      const videoTitle = info.videoDetails.title.replace(/[^\w\s]/gi, '');
      const sanitizedTitle = videoTitle.replace(/\s+/g, '_');
      
      // Configure headers
      const headers = new Headers();
      headers.set('Content-Disposition', `attachment; filename="${sanitizedTitle}.${format}"`);
      
      // Set proper content type
      if (format === 'mp3') {
        headers.set('Content-Type', 'audio/mpeg');
      } else {
        headers.set('Content-Type', 'video/mp4');
      }
      
      // Determine quality options based on format
      let qualityOption = 'highest';
      let filterOption: ytdl.Filter = 'audioandvideo';
      
      if (format === 'mp3') {
        qualityOption = 'highestaudio';
        filterOption = 'audioonly';
      }
      
      console.log(`Starting download of ${videoTitle} in ${format} format`);
      
      // Create a promise that will resolve with the stream or reject with an error after timeout
      const streamPromise = new Promise<Readable>((resolve, reject) => {
        try {
          const ytdlOptions: ytdl.downloadOptions = {
            quality: qualityOption as ytdl.downloadOptions['quality'],
            filter: filterOption,
            highWaterMark: 1024 * 1024 * 10, // 10MB buffer
            requestOptions: {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
              }
            }
          };
          
          const stream = ytdl(url, ytdlOptions);
          let hasStarted = false;
          
          stream.on('info', (info, format) => {
            console.log(`Stream info received for ${videoTitle}`);
          });
          
          stream.on('progress', (_, downloaded, total) => {
            if (!hasStarted && downloaded > 0) {
              hasStarted = true;
              console.log(`Download started for ${videoTitle}`);
            }
          });
          
          stream.on('error', (err) => {
            console.error(`Stream error for ${videoTitle}:`, err);
            reject(err);
          });
          
          // Return the stream for the response
          resolve(stream);
        } catch (err) {
          reject(err);
        }
      });
      
      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Download timed out'));
        }, DOWNLOAD_TIMEOUT);
      });
      
      // Race the stream creation against the timeout
      const stream = await Promise.race([streamPromise, timeoutPromise]) as Readable;
      
      // Return the stream as the response
      return new Response(stream as any, {
        headers,
        status: 200,
      });
      
    } catch (streamError) {
      console.error('Stream setup error:', streamError);
      return NextResponse.json({
        error: 'Failed to set up video stream',
        details: streamError instanceof Error ? streamError.message : String(streamError)
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Direct download error:', error);
    return NextResponse.json({ 
      error: 'Failed to download video',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 