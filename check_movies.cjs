const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://voyvmtztvqttrtbughpb.supabase.co";
const supabaseKey = "sb_publishable_enOJezjXm7pFGyw_NWRD0g_ROYijeKb";
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from("movies").select("*");
  if (error) {
    console.error("Error fetching movies:", error.message);
  } else {
    console.log("Existing movies count:", data.length);
    console.log("Movies:", JSON.stringify(data, null, 2));
  }
}

run();
