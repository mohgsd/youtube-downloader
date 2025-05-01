import { NextRequest, NextResponse } from 'next/server';
import ytdl from 'ytdl-core';
import ffmpeg from 'fluent-ffmpeg';
import { Readable } from 'stream';
import { PassThrough } from 'stream';
import path from 'path';
import os from 'os';
import fs from 'fs';

const tempDir = path.join(os.tmpdir(), 'youtube-downloader');

// Create temp directory if it doesn't exist
try {
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
} catch (err) {
  console.error('Failed to create temp directory:', err);
}

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

      // For MP4 direct streaming
      if (format === 'mp4') {
        // Create a stream for the video
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
      } 
      // For MP3, we need to convert using ffmpeg
      else if (format === 'mp3') {
        // Generate temporary file paths
        const tempId = Date.now().toString();
        const tempAudioPath = path.join(tempDir, `temp_audio_${tempId}.mp3`);
        
        // Set up the ytdl stream for downloading
        const audioStream = ytdl(url, options);
        
        // Create a promise to handle the ffmpeg conversion
        const conversionPromise = new Promise<string>((resolve, reject) => {
          ffmpeg(audioStream)
            .audioBitrate(192)
            .format('mp3')
            .output(tempAudioPath)
            .on('end', () => {
              resolve(tempAudioPath);
            })
            .on('error', (err) => {
              console.error('Error during ffmpeg conversion:', err);
              reject(err);
            })
            .run();
        });
        
        try {
          // Wait for the conversion to finish and get the output file path
          const outputPath = await conversionPromise;
          
          // Create a stream for the converted file
          const fileStream = fs.createReadStream(outputPath);
          
          // Read file stats to get file size
          const stats = fs.statSync(outputPath);
          headers.set('Content-Length', stats.size.toString());
          
          // Convert Node.js stream to ReadableStream for the Response
          const readableStream = new ReadableStream({
            start(controller) {
              fileStream.on('data', (chunk) => {
                controller.enqueue(chunk);
              });
              
              fileStream.on('end', () => {
                controller.close();
                // Clean up the temporary file
                fs.unlink(outputPath, (err: NodeJS.ErrnoException | null) => {
                  if (err) console.error('Error removing temp file:', err);
                });
              });
              
              fileStream.on('error', (error) => {
                console.error('File stream error:', error);
                controller.error(error);
              });
            }
          });
          
          // Return the response with the stream
          return new Response(readableStream, {
            headers
          });
        } catch (conversionError) {
          console.error('Conversion error:', conversionError);
          return NextResponse.json({
            error: 'Failed to convert video to MP3',
            details: conversionError instanceof Error ? conversionError.message : String(conversionError)
          }, { status: 500 });
        }
      }
      
      // If we reach this point, something unexpected happened with the format
      return NextResponse.json({
        error: 'Unsupported format requested',
      }, { status: 400 });
      
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

// This config is necessary for streaming responses in Next.js
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs'; 