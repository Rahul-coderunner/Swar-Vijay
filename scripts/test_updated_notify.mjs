import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://xryusvsxrjivmsfdoaax.supabase.co";
const serviceKey = "sb_secret__YB6tpj4ciF5CGF50uzd8Q_G6JZD6zT";
const supabaseAdmin = createClient(supabaseUrl, serviceKey);

async function testUpdatedNotifyFlow() {
  console.log("1. Fetching latest pending profile...");
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, email, phone, category, status")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  console.log("Pending Profile:", profile);

  if (!profile) {
    console.log("No pending profile found.");
    return;
  }

  console.log("2. Fetching telegram_settings...");
  const { data: settings } = await supabaseAdmin
    .from("telegram_settings")
    .select("bot_token, admin_chat_id")
    .eq("id", "default")
    .single();

  console.log("Bot Settings:", settings);

  const botToken = settings?.bot_token;
  const adminChatId = settings?.admin_chat_id;

  if (!botToken || !adminChatId) {
    console.error("Missing token or chat ID");
    return;
  }

  console.log("3. Pinging Telegram directly with updated logic...");
  const lines = [
    "🔔 <b>NEW APPROVAL REQUEST (UPDATED NOTIFY)</b>",
    "─────────────",
    `👤 <b>Name:</b> ${profile.full_name || "—"}`,
    `📧 <b>Email:</b> <code>${profile.email}</code>`,
    `🎭 <b>Role:</b> <b>ARTIST</b> · ${profile.category || "Keyboard"}`,
    `📱 <b>Phone:</b> ${profile.phone ?? "—"}`,
    "─────────────",
    "<i>Approve karne par user bina re-login ke turant app me open ho jayega.</i>"
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
            { text: "🟢 APPROVE ACCOUNT", callback_data: `approve:${profile.id}` },
            { text: "🔴 REJECT", callback_data: `reject:${profile.id}` },
          ],
        ],
      },
    }),
  });

  const resJson = await res.json();
  console.log("Send Result:", resJson);
}

testUpdatedNotifyFlow();
