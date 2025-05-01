declare module 'yt-dlp-wrap' {
  export interface YtDlpVideoInfo {
    title: string;
    thumbnail: string;
    description: string;
    duration: number;
    uploader: string;
    view_count: number;
    like_count: number;
    upload_date: string;
    formats: {
      format_id: string;
      url: string;
      ext: string;
      format_note?: string;
      acodec: string;
      vcodec: string;
      width?: number;
      height?: number;
      resolution?: string;
    }[];
  }

  export interface YtDlpOptions {
    dumpSingleJson?: boolean;
    noCheckCertificates?: boolean;
    noWarnings?: boolean;
    preferFreeFormats?: boolean;
    addHeader?: string[];
    output?: string;
    format?: string;
    extractAudio?: boolean;
    audioFormat?: string;
    audioQuality?: string;
    limitRate?: string;
    [key: string]: any;
  }

  export default class YtDlpWrap {
    constructor(ytDlpBinaryPath?: string);
    setBinaryPath(ytDlpBinaryPath: string): void;
    getVideoInfo(url: string): Promise<YtDlpVideoInfo>;
    execPromise(args: string[]): Promise<string>;
    downloadFile(url: string, outputFile: string, options?: YtDlpOptions): Promise<string>;
  }
} 