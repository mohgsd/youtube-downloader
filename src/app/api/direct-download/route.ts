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
      // Get video info to set appropriate filename
      const info = await ytdl.getInfo(url);
      const videoTitle = info.videoDetails.title.replace(/[^\w\s]/gi, '');
      const sanitizedTitle = videoTitle.replace(/\s+/g, '_');
      
      // Create filename based on format
      const filename = `${sanitizedTitle}.${format}`;
      
      // Set up download options based on format
      const options: ytdl.downloadOptions = {
        quality: format === 'mp3' ? 'highestaudio' : 'highest',
      };
      
      if (format === 'mp3') {
        options.filter = 'audioonly';
      }
      
      // Create headers for the response
      const headers = new Headers();
      headers.set('Content-Disposition', `attachment; filename="${filename}"`);
      
      if (format === 'mp3') {
        headers.set('Content-Type', 'audio/mpeg');
      } else {
        headers.set('Content-Type', 'video/mp4');
      }

      // Create a stream for the video/audio
      const stream = ytdl(url, options);
      
      // Convert Node.js stream to ReadableStream for the Response
      const readableStream = new ReadableStream({
        start(controller) {
          stream.on('data', (chunk) => {
            controller.enqueue(chunk);
          });
          
          stream.on('end', () => {
            controller.close();
          });
          
          stream.on('error', (error) => {
            console.error('Stream error:', error);
            controller.error(error);
          });
        }
      });

      // Return the response with the stream
      return new Response(readableStream, {
        headers
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