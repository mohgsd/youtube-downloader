import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Check if the request is for the download API
  if (request.nextUrl.pathname.startsWith('/api/download')) {
    console.log('Middleware: Processing download request', request.nextUrl.toString());
    
    // Get a response object to modify
    const response = NextResponse.next();
    
    // Add CORS headers to allow cross-origin requests (for local development)
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Add cache control headers
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  }
  
  // For non-download requests, just continue
  return NextResponse.next();
}

// Specify which paths this middleware should run on
export const config = {
  matcher: '/api/:path*',
}; 