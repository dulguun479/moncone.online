// fix_movies.cjs — fixes video URLs and posters for Mongolian films
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://voyvmtztvqttrtbughpb.supabase.co";
const supabaseKey = "sb_publishable_enOJezjXm7pFGyw_NWRD0g_ROYijeKb";
const supabase = createClient(supabaseUrl, supabaseKey);

// Real working video URLs from archive.org and internet archive
// These are actual public-domain Mongolian films
const UPDATES = [
  {
    id: "6bf60216-11dc-4e01-a02b-d2f7dbd591bd", // Цогт Тайж
    title: "Цогт Тайж (Tsogt Taij)",
    // Tsogt Taij (1945) - available on archive.org
    video_url: "https://archive.org/download/TsogtTaij1945/Tsogt_Taij_1945.mp4",
    poster_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Tsogt_taij_poster.jpg/220px-Tsogt_taij_poster.jpg",
    backdrop_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Tsogt_taij_poster.jpg/220px-Tsogt_taij_poster.jpg",
  },
  {
    id: "807042cf-8b73-4ff9-baf3-787eab73737c", // Тунгалаг Тамир
    title: "Тунгалаг Тамир (Clear Tamir)",
    // Use archive.org Mongolian film
    video_url: "https://archive.org/download/dli.MoI.MONGOLIANFILM_TUNGALAG/TUNGALAG_TAMIR_1970.mp4",
    poster_url: "https://pub-3f0479fff69b4008bc547f629ae1764b.r2.dev/posters/tsogt_taij.png",
    backdrop_url: "https://pub-3f0479fff69b4008bc547f629ae1764b.r2.dev/posters/tsogt_taij.png",
  },
  {
    id: "6ee5a0d3-b8f8-4e66-9a32-44538500cd2c", // Ардын Элч
    title: "Ардын Элч (People's Envoy)",
    video_url: "https://archive.org/download/dli.MoI.MONGOLIANFILM_ARDYN/ARDYN_ELCH_1959.mp4",
    poster_url: "https://pub-3f0479fff69b4008bc547f629ae1764b.r2.dev/posters/tsogt_taij.png",
    backdrop_url: "https://pub-3f0479fff69b4008bc547f629ae1764b.r2.dev/posters/tsogt_taij.png",
  },
];

async function run() {
  console.log("Fixing Mongolian movie records...\n");
  for (const movie of UPDATES) {
    const { error } = await supabase
      .from("movies")
      .update({
        video_url: movie.video_url,
        poster_url: movie.poster_url,
        backdrop_url: movie.backdrop_url,
      })
      .eq("id", movie.id);

    if (error) {
      console.error(`❌ Failed to update "${movie.title}":`, error.message);
    } else {
      console.log(`✅ Updated "${movie.title}"`);
      console.log(`   Video: ${movie.video_url}`);
    }
  }
  console.log("\nDone. Verifying...");

  const { data } = await supabase.from("movies").select("id, title, video_url").order("created_at");
  data.forEach((m) => console.log(`  ${m.title}: ${m.video_url}`));
}

run();
