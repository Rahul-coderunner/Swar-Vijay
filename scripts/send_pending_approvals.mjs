import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://xryusvsxrjivmsfdoaax.supabase.co";
const serviceKey = "sb_secret__YB6tpj4ciF5CGF50uzd8Q_G6JZD6zT";
const botToken = "8809387131:AAEi2ZQmfSCMCKK_XBlEo7v2JmbOckYgjVI";
const adminClient = createClient(supabaseUrl, serviceKey);

async function checkPendingAndSend() {
  const { data: profiles } = await adminClient.from("profiles").select("*").eq("status", "pending");
  console.log("Pending profiles:", profiles);

  const { data: botSettings } = await adminClient.from("telegram_settings").select("*");
  console.log("Bot settings in DB:", botSettings);

  const adminChatId = botSettings[0]?.admin_chat_id;

  if (profiles && profiles.length > 0 && adminChatId) {
    for (const p of profiles) {
      console.log(`Sending Telegram approval card for ${p.full_name} (${p.email}) to chat ${adminChatId}...`);
      const lines = [
        "🔔 <b>NEW APPROVAL REQUEST</b>",
        "─────────────",
        `👤 <b>Name:</b> ${p.full_name || "—"}`,
        `📧 <b>Email:</b> <code>${p.email}</code>`,
        `🎭 <b>Role:</b> <b>ARTIST</b>${p.category ? ` · ${p.category}` : ""}`,
        `📱 <b>Phone:</b> ${p.phone ?? "—"}`,
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
                { text: "🟢 APPROVE ACCOUNT", callback_data: `approve:${p.id}` },
                { text: "🔴 REJECT", callback_data: `reject:${p.id}` },
              ],
            ],
          },
        }),
      });

      const resJson = await res.json();
      console.log("Send approval result:", resJson);
    }
  }
}

checkPendingAndSend();
