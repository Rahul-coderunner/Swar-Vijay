import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://xryusvsxrjivmsfdoaax.supabase.co";
const serviceKey = "sb_secret__YB6tpj4ciF5CGF50uzd8Q_G6JZD6zT";
const adminClient = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

async function debugTelegramFlow() {
  console.log("=== 1. LATEST PENDING PROFILES ===");
  const { data: profiles } = await adminClient
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  console.log("Profiles found:", profiles);

  console.log("\n=== 2. TELEGRAM SETTINGS IN DB ===");
  const { data: tg } = await adminClient.from("telegram_settings").select("*");
  console.log("Settings:", tg);

  const botToken = tg?.[0]?.bot_token || "8809387131:AAEi2ZQmfSCMCKK_XBlEo7v2JmbOckYgjVI";
  const adminChatId = tg?.[0]?.admin_chat_id;

  if (profiles && profiles.length > 0) {
    const latest = profiles[0];
    console.log(`\n=== 3. TESTING DIRECT TELEGRAM SEND FOR ${latest.email} (chatId: ${adminChatId}) ===`);
    
    if (!adminChatId) {
      console.error("CRITICAL: admin_chat_id is NULL or EMPTY in database!");
      return;
    }

    const lines = [
      "🔔 <b>NEW APPROVAL REQUEST (LIVE DEBUG)</b>",
      "─────────────",
      `👤 <b>Name:</b> ${latest.full_name || "—"}`,
      `📧 <b>Email:</b> <code>${latest.email}</code>`,
      `🎭 <b>Role:</b> <b>ARTIST</b> · ${latest.category || "Keyboard"}`,
      `📱 <b>Phone:</b> ${latest.phone ?? "—"}`,
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
              { text: "🟢 APPROVE ACCOUNT", callback_data: `approve:${latest.id}` },
              { text: "🔴 REJECT", callback_data: `reject:${latest.id}` },
            ],
          ],
        },
      }),
    });

    const resJson = await res.json();
    console.log("Telegram API Direct Send Result:", JSON.stringify(resJson, null, 2));
  }
}

debugTelegramFlow();
