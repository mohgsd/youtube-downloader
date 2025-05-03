import { NextResponse } from 'next/server';
import os from 'os';

export async function GET() {
  try {
    // Check system info
    const systemInfo = {
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      tempDir: os.tmpdir(),
      cwd: process.cwd()
    };
    
    // Return information about browser-based approach
    return NextResponse.json({
      status: 'success',
      systemInfo,
      message: "This application now uses direct server-side download methods that don't require external services.",
      serverDownload: {
        enabled: true,
        components: [
          {
            name: "Direct Download",
            status: "Active",
            formats: ["mp3", "mp4"]
          },
          {
            name: "YouTube Processing",
            status: "Available",
            formats: ["mp3", "mp4"]
          },
          {
            name: "Download Engine",
            status: "Running",
            formats: ["mp3", "mp4"]
          }
        ]
      }
    });
  } catch (error) {
    console.error('Diagnostic check failed:', error);
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Diagnostic check failed',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 