# YouTube Downloader

A web application that enables administrators to input a YouTube URL and provide users with download options for both MP3 and MP4 formats. This application uses yt-dlp, a powerful and actively maintained YouTube extraction library that handles encrypted streams correctly.

## Features

- Single URL input for YouTube videos
- Reliable processing of YouTube links with yt-dlp
- Handles encrypted or protected streams
- Dual download options (MP3 audio and MP4 video)
- Clean, responsive UI with minimal design
- Proper error handling for invalid URLs or API failures

## Tech Stack

- Next.js 14+ with TypeScript
- Tailwind CSS for styling
- yt-dlp-wrap for YouTube download functionality (uses yt-dlp under the hood)
- API Routes for backend processing

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- yt-dlp binary installed on your system (can be installed via pip: `pip install yt-dlp`)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd youtube-downloader
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Ensure yt-dlp is installed on your system:
```bash
# Using pip (Python package manager)
pip install yt-dlp

# Verify installation
yt-dlp --version
```

### Running the Application

Development mode:
```bash
npm run dev
# or
yarn dev
```

Build for production:
```bash
npm run build
# or
yarn start
```

## Usage

1. Visit the application in your browser (default: http://localhost:3000)
2. Enter a YouTube video URL in the input field
3. Click "Process Video" to generate download options
4. Once processed, click either the MP3 or MP4 download button
5. The file will begin downloading automatically

## API Dependencies

- **yt-dlp**: A powerful command-line program used for downloading videos from YouTube and other video sites
- **yt-dlp-wrap**: Node.js wrapper for yt-dlp command-line tool
- **Next.js API Routes**: Used for handling server-side API requests and streaming content

## Important Notes

- This application is for demonstration purposes
- yt-dlp is regularly updated to handle YouTube's changes to their platform
- For a production environment, you would need to:
  - Implement proper authentication for administrators
  - Set up a more robust streaming system with caching
  - Add rate limiting and security measures
  - Consider legal implications of YouTube content download
  - Ensure regular updates of the yt-dlp binary

## License

This project is licensed under the MIT License - see the LICENSE file for details. 