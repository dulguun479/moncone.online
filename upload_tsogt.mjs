// upload_tsogt.mjs - Re-download and upload tsogt_taij to remote R2
import { spawnSync } from "child_process";
import { existsSync } from "fs";

const FILE = "tsogt_taij.mp4";
const KEY = "videos/tsogt_taij.mp4";
const YT_ID = "pPNvcQQhL4E";
const BUCKET = "kinofiles";

// Download if not present
if (!existsSync(FILE)) {
  console.log("📥 Downloading Цогт Тайж at 360p (to stay under 300MB limit)...");
  spawnSync("yt-dlp.exe", [
    `https://www.youtube.com/watch?v=${YT_ID}`,
    "-f", "bestvideo[height<=360][ext=mp4]+bestaudio[ext=m4a]/best[height<=360]/worst[ext=mp4]/18",
    "-o", FILE,
    "--merge-output-format", "mp4",
    "--ffmpeg-location", ".\\ffmpeg.exe",
    "--no-playlist", "--no-warnings",
  ], { stdio: "inherit", timeout: 3600000 });
} else {
  console.log("✅ File already downloaded:", FILE);
}

if (!existsSync(FILE)) {
  console.error("❌ Download failed!"); process.exit(1);
}

console.log("\n☁️  Uploading to R2 (remote)...");
const result = spawnSync("npx", [
  "wrangler", "r2", "object", "put", `${BUCKET}/${KEY}`,
  "--file", FILE,
  "--content-type", "video/mp4",
  "--remote",
], { stdio: "inherit", timeout: 7200000, shell: true });

if (result.status === 0) {
  console.log(`\n✅ Uploaded: https://pub-3f0479fff69b4008bc547f629ae1764b.r2.dev/${KEY}`);
} else {
  console.error("❌ Upload failed");
}
