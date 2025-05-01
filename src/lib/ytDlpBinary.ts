import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import YtDlpWrap from 'yt-dlp-wrap';
import https from 'https';
import { IncomingMessage } from 'http';
import { createWriteStream } from 'fs';
import axios from 'axios';

// Path to store the binary
const binPath = path.join(process.cwd(), 'bin');
const ytDlpPath = path.join(binPath, os.platform() === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');

// Function to check if yt-dlp is installed globally
async function checkGlobalInstall(): Promise<boolean> {
  return new Promise((resolve) => {
    const cmd = os.platform() === 'win32' ? 'where' : 'which';
    console.log(`Checking for global yt-dlp installation using ${cmd} command...`);
    
    const process = spawn(cmd, ['yt-dlp']);
    let output = '';
    
    process.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    process.on('close', (code) => {
      const isInstalled = code === 0;
      console.log(`Global yt-dlp check result: ${isInstalled ? 'Found at ' + output.trim() : 'Not found'}`);
      resolve(isInstalled);
    });
  });
}

// Function to download from GitHub
async function downloadFromGithub(outputPath: string): Promise<void> {
  const platform = os.platform();
  const isWindows = platform === 'win32';
  const url = isWindows
    ? 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe'
    : 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';

  console.log(`Downloading yt-dlp binary from ${url} to ${outputPath}...`);

  // Use axios instead of https to handle redirects automatically
  try {
    console.log('Using axios to download with automatic redirect handling');
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream',
      maxRedirects: 5, // Allow up to 5 redirects
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (response.status !== 200) {
      throw new Error(`Failed to download, status code: ${response.status}`);
    }

    // Ensure directory exists
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    
    // Create write stream
    const writer = createWriteStream(outputPath);
    
    // Return a promise that resolves when download completes
    return new Promise((resolve, reject) => {
      response.data.pipe(writer);
      
      writer.on('finish', () => {
        writer.close();
        console.log('yt-dlp binary downloaded successfully');
        resolve();
      });
      
      writer.on('error', (err) => {
        console.error('Error writing yt-dlp to file:', err);
        reject(err);
      });
    });
  } catch (error) {
    console.error('Error downloading yt-dlp:', error);
    throw error;
  }
}

// Function to download yt-dlp binary
async function downloadYtDlp(): Promise<string> {
  try {
    console.log(`Preparing to download yt-dlp binary...`);
    
    // Ensure bin directory exists
    console.log(`Ensuring bin directory exists at: ${binPath}`);
    await fs.mkdir(binPath, { recursive: true });
    
    // Try GitHub first
    try {
      await downloadFromGithub(ytDlpPath);
    } catch (githubError) {
      console.error('Failed to download from GitHub, trying alternative source:', githubError);
      
      // Try alternative source - a more direct CDN/mirror that doesn't use redirects
      const platform = os.platform();
      const isWindows = platform === 'win32';
      const alternativeUrl = isWindows
        ? 'https://github.com/yt-dlp/yt-dlp-nightly-builds/releases/download/2023.11.14.232728/yt-dlp.exe'
        : 'https://github.com/yt-dlp/yt-dlp-nightly-builds/releases/download/2023.11.14.232728/yt-dlp';
      
      console.log(`Trying alternative download URL: ${alternativeUrl}`);
      
      try {
        const response = await axios({
          method: 'GET',
          url: alternativeUrl,
          responseType: 'stream',
          maxRedirects: 5,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          },
        });
        
        if (response.status !== 200) {
          throw new Error(`Failed to download from alternative source, status code: ${response.status}`);
        }
        
        // Create write stream
        const writer = createWriteStream(ytDlpPath);
        
        await new Promise((resolve, reject) => {
          response.data.pipe(writer);
          
          writer.on('finish', () => {
            writer.close();
            console.log('yt-dlp binary downloaded successfully from alternative source');
            resolve(true);
          });
          
          writer.on('error', (err) => {
            console.error('Error writing yt-dlp to file from alternative source:', err);
            reject(err);
          });
        });
      } catch (alternativeError) {
        console.error('Failed to download from alternative source:', alternativeError);
        throw new Error('All download attempts failed');
      }
    }
    
    // Make executable on Unix systems
    if (os.platform() !== 'win32') {
      console.log(`Setting executable permissions for yt-dlp binary...`);
      await fs.chmod(ytDlpPath, 0o755);
    }
    
    // Verify file exists
    try {
      const stats = await fs.stat(ytDlpPath);
      console.log(`yt-dlp binary downloaded successfully, size: ${stats.size} bytes`);
    } catch (statError) {
      console.error(`Downloaded file not found or inaccessible:`, statError);
    }
    
    return ytDlpPath;
  } catch (error) {
    console.error('Failed to download yt-dlp:', error);
    throw new Error(`Failed to download yt-dlp binary: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Check if the binary is valid by trying to run it
async function validateBinary(binaryPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    console.log(`Validating binary at ${binaryPath}...`);
    
    const isGlobalPath = binaryPath === 'yt-dlp';
    const command = isGlobalPath ? binaryPath : `"${binaryPath}"`;
    
    const process = spawn(command, ['--version'], {
      shell: true, // Use shell for better compatibility on Windows
    });
    
    let output = '';
    let errorOutput = '';
    
    process.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    process.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    process.on('close', (code) => {
      const isValid = code === 0;
      console.log(`yt-dlp binary validation result: ${isValid ? 'Valid - ' + output.trim() : 'Invalid'}`);
      if (!isValid && errorOutput) {
        console.error(`yt-dlp validation error output: ${errorOutput}`);
      }
      resolve(isValid);
    });
  });
}

// Get the path to yt-dlp binary, downloading if necessary
export async function getYtDlpPath(): Promise<string> {
  try {
    console.log(`Getting yt-dlp path for platform: ${os.platform()}`);
    
    // Try using a globally installed version first
    const isGloballyInstalled = await checkGlobalInstall();
    
    if (isGloballyInstalled) {
      console.log('Using globally installed yt-dlp');
      const isValid = await validateBinary('yt-dlp');
      if (isValid) {
        return 'yt-dlp'; // Use the globally installed version
      } else {
        console.log('Globally installed yt-dlp is not valid, will try local binary');
      }
    }
    
    // Check if it exists in our bin directory
    try {
      console.log(`Checking for local yt-dlp binary at: ${ytDlpPath}`);
      await fs.access(ytDlpPath);
      console.log('Local yt-dlp binary found, validating...');
      
      const isValid = await validateBinary(ytDlpPath);
      if (isValid) {
        console.log('Local yt-dlp binary is valid');
        return ytDlpPath;
      } else {
        console.log('Local yt-dlp binary exists but is not valid, will download a new copy');
        return downloadYtDlp();
      }
    } catch (accessError) {
      console.log('Local yt-dlp binary not found, will download it');
      // Download it if not available
      return downloadYtDlp();
    }
  } catch (error) {
    console.error('Error getting yt-dlp path:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    // Fallback to assuming yt-dlp is in PATH
    console.log('Falling back to assuming yt-dlp is in PATH as a last resort');
    return 'yt-dlp';
  }
}

// Get configured YtDlpWrap instance
export async function getYtDlpInstance(): Promise<YtDlpWrap> {
  try {
    console.log('Getting yt-dlp instance...');
    const binaryPath = await getYtDlpPath();
    console.log(`Using yt-dlp binary at path: ${binaryPath}`);
    return new YtDlpWrap(binaryPath);
  } catch (error) {
    console.error('Error creating yt-dlp instance:', error);
    throw error;
  }
} 