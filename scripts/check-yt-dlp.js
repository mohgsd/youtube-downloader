const { exec } = require('child_process');
const chalk = require('chalk');

console.log(chalk.blue('Checking for required dependencies...'));

// Function to check if a command is available
function checkCommand(command, name, installInstructions) {
  return new Promise((resolve) => {
    exec(`${command} --version`, (error, stdout) => {
      if (error) {
        console.log(chalk.red(`❌ ${name} not found!`));
        console.log(chalk.yellow(`Please install ${name} to use this application.`));
        console.log(chalk.yellow(installInstructions));
        resolve(false);
      } else {
        const version = stdout.trim();
        console.log(chalk.green(`✅ ${name} found: ${version}`));
        resolve(true);
      }
    });
  });
}

// Instructions for installation
const ytDlpInstructions = `
Install yt-dlp:
- Windows: Download from https://github.com/yt-dlp/yt-dlp/releases
- macOS: brew install yt-dlp
- Linux: sudo apt install yt-dlp or sudo pip install yt-dlp
For more details, see setup-yt-dlp.md
`;

const ffmpegInstructions = `
Install ffmpeg:
- Windows: Download from https://ffmpeg.org/download.html
- macOS: brew install ffmpeg
- Linux: sudo apt install ffmpeg
For more details, see setup-yt-dlp.md
`;

// Main function to check all dependencies
async function checkDependencies() {
  console.log(chalk.blue('The YouTube Downloader requires yt-dlp and ffmpeg to work.'));
  
  const ytDlpFound = await checkCommand('yt-dlp', 'yt-dlp', ytDlpInstructions);
  const ffmpegFound = await checkCommand('ffmpeg', 'ffmpeg', ffmpegInstructions);
  
  if (ytDlpFound && ffmpegFound) {
    console.log(chalk.green.bold('✅ All required dependencies are installed!'));
  } else {
    console.log(chalk.yellow.bold('⚠️ Some dependencies are missing. Please install them before using the application.'));
    console.log(chalk.blue('For detailed installation instructions, see setup-yt-dlp.md'));
  }
}

checkDependencies(); 