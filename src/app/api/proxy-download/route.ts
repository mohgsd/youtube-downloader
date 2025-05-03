import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get parameters from request
    const searchParams = request.nextUrl.searchParams;
    const videoId = searchParams.get('videoId');
    const format = searchParams.get('format') as 'mp3' | 'mp4';
    
    if (!videoId || !format) {
      return NextResponse.json({ 
        error: 'Missing required parameters: videoId and format are required' 
      }, { status: 400 });
    }
    
    // For security reasons, validate the video ID
    if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      return NextResponse.json({ error: 'Invalid YouTube video ID format' }, { status: 400 });
    }
    
    // This route is deprecated - direct downloads are now handled by direct-download route
    return NextResponse.json({
      status: 'deprecated',
      message: 'This API route is deprecated. Please use the direct-download route for all downloads.',
      redirectTo: `/api/direct-download?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=${format}`
    });
    
  } catch (error) {
    console.error('Proxy download error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'An error occurred during proxy download' 
    }, { status: 500 });
  }
} 