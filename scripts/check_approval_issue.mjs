import { createClient } from "@supabase/supabase-js";

const botToken = "8809387131:AAEi2ZQmfSCMCKK_XBlEo7v2JmbOckYgjVI";
const supabaseUrl = "https://xryusvsxrjivmsfdoaax.supabase.co";
const serviceKey = "sb_secret__YB6tpj4ciF5CGF50uzd8Q_G6JZD6zT";
const adminClient = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

async function checkStatus() {
  // 1. Check latest Telegram updates (to find user's chat ID)
  console.log("=== 1. CHECKING TELEGRAM UPDATES ===");
  const updRes = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates`);
  const upd = await updRes.json();
  console.log("Updates:", JSON.stringify(upd, null, 2));

  // 2. Check latest auth users and profiles
  console.log("\n=== 2. LATEST PROFILES ===");
  const { data: profiles } = await adminClient.from("profiles").select("*").order("created_at", { ascending: false }).limit(5);
  console.log("Latest profiles in DB:", profiles);

  // 3. Check telegram_settings in DB
  console.log("\n=== 3. TELEGRAM SETTINGS ===");
  const { data: tg } = await adminClient.from("telegram_settings").select("*");
  console.log("Current telegram_settings:", tg);
}

checkStatus();
