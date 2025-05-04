# YouTube Downloader Setup Guide

This guide explains how to set up the required dependencies for the YouTube Downloader application.

## Required Dependencies

1. **Node.js and npm**: The application is built on Next.js which requires Node.js.
2. **yt-dlp**: A command-line tool for downloading videos from YouTube and other sites.
3. **ffmpeg**: Required for audio extraction and format conversion.

## Installation Instructions

### 1. Install yt-dlp

#### Windows:

1. Download the latest yt-dlp.exe from [GitHub releases](https://github.com/yt-dlp/yt-dlp/releases).
2. Place the executable in a directory that's in your system PATH (e.g., `C:\Windows` or create a dedicated tools directory).
3. Or install using pip (if Python is installed): `pip install yt-dlp`

#### macOS:

```bash
# Using Homebrew
brew install yt-dlp

# OR using pip
pip3 install yt-dlp
```

#### Linux:

```bash
# Using apt (Ubuntu/Debian)
sudo apt update
sudo apt install python3-pip
sudo pip3 install yt-dlp

# Using dnf (Fedora)
sudo dnf install yt-dlp
```

### 2. Install ffmpeg

#### Windows:

1. Download the latest build from [ffmpeg.org](https://ffmpeg.org/download.html#build-windows).
2. Extract the archive and add the `bin` directory to your system PATH.
3. Or install using Chocolatey: `choco install ffmpeg`

#### macOS:

```bash
# Using Homebrew
brew install ffmpeg
```

#### Linux:

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install ffmpeg

# Fedora
sudo dnf install ffmpeg
```

### 3. Verify Installation

Run the following commands to verify the installations:

```bash
yt-dlp --version
ffmpeg -version
```

## Setting Up the Application

1. Clone the repository:
```bash
git clone <repository-url>
cd youtube-downloader
```

2. Install the Node.js dependencies:
```bash
npm install
```

3. Build the application:
```bash
npm run build
```

4. Start the server:
```bash
npm start
```

## Configuration Options

You can modify the following parameters in the `src/app/api/download/route.ts` file:

- `DOWNLOAD_DIR`: Where temporary downloaded files are stored
- `MAX_CACHE_TIME`: How long to keep downloaded files before cleanup (default: 1 hour)
- `CACHE_CLEANUP_INTERVAL`: How often to check for old files to delete (default: 30 minutes)

## Deployment Notes

When deploying to production:

1. Ensure all dependencies (yt-dlp and ffmpeg) are installed on the server.
2. Make sure the server has enough disk space for temporary file storage.
3. Consider setting up a cron job to clean up the download directory regularly.
4. For Vercel deployments, you'll need to use a custom server or serverless function that can execute yt-dlp.

## Troubleshooting

If you encounter issues:

1. **"Command not found" errors**: Ensure yt-dlp and ffmpeg are properly installed and in your PATH.
2. **Permission denied**: Make sure the application has write permissions to the download directory.
3. **Downloads failing**: Check if YouTube has changed their site structure. Update yt-dlp to the latest version.
4. **Memory issues**: For large videos, you may need to increase the memory allocation for your server.

## Legal Considerations

- This tool is intended for downloading content for which you have the right to access.
- Comply with YouTube's Terms of Service when using this application.
- The application does not store any downloaded content permanently; all files are temporary.
- Users are responsible for ensuring they have the right to download any content. 