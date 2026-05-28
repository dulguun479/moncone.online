async function run() {
  const res = await fetch("https://moncone.online/api/public/telegram/check-env");
  const data = await res.json();
  console.log("Live Env Status:", JSON.stringify(data, null, 2));
}

run();
