const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const os = require('os');
const { promisify } = require('util');

const execPromise = promisify(exec);

// Path for the bin directory
const binDir = path.join(process.cwd(), 'bin');
const ytDlpPath = path.join(binDir, os.platform() === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');

// Check if yt-dlp is globally available
function checkGlobalInstall(command) {
  return new Promise((resolve) => {
    const cmd = os.platform() === 'win32' ? 'where' : 'which';
    const proc = spawn(cmd, [command]);
    
    proc.on('close', (code) => {
      resolve(code === 0);
    });
  });
}

// Helper function to follow redirects
function fetchWithRedirects(url, callback) {
  const protocol = url.startsWith('https:') ? https : http;
  
  protocol.get(url, (response) => {
    // Handle redirects
    if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
      console.log(`Following redirect to ${response.headers.location}`);
      fetchWithRedirects(response.headers.location, callback);
      return;
    }
    
    callback(null, response);
  }).on('error', (err) => {
    callback(err);
  });
}

// Download yt-dlp from GitHub
function downloadYtDlp() {
  // Create bin directory if it doesn't exist
  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
  }
  
  return new Promise((resolve, reject) => {
    const platform = os.platform();
    const isWindows = platform === 'win32';
    const url = isWindows
      ? 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe'
      : 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';

    console.log(`Downloading yt-dlp from ${url}...`);
    
    fetchWithRedirects(url, (err, response) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download yt-dlp, status code: ${response.statusCode}`));
        return;
      }

      const fileStream = fs.createWriteStream(ytDlpPath);
      response.pipe(fileStream);
      
      fileStream.on('finish', () => {
        fileStream.close();
        console.log(`Downloaded yt-dlp to ${ytDlpPath}`);
        
        // Make executable on Unix systems
        if (!isWindows) {
          fs.chmodSync(ytDlpPath, 0o755);
          console.log('Made yt-dlp executable');
        }
        
        resolve();
      });
      
      fileStream.on('error', (err) => {
        reject(err);
      });
    });
  });
}

// Check for ffmpeg installation
async function checkFfmpeg() {
  try {
    // Check if ffmpeg is already installed
    const isGloballyInstalled = await checkGlobalInstall('ffmpeg');
    
    if (isGloballyInstalled) {
      console.log('ffmpeg is already installed globally. The app will use that version for fallback extraction.');
      return true;
    }
    
    console.warn('\n========== RECOMMENDED DEPENDENCY ==========');
    console.warn('ffmpeg is not installed on your system. While not required,');
    console.warn('it is highly recommended as a fallback method for reliable downloads.');
    console.warn('Please install ffmpeg using one of these methods:');
    
    if (os.platform() === 'win32') {
      console.warn('1. Download from: https://ffmpeg.org/download.html');
      console.warn('2. Or install with winget: winget install ffmpeg');
      console.warn('3. Or install with chocolatey: choco install ffmpeg');
    } else if (os.platform() === 'darwin') {
      console.warn('1. Install with Homebrew: brew install ffmpeg');
    } else {
      console.warn('1. Install with apt: sudo apt install ffmpeg');
      console.warn('2. Or with yum: sudo yum install ffmpeg');
    }
    
    console.warn('==========================================\n');
    return false;
  } catch (error) {
    console.error('Error checking ffmpeg:', error);
    return false;
  }
}

async function main() {
  console.log('Checking for required and recommended dependencies...');
  
  try {
    // First check if yt-dlp is globally installed
    const isYtDlpInstalled = await checkGlobalInstall('yt-dlp');
    
    if (isYtDlpInstalled) {
      console.log('yt-dlp is already installed globally. The app will use that version.');
    } else {
      // Check if it exists in our bin directory
      if (fs.existsSync(ytDlpPath)) {
        console.log(`yt-dlp binary found at ${ytDlpPath}. No need to download.`);
      } else {
        // Try to download it
        try {
          await downloadYtDlp();
          console.log('yt-dlp has been installed successfully.');
        } catch (downloadError) {
          console.error('Failed to automatically download yt-dlp:', downloadError.message);
          console.warn('\n========== IMPORTANT NOTICE ==========');
          console.warn('yt-dlp binary is required but could not be downloaded automatically.');
          console.warn('Please install it manually using one of these methods:');
          console.warn('1. Install Python and run: pip install yt-dlp');
          console.warn('2. Download directly from: https://github.com/yt-dlp/yt-dlp/releases/latest');
          console.warn('   and place in your system PATH or in the bin/ directory of this project.');
          console.warn('==========================================\n');
        }
      }
    }
    
    // Also check for ffmpeg as a backup method
    await checkFfmpeg();
    
    console.log('Dependency check completed.');
  } catch (error) {
    console.error('Error during dependency check:', error);
    console.warn('You may need to install dependencies manually. See README.md for instructions.');
  }
}

main(); 