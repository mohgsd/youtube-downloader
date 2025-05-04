# YouTube Direct Downloader

A Next.js application for downloading YouTube videos directly to your device without relying on third-party services.

![YouTube Downloader Screenshot](https://via.placeholder.com/800x400?text=YouTube+Downloader)

## Features

- Direct download of YouTube videos in MP4 format
- Audio-only downloads in MP3 format
- Clean, responsive UI with modern design
- Server-side processing using yt-dlp for maximum reliability
- No reliance on external services or APIs
- Temporary file caching for improved performance
- Progress indicators for better user experience

## Technology Stack

- **Frontend**: Next.js, React, Tailwind CSS
- **Backend**: Node.js with Next.js API routes
- **Video Processing**: yt-dlp, ffmpeg
- **Styling**: Tailwind CSS with custom components

## Getting Started

### Prerequisites

This application requires:

- Node.js (v14 or newer)
- yt-dlp installed on your system
- ffmpeg installed on your system

For detailed installation instructions for yt-dlp and ffmpeg, see the [setup guide](setup-yt-dlp.md).

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/youtube-downloader.git
cd youtube-downloader
```

2. Install dependencies:
```bash
npm install
```

3. Make sure yt-dlp and ffmpeg are installed and accessible from PATH.

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) with your browser.

### Building for Production

```bash
npm run build
npm start
```

## How It Works

1. When a user enters a YouTube URL, the application extracts the video ID.
2. When the download button is clicked, an API request is sent to the server.
3. The server uses yt-dlp to download the video in the requested format.
4. The file is temporarily stored on the server and streamed back to the user.
5. Temporary files are automatically cleaned up after a configurable time period.

## API Endpoints

### `/api/download`

**Method**: GET  
**Parameters**:
- `url`: YouTube video URL (required)
- `format`: Either 'mp3' or 'mp4' (required)

**Response**: Streams the downloaded file to the client.

## Limitations

- Large files may take longer to process
- Server needs sufficient disk space for temporary files
- Downloads may fail if YouTube changes their site structure
- Not suitable for bulk downloading

## Legal Considerations

This tool is provided for educational purposes and for downloading content you have the right to access. Please respect copyright laws and YouTube's Terms of Service.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - The backbone of the video downloading functionality
- [Next.js](https://nextjs.org/) - The React framework used
- [Tailwind CSS](https://tailwindcss.com/) - For the UI design 