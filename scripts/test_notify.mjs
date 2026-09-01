import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://xryusvsxrjivmsfdoaax.supabase.co";
const serviceKey = "sb_secret__YB6tpj4ciF5CGF50uzd8Q_G6JZD6zT";
const botToken = "8809387131:AAEi2ZQmfSCMCKK_XBlEo7v2JmbOckYgjVI";
const adminClient = createClient(supabaseUrl, serviceKey);

async function testNotify() {
  const { data: botSettings } = await adminClient.from("telegram_settings").select("*");
  console.log("Bot settings:", botSettings);

  const adminChatId = botSettings[0]?.admin_chat_id;
  console.log("Admin Chat ID to notify:", adminChatId);

  const lines = [
    "🔔 <b>NEW ARTIST REGISTRATION TEST</b>",
    "─────────────",
    "👤 <b>Name:</b> Vijay Bodkhe",
    "📧 <b>Email:</b> <code>writesmindcontent@gmail.com</code>",
    "🎭 <b>Role:</b> <b>ARTIST</b> · Keyboard",
    "📱 <b>Phone:</b> 9876543210",
    "─────────────",
    "<i>Live testing approval workflow</i>"
  ];

  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: adminChatId,
      text: lines.join("\n"),
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "🟢 APPROVE ACCOUNT", callback_data: `approve:test-id` },
            { text: "🔴 REJECT", callback_data: `reject:test-id` },
          ],
        ],
      },
    }),
  });

  const resJson = await res.json();
  console.log("Telegram sendMessage Response:", resJson);
}

testNotify();
