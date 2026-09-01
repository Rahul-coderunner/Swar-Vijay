
const { createClient } = require("@supabase/supabase-js");

const BOT_TOKEN = "8603250040:AAFwrpW6Xrpst7Onc5t94TPB_GABBtRfzTo";
const SUPABASE_URL = "https://xryusvsxrjivmsfdoaax.supabase.co";
const SUPABASE_SERVICE_KEY = "sb_secret__YB6tpj4ciF5CGF50uzd8Q_G6JZD6zT";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function callTelegram(method, body = {}) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    return await res.json();
  } catch (err) {
    console.error(`callTelegram ${method} error:`, err.message);
    return { ok: false };
  }
}

let offset = 0;
const lastNotifiedTime = new Map();

async function checkPendingUsers() {
  try {
    const { data: settings } = await supabase
      .from("telegram_settings")
      .select("admin_chat_id")
      .eq("id", "default")
      .single();

    if (!settings || !settings.admin_chat_id) return;

    const { data: pendingProfiles } = await supabase
      .from("profiles")
      .select("id, full_name, email, phone, category, status, updated_at")
      .eq("status", "pending");

    if (pendingProfiles && pendingProfiles.length > 0) {
      for (const p of pendingProfiles) {
        const lastSent = lastNotifiedTime.get(p.id);
        const updatedAt = p.updated_at ? new Date(p.updated_at).getTime() : 0;
        
        // Re-notify if not notified yet OR if updated_at is newer than last notification
        if (lastSent && updatedAt <= lastSent) continue;

        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", p.id);
        const role = roles && roles[0] ? roles[0].role : "artist";

        const lines = [
          "?? <b>NEW APPROVAL REQUEST</b>",
          "-------------",
          `?? <b>Name:</b> ${p.full_name || "—"}`,
          `?? <b>Email:</b> <code>${p.email}</code>`,
          `?? <b>Role:</b> <b>${role.toUpperCase()}</b>${p.category ? ` · ${p.category}` : ""}`,
          `?? <b>Phone:</b> ${p.phone || "—"}`,
          "-------------",
          "<i>Approve karne par user bina re-login ke turant app me open ho jayega.</i>"
        ];

        const res = await callTelegram("sendMessage", {
          chat_id: settings.admin_chat_id,
          text: lines.join("\n"),
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "?? APPROVE ACCOUNT", callback_data: `approve:${p.id}` },
                { text: "?? REJECT", callback_data: `reject:${p.id}` },
              ],
            ],
          },
        });

        if (res.ok) {
          lastNotifiedTime.set(p.id, Date.now());
          console.log(`[SUCCESS] Sent Telegram approval request for ${p.email} (${p.id})`);
        }
      }
    }
  } catch (err) {
    console.error("Error in checkPendingUsers:", err.message);
  }
}

async function pollUpdates() {
  try {
    const data = await callTelegram("getUpdates", { offset, timeout: 5 });
    if (data.ok && Array.isArray(data.result)) {
      for (const update of data.result) {
        offset = update.update_id + 1;

        if (update.message && update.message.chat) {
          const chatId = String(update.message.chat.id);
          const text = (update.message.text || "").trim();

          if (text.startsWith("/start")) {
            await supabase.from("telegram_settings").upsert({
              id: "default",
              bot_token: BOT_TOKEN,
              bot_username: "Swarvijay_bot",
              admin_chat_id: chatId,
              updated_at: new Date().toISOString()
            }, { onConflict: "id" });

            await callTelegram("sendMessage", {
              chat_id: chatId,
              text: "? Swar Vijay Admin Chat Linked Successfully!\n\nAb jab bhi koi artist, kathakar ya admin signup karega, aapko yahan instant Approve (??) / Reject (??) ka button aayega."
            });
            console.log("Linked admin_chat_id:", chatId);
          }
        }

        if (update.callback_query && update.callback_query.data) {
          const cq = update.callback_query;
          const chatId = cq.message ? String(cq.message.chat.id) : null;
          const [action, userId] = cq.data.split(":");

          if ((action === "approve" || action === "reject") && userId) {
            const status = action === "approve" ? "approved" : "rejected";
            const { data: updated } = await supabase
              .from("profiles")
              .update({ status, updated_at: new Date().toISOString() })
              .eq("id", userId)
              .select("full_name, email, category")
              .single();

            await callTelegram("answerCallbackQuery", {
              callback_query_id: cq.id,
              text: status === "approved" ? "Account Approved ??" : "Account Rejected ??"
            });

            if (cq.message && cq.message.message_id && updated) {
              await callTelegram("editMessageText", {
                chat_id: chatId,
                message_id: cq.message.message_id,
                parse_mode: "HTML",
                text: `${status === "approved" ? "?? <b>APPROVED</b>" : "?? <b>REJECTED</b>"}\n\n?? <b>${updated.full_name || updated.email}</b>\n?? <code>${updated.email}</code>\n\n? <i>User ke phone me app apne aap open ho gaya hai.</i>`
              });
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("Polling error:", err.message);
  }
}

async function loop() {
  await pollUpdates();
  await checkPendingUsers();
  setTimeout(loop, 2000);
}

callTelegram("deleteWebhook").then(() => {
  console.log("Telegram listener initialized with resend support...");
  loop();
});

