// remote_upload.mjs — Upload posters AND videos to Cloudflare R2 (remote)
import { spawnSync } from "child_process";
import { existsSync } from "fs";

const BUCKET = "kinofiles";
const R2_BASE = "https://pub-3f0479fff69b4008bc547f629ae1764b.r2.dev";

function r2put(localFile, r2Key, contentType) {
  console.log(`\n☁️  Uploading ${localFile} → ${r2Key}`);
  if (!existsSync(localFile)) {
    console.log(`❌ File not found: ${localFile}`);
    return null;
  }
  const result = spawnSync(
    "npx",
    ["wrangler", "r2", "object", "put", `${BUCKET}/${r2Key}`,
      "--file", localFile,
      "--content-type", contentType,
      "--remote",
    ],
    { stdio: "inherit", timeout: 7200000, shell: true }
  );
  if (result.status !== 0) {
    console.log(`❌ Upload failed for ${localFile}`);
    return null;
  }
  const url = `${R2_BASE}/${r2Key}`;
  console.log(`✅ ${url}`);
  return url;
}

// Upload posters first (fast)
console.log("\n=== UPLOADING POSTERS ===");
const posters = {
  tsogt_taij:    r2put("tsogt_taij_poster.png",    "posters/tsogt_taij_new.png",    "image/png"),
  ardyn_elch:    r2put("ardyn_elch_poster.png",    "posters/ardyn_elch.png",        "image/png"),
  tungalag_tamir: r2put("tungalag_tamir_poster.png","posters/tungalag_tamir.png",    "image/png"),
  unur_bul:       r2put("unur_bul_poster.png",      "posters/unur_bul.png",          "image/png"),
};

// Upload videos (large — re-upload with --remote)
console.log("\n=== UPLOADING VIDEOS ===");

// Check if local video files still exist from previous run
const videos = [
  { file: "ardyn_elch.mp4",    key: "videos/ardyn_elch.mp4" },
  { file: "tsogt_taij.mp4",    key: "videos/tsogt_taij.mp4" },
  { file: "tungalag_tamir.mp4",key: "videos/tungalag_tamir.mp4" },
  { file: "unur_bul.mp4",      key: "videos/unur_bul.mp4" },
];

for (const v of videos) {
  if (!existsSync(v.file)) {
    console.log(`⚠️  ${v.file} not found locally — re-downloading...`);
    // Re-download from YouTube if file was deleted
    const ids = {
      "ardyn_elch.mp4":     "wcZ0O8PgCdo",
      "tsogt_taij.mp4":     "pPNvcQQhL4E",
      "tungalag_tamir.mp4": "mh4uuuMqGwQ",
      "unur_bul.mp4":       "4UX8_iMP1d0",
    };
    const youtubeId = ids[v.file];
    if (youtubeId) {
      spawnSync("yt-dlp.exe", [
        `https://www.youtube.com/watch?v=${youtubeId}`,
        "-f", "bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[height<=480]/best",
        "-o", v.file,
        "--merge-output-format", "mp4",
        "--ffmpeg-location", ".\\ffmpeg.exe",
        "--no-playlist", "--no-warnings",
      ], { stdio: "inherit", timeout: 3600000 });
    }
  }
  r2put(v.file, v.key, "video/mp4");
}

console.log("\n\n✅ All uploads done!");
console.log("\nPoster URLs:");
for (const [k,v] of Object.entries(posters)) {
  console.log(`  ${k}: ${v}`);
}
