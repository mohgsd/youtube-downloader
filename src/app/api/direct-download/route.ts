import { NextRequest, NextResponse } from 'next/server';
import ytdl from 'ytdl-core';

// This config is necessary for streaming responses in Next.js
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

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
      // Get video info to set appropriate filename and best format
      const info = await ytdl.getInfo(url);
      const videoTitle = info.videoDetails.title.replace(/[^\w\s]/gi, '');
      const sanitizedTitle = videoTitle.replace(/\s+/g, '_');
      
      // Set content type and headers
      const headers = new Headers();
      
      if (format === 'mp3') {
        headers.set('Content-Type', 'audio/mpeg');
      } else {
        headers.set('Content-Type', 'video/mp4');
      }
      
      headers.set('Content-Disposition', `attachment; filename="${sanitizedTitle}.${format}"`);
      
      // Stream options
      const options: ytdl.downloadOptions = {
        quality: format === 'mp3' ? 'highestaudio' : 'highest',
        filter: format === 'mp3' ? 'audioonly' : 'audioandvideo',
      };
      
      // Create a ReadableStream from ytdl
      const stream = ytdl(url, options);
      
      // Return the stream in the response
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