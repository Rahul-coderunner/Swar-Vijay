import { createClient } from "@supabase/supabase-js";

const newBotToken = "8809387131:AAEi2ZQmfSCMCKK_XBlEo7v2JmbOckYgjVI";
const supabaseUrl = "https://xryusvsxrjivmsfdoaax.supabase.co";
const serviceKey = "sb_secret__YB6tpj4ciF5CGF50uzd8Q_G6JZD6zT";
const adminClient = createClient(supabaseUrl, serviceKey);

async function setupNewBot() {
  console.log("1. Checking Telegram getMe with new bot token...");
  const res = await fetch(`https://api.telegram.org/bot${newBotToken}/getMe`);
  const botInfo = await res.json();
  console.log("Bot Info:", botInfo);

  if (!botInfo.ok) {
    console.error("Invalid token!");
    return;
  }

  const username = botInfo.result.username;
  console.log(`Bot username is: @${username}`);

  console.log("2. Updating telegram_settings in Supabase...");
  const { data, error } = await adminClient.from("telegram_settings").upsert({
    id: "default",
    bot_token: newBotToken,
    bot_username: username,
    admin_chat_id: null, // Reset so the admin can link with /start
    webhook_url: null,
    webhook_secret: null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "id" });

  if (error) {
    console.error("DB Update error:", error);
  } else {
    console.log("DB Updated successfully!");
  }
}

setupNewBot();
