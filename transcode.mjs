import { spawn } from "child_process";
import path from "path";
import fs from "fs";

/**
 * moncone Local HLS Video Transcoder Pipeline
 * 
 * This script runs FFmpeg locally to convert standard MP4 files into highly secure, 
 * adaptive segmented HLS streaming playlists (.m3u8 and .ts segments) to prevent 
 * browser download sniffing and support auto quality adjustments.
 */

const FFMPEG_PATH = path.join(process.cwd(), "ffmpeg.exe");

if (!fs.existsSync(FFMPEG_PATH)) {
  console.error(`❌ Error: ffmpeg.exe not found in working directory: ${FFMPEG_PATH}`);
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.length < 1 || args.includes("--help") || args.includes("-h")) {
  console.log(`
🎬 moncone Local HLS Transcoder
Usage:
  node transcode.mjs <input_mp4_file> [output_directory_name]

Example:
  node transcode.mjs unur_bul.mp4 unur_bul
  `);
  process.exit(0);
}

const inputPath = path.resolve(args[0]);
if (!fs.existsSync(inputPath)) {
  console.error(`❌ Error: Input file does not exist: ${inputPath}`);
  process.exit(1);
}

const outputName = args[1] || path.basename(inputPath, path.extname(inputPath));
const outputDir = path.join(process.cwd(), "public", "videos", outputName);

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log(`🚀 Starting HLS Transcoding Pipeline for: ${path.basename(inputPath)}`);
console.log(`📂 Output destination: ${outputDir}`);

// Multi-bitrate HLS Transcoding Parameters
const ffmpegArgs = [
  "-y",
  "-i", inputPath,
  // Video filter & codecs settings for H.264
  "-preset", "fast",
  "-g", "48", // Keyframe interval (2 seconds for 24fps)
  "-sc_threshold", "0",
  
  // Mapping 3 streams: 480p, 720p, 1080p
  "-map", "0:v:0", "-map", "0:a:0",
  "-map", "0:v:0", "-map", "0:a:0",
  "-map", "0:v:0", "-map", "0:a:0",
  
  // Stream 0: 480p (Low)
  "-s:v:0", "854x480",
  "-c:v:0", "libx264", "-b:v:0", "800k", "-maxrate:v:0", "856k", "-bufsize:v:0", "1200k",
  
  // Stream 1: 720p (Medium)
  "-s:v:1", "1280x720",
  "-c:v:1", "libx264", "-b:v:1", "1800k", "-maxrate:v:1", "1926k", "-bufsize:v:1", "2700k",
  
  // Stream 2: 1080p (High)
  "-s:v:2", "1920x1080",
  "-c:v:2", "libx264", "-b:v:2", "3000k", "-maxrate:v:2", "3210k", "-bufsize:v:2", "4500k",
  
  // Audio settings
  "-c:a", "aac", "-b:a", "128k", "-ar", "48000",
  
  // HLS Packaging Parameters
  "-f", "hls",
  "-hls_time", "6", // 6 second segments
  "-hls_playlist_type", "vod",
  "-hls_segment_filename", path.join(outputDir, "stream_%v_%03d.ts"),
  
  // Master playlist mapping
  "-master_pl_name", "master.m3u8",
  "-var_stream_map", "v:0,a:0 v:1,a:1 v:2,a:2",
  
  path.join(outputDir, "playlist_%v.m3u8")
];

const proc = spawn(FFMPEG_PATH, ffmpegArgs);

proc.stdout.on("data", (data) => {
  console.log(data.toString());
});

// FFmpeg outputs progress to stderr
let lastPercent = "";
proc.stderr.on("data", (data) => {
  const line = data.toString();
  // Simple extraction of current frame/time to show basic feedback
  const matchTime = line.match(/time=(\d{2}:\d{2}:\d{2}.\d{2})/);
  const matchSpeed = line.match(/speed=\s*(\d+.\d+x)/);
  if (matchTime) {
    console.log(`⏳ Progress Time: ${matchTime[1]} | Speed: ${matchSpeed ? matchSpeed[1] : ""}`);
  }
});

proc.on("close", (code) => {
  if (code === 0) {
    console.log(`\n✅ Success! HLS adaptive streams created in: ${outputDir}`);
    console.log(`👉 Master Playlist File: public/videos/${outputName}/master.m3u8`);
    console.log(`\nTo host this on Cloudflare R2, upload the entire folder: public/videos/${outputName}/`);
  } else {
    console.error(`❌ FFmpeg process failed with exit code: ${code}`);
  }
});
