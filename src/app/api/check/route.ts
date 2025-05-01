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
      message: "This application now uses browser-based download methods that don't require server-side dependencies like ffmpeg or yt-dlp. No server-side dependency check is needed.",
      browserDownload: {
        enabled: true,
        services: [
          {
            name: "Y2mate",
            url: "https://www.y2mate.com/",
            formats: ["mp3", "mp4"]
          },
          {
            name: "SaveFrom",
            url: "https://en.savefrom.net/",
            formats: ["mp3", "mp4"]
          },
          {
            name: "YTMP3",
            url: "https://ytmp3.cc/",
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