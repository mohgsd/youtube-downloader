import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// Promisify exec
const execAsync = promisify(exec);

// This config is necessary for streaming responses in Next.js
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

// Max timeout for operations (30 seconds)
const OPERATION_TIMEOUT = 30000;

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
      // Redirect to fallback service as a simpler solution
      // This is a public and reliable YouTube to MP3/MP4 API service
      const serviceUrl = `https://api.vevioz.com/api/button/${format}/${encodeURIComponent(url)}`;
      
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