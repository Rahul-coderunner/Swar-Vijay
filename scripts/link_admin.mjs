import { createClient } from "@supabase/supabase-js";

const botToken = "8809387131:AAEi2ZQmfSCMCKK_XBlEo7v2JmbOckYgjVI";
const adminChatId = "6800916173"; // Shree

const supabaseUrl = "https://xryusvsxrjivmsfdoaax.supabase.co";
const serviceKey = "sb_secret__YB6tpj4ciF5CGF50uzd8Q_G6JZD6zT";
const adminClient = createClient(supabaseUrl, serviceKey);

async function linkAndGreetAdmin() {
  console.log("1. Saving admin_chat_id to Supabase...");
  const { error } = await adminClient.from("telegram_settings").upsert({
    id: "default",
    bot_token: botToken,
    bot_username: "Swarvijay_bot",
    admin_chat_id: adminChatId,
    updated_at: new Date().toISOString(),
  }, { onConflict: "id" });

  if (error) console.error("Error saving DB:", error);
  else console.log("DB Updated with admin_chat_id:", adminChatId);

  console.log("2. Sending confirmation message to Admin on Telegram...");
  const welcomeText = `✅ <b>Namaskar Shree Ji!</b>\n\nAapka Telegram account Swar Vijay Music Academy ke naye Admin Bot se successfully <b>LINK</b> ho chuka hai! 🚀\n\nAb jab bhi koi naya Artist ya Kathakar register karega, aapko yahan instant notification aayega approval ke liye.`;

  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: adminChatId,
      text: welcomeText,
      parse_mode: "HTML",
    }),
  });

  const sendRes = await res.json();
  console.log("Telegram sendMessage Response:", sendRes);
}

linkAndGreetAdmin();
