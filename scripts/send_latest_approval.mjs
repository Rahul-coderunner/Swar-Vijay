import { createClient } from "@supabase/supabase-js";

const botToken = "8809387131:AAEi2ZQmfSCMCKK_XBlEo7v2JmbOckYgjVI";
const supabaseUrl = "https://xryusvsxrjivmsfdoaax.supabase.co";
const serviceKey = "sb_secret__YB6tpj4ciF5CGF50uzd8Q_G6JZD6zT";
const adminClient = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

async function sendLatestApproval() {
  const { data: p } = await adminClient
    .from("profiles")
    .select("*")
    .eq("id", "ad834c20-2882-407f-93f7-ef780ee58ac4")
    .single();

  console.log("Target Profile:", p);

  const { data: botSettings } = await adminClient.from("telegram_settings").select("*");
  const adminChatId = botSettings[0]?.admin_chat_id || "6800916173";

  if (p) {
    const lines = [
      "🔔 <b>NEW ARTIST REGISTRATION</b>",
      "─────────────",
      `👤 <b>Name:</b> ${p.full_name || "—"}`,
      `📧 <b>Email:</b> <code>${p.email}</code>`,
      `🎭 <b>Role:</b> <b>ARTIST</b> · ${p.category || "Keyboard"}`,
      `📱 <b>Phone:</b> ${p.phone ?? "—"}`,
      "─────────────",
      "<i>Click Approve below to unlock access for this user:</i>"
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
              { text: "🟢 APPROVE ACCOUNT", callback_data: `approve:${p.id}` },
              { text: "🔴 REJECT", callback_data: `reject:${p.id}` },
            ],
          ],
        },
      }),
    });

    const resJson = await res.json();
    console.log("Telegram Approval Card Send Result:", resJson);
  }
}

sendLatestApproval();
