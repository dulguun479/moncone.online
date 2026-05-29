import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import crypto from "crypto";

/**
 * moncone Local HLS Video Transcoder Pipeline with AES-128 DRM-Lite Encryption
 * 
 * This script runs FFmpeg locally to convert standard MP4 files into highly secure, 
 * adaptive segmented HLS streaming playlists (.m3u8 and .ts segments) to prevent 
 * browser download sniffing and support auto quality adjustments.
 * Supports optional AES-128 encryption.
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
  node transcode.mjs <input_mp4_file> [output_directory_name] [--encrypt]

Example:
  node transcode.mjs unur_bul.mp4 unur_bul --encrypt
  `);
  process.exit(0);
}

const encryptIndex = args.indexOf("--encrypt");
const isEncrypted = encryptIndex !== -1;
if (isEncrypted) {
  args.splice(encryptIndex, 1);
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

let keyInfoPath = "";
if (isEncrypted) {
  console.log(`🔒 AES-128 HLS Stream Encryption enabled! Generating secure dynamic key...`);
  // Ensure the keys directory exists securely outside the public folder
  const keysDir = path.join(process.cwd(), "keys");
  if (!fs.existsSync(keysDir)) {
    fs.mkdirSync(keysDir, { recursive: true });
  }

  // Generate a random 16-byte key
  const encryptionKey = crypto.randomBytes(16);
  const keyFilePath = path.join(keysDir, `${outputName}.key`);
  fs.writeFileSync(keyFilePath, encryptionKey);
  console.log(`🔑 Key generated and saved securely at: ${keyFilePath}`);

  // Create key info file for FFmpeg
  // Format:
  // Key URL
  // Key File Path
  keyInfoPath = path.join(outputDir, "key_info.txt");
  const keyUri = `/api/public/transcode-key?id=${outputName}`;
  fs.writeFileSync(keyInfoPath, `${keyUri}\n${keyFilePath.replace(/\\/g, "/")}\n`);
}

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
  ...(isEncrypted ? ["-hls_key_info_file", keyInfoPath] : []),
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
  // Clean up temporary key info file
  if (keyInfoPath && fs.existsSync(keyInfoPath)) {
    fs.unlinkSync(keyInfoPath);
  }

  if (code === 0) {
    console.log(`\n✅ Success! HLS adaptive streams created in: ${outputDir}`);
    if (isEncrypted) {
      console.log(`🔒 Video stream is AES-128 encrypted. Decryption key is served via key server.`);
    }
    console.log(`👉 Master Playlist File: public/videos/${outputName}/master.m3u8`);
    console.log(`\nTo host this on Cloudflare R2, upload the entire folder: public/videos/${outputName}/`);
  } else {
    console.error(`❌ FFmpeg process failed with exit code: ${code}`);
  }
});
