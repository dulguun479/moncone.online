// search_mongolian_movies.mjs — Find YouTube video IDs for Mongolian films
// Run: node search_mongolian_movies.mjs

import { execSync } from "child_process";
import { writeFileSync } from "fs";

const searches = [
  { query: "Цогт тайж МУСК кино бүтэн", key: "tsogt_taij" },
  { query: "Тунгалаг Тамир МУСК 1-р анги", key: "tungalag_1" },
  { query: "Тунгалаг Тамир МУСК 2-р анги", key: "tungalag_2" },
  { query: "Ардын Элч монгол кино", key: "ardyn_elch" },
  { query: "Хайрын мөрөөр монгол кино", key: "hairyn_mooroor" },
  { query: "Нутгийн заан монгол кино бүтэн", key: "nutgiin_zaan" },
  { query: "Монгол кино бүтэн 1980", key: "mongol_1980" },
  { query: "Цэцэн хаан монгол кино бүтэн", key: "tsetseg_haan" },
];

const results = {};

for (const { query, key } of searches) {
  try {
    console.log(`\nSearching: ${query}`);
    const out = execSync(
      `yt-dlp.exe "ytsearch3:${query}" --print "%(id)s|||%(title)s|||%(duration)s" --no-download --no-warnings --ignore-errors`,
      { encoding: "utf8", timeout: 30000 }
    );
    const lines = out.trim().split("\n").filter(Boolean);
    results[key] = lines.map((l) => {
      const [id, title, duration] = l.split("|||");
      return { id: id?.trim(), title: title?.trim(), duration: parseInt(duration || "0") };
    });
    console.log("Found:", results[key]);
  } catch (e) {
    console.log(`Error for ${key}:`, e.message.substring(0, 100));
    results[key] = [];
  }
}

writeFileSync("movie_search_results.json", JSON.stringify(results, null, 2), "utf8");
console.log("\n\nResults saved to movie_search_results.json");
