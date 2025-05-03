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
      
      // Find the best format based on user request
      let formatInfo;
      
      if (format === 'mp3') {
        // For MP3, get the best audio-only format
        formatInfo = ytdl.chooseFormat(info.formats, { 
          quality: 'highestaudio',
          filter: 'audioonly' 
        });
      } else {
        // For MP4, get the best video format with audio
        formatInfo = ytdl.chooseFormat(info.formats, {
          quality: 'highest',
          filter: 'audioandvideo'
        });
      }
      
      if (!formatInfo || !formatInfo.url) {
        throw new Error('Could not find suitable format for download');
      }
      
      // Log what format we found (for debugging)
      console.log(`Selected format: ${JSON.stringify({
        itag: formatInfo.itag,
        mimeType: formatInfo.mimeType,
        quality: formatInfo.quality,
        hasAudio: formatInfo.hasAudio,
        hasVideo: formatInfo.hasVideo
      })}`);
      
      // Create filename based on format
      const filename = `${sanitizedTitle}.${format}`;
      
      // DIRECT APPROACH: Redirect to the source URL
      // This is the most reliable approach on serverless environments like Vercel
      return NextResponse.redirect(formatInfo.url);
      
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