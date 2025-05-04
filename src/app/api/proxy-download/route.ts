import { NextRequest, NextResponse } from 'next/server';

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
    
    // Validate YouTube URL format (simple check)
    if (!url.includes('youtube.com/watch?v=') && !url.includes('youtu.be/')) {
      return NextResponse.json({ 
        error: 'Invalid YouTube URL format' 
      }, { status: 400 });
    }

    try {
      // Extract video ID from URL
      let videoId = '';
      if (url.includes('youtube.com/watch?v=')) {
        videoId = url.split('watch?v=')[1].split('&')[0];
      } else if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1].split('?')[0];
      }
      
      if (!videoId) {
        return NextResponse.json({ 
          error: 'Could not extract video ID from URL' 
        }, { status: 400 });
      }
      
      // Choose appropriate service URL based on format
      let serviceUrl = '';
      
      if (format === 'mp3') {
        // Y2mate is a reliable service for MP3 downloads
        serviceUrl = `https://www.y2mate.com/youtube-mp3/${videoId}`;
      } else {
        // For MP4 downloads
        serviceUrl = `https://www.y2mate.com/youtube/${videoId}`;
      }
      
      console.log(`Redirecting to download service: ${serviceUrl}`);
      
      // Redirect to the service
      return NextResponse.redirect(serviceUrl);
      
    } catch (streamError) {
      console.error('Proxy download error:', streamError);
      return NextResponse.json({
        error: 'Failed to set up proxy download',
        details: streamError instanceof Error ? streamError.message : String(streamError)
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Proxy download error:', error);
    return NextResponse.json({ 
      error: 'Failed to set up proxy download',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 