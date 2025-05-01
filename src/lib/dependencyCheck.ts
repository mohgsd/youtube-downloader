import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const execPromise = promisify(exec);

export interface DependencyStatus {
  installed: boolean;
  version?: string;
  error?: string;
  installationInstructions?: string;
}

export interface SystemDependencies {
  ffmpeg: DependencyStatus;
  ytDlp: DependencyStatus;
}

function getFfmpegInstallInstructions(): string {
  const platform = os.platform();
  
  if (platform === 'win32') {
    return `To install ffmpeg on Windows:
1. Download from: https://ffmpeg.org/download.html
2. Or use winget: winget install ffmpeg
3. Or use chocolatey: choco install ffmpeg

After installation, restart your terminal/command prompt.`;
  } else if (platform === 'darwin') {
    return `To install ffmpeg on macOS:
1. Install with Homebrew: brew install ffmpeg
2. Or download from: https://ffmpeg.org/download.html`;
  } else {
    return `To install ffmpeg on Linux:
1. Ubuntu/Debian: sudo apt install ffmpeg
2. Fedora: sudo dnf install ffmpeg
3. Arch Linux: sudo pacman -S ffmpeg`;
  }
}

export async function checkDependencies(): Promise<SystemDependencies> {
  const ffmpegStatus: DependencyStatus = {
    installed: false,
    installationInstructions: getFfmpegInstallInstructions()
  };

  const ytDlpStatus: DependencyStatus = {
    installed: false
  };

  try {
    // Check ffmpeg
    try {
      const { stdout } = await execPromise('ffmpeg -version');
      ffmpegStatus.installed = true;
      ffmpegStatus.version = stdout.split('\n')[0];
    } catch (error) {
      ffmpegStatus.error = error instanceof Error ? error.message : 'Unknown error';
    }

    // Check yt-dlp
    try {
      const { stdout } = await execPromise('yt-dlp --version');
      ytDlpStatus.installed = true;
      ytDlpStatus.version = stdout.trim();
    } catch (error) {
      ytDlpStatus.error = error instanceof Error ? error.message : 'Unknown error';
      ytDlpStatus.installationInstructions = `To install yt-dlp:
1. Using pip: pip install yt-dlp
2. Or download from: https://github.com/yt-dlp/yt-dlp/releases/latest`;
    }

    return {
      ffmpeg: ffmpegStatus,
      ytDlp: ytDlpStatus
    };
  } catch (error) {
    console.error('Error checking dependencies:', error);
    throw error;
  }
} 