// download_and_upload.mjs
// Downloads Mongolian movies from YouTube and uploads to Cloudflare R2

import { execSync, spawnSync } from "child_process";
import { existsSync, unlinkSync, statSync } from "fs";

const R2_BUCKET = "kinofiles";
const PUBLIC_URL_BASE = "https://pub-3f0479fff69b4008bc547f629ae1764b.r2.dev";

// Movies to download — confirmed real Mongolian films
const MOVIES = [
  {
    youtubeId: "wcZ0O8PgCdo",
    key: "videos/ardyn_elch.mp4",
    title: "Ардын Элч",
    localFile: "ardyn_elch.mp4",
  },
  {
    youtubeId: "pPNvcQQhL4E",
    key: "videos/tsogt_taij.mp4",
    title: "Цогт Тайж",
    localFile: "tsogt_taij.mp4",
  },
  {
    youtubeId: "mh4uuuMqGwQ",
    key: "videos/tungalag_tamir.mp4",
    title: "Тунгалаг Тамир 1-р анги",
    localFile: "tungalag_tamir.mp4",
  },
  {
    youtubeId: "4UX8_iMP1d0",
    key: "videos/unur_bul.mp4",
    title: "Унур Бул (1980)",
    localFile: "unur_bul.mp4",
  },
];

function formatSize(bytes) {
  const mb = bytes / (1024 * 1024);
  return mb > 1000 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(0)} MB`;
}

async function processMovie(movie) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`🎬 Processing: ${movie.title}`);
  console.log(`   YouTube ID: ${movie.youtubeId}`);
  console.log(`   R2 Key: ${movie.key}`);

  // Step 1: Download
  if (!existsSync(movie.localFile)) {
    console.log(`\n📥 Downloading...`);
    const dlResult = spawnSync(
      "yt-dlp.exe",
      [
        `https://www.youtube.com/watch?v=${movie.youtubeId}`,
        "-f", "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]/best[height<=720]/best",
        "-o", movie.localFile,
        "--merge-output-format", "mp4",
        "--ffmpeg-location", ".\\ffmpeg.exe",
        "--no-playlist",
        "--no-warnings",
        "--ignore-errors",
      ],
      { stdio: "inherit", timeout: 3600000 }
    );

    if (dlResult.status !== 0 && !existsSync(movie.localFile)) {
      // Try simpler format
      console.log("Retrying with simpler format...");
      const dlResult2 = spawnSync(
        "yt-dlp.exe",
        [
          `https://www.youtube.com/watch?v=${movie.youtubeId}`,
          "-f", "18/best",
          "-o", movie.localFile,
          "--no-playlist",
          "--no-warnings",
        ],
        { stdio: "inherit", timeout: 3600000 }
      );
    }
  } else {
    console.log(`✅ Already downloaded: ${movie.localFile}`);
  }

  if (!existsSync(movie.localFile)) {
    console.error(`❌ Download failed for ${movie.title}`);
    return null;
  }

  const size = statSync(movie.localFile).size;
  console.log(`✅ Downloaded: ${formatSize(size)}`);

  // Step 2: Upload to R2
  console.log(`\n☁️  Uploading to R2 (${R2_BUCKET}/${movie.key})...`);
  const uploadResult = spawnSync(
    "npx",
    ["wrangler", "r2", "object", "put", `${R2_BUCKET}/${movie.key}`,
      "--file", movie.localFile,
      "--content-type", "video/mp4",
    ],
    { stdio: "inherit", timeout: 7200000, shell: true }
  );

  if (uploadResult.status !== 0) {
    console.error(`❌ Upload failed for ${movie.title}`);
    return null;
  }

  const publicUrl = `${PUBLIC_URL_BASE}/${movie.key}`;
  console.log(`✅ Uploaded! URL: ${publicUrl}`);

  // Step 3: Clean up local file
  try {
    unlinkSync(movie.localFile);
    console.log(`🗑️  Deleted local file: ${movie.localFile}`);
  } catch (e) {
    console.log(`⚠️  Could not delete: ${e.message}`);
  }

  return publicUrl;
}

// Main
console.log("🇲🇳 Mongolian Movie Downloader & R2 Uploader");
console.log("=".repeat(60));

const results = {};
for (const movie of MOVIES) {
  const url = await processMovie(movie);
  if (url) results[movie.key] = { title: movie.title, url };
}

console.log("\n\n🎉 DONE! Results:");
for (const [key, val] of Object.entries(results)) {
  console.log(`  ${val.title}: ${val.url}`);
}

// Output as JSON for easy parsing
import { writeFileSync } from "fs";
writeFileSync("upload_results.json", JSON.stringify(results, null, 2), "utf8");
console.log("\nResults saved to upload_results.json");
