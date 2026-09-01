// Robust Telegram Poller for Swar Vijay Bot
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "https://xryusvsxrjivmsfdoaax.supabase.co";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "sb_secret__YB6tpj4ciF5CGF50uzd8Q_G6JZD6zT";
const botToken = process.env.TELEGRAM_BOT_TOKEN || "8809387131:AAEi2ZQmfSCMCKK_XBlEo7v2JmbOckYgjVI";

const supabase = createClient(supabaseUrl, serviceKey);

let offset = 0;

async function sendTelegram(method, body) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return await res.json();
  } catch (e) {
    console.error(`Telegram ${method} error:`, e);
  }
}

async function poll() {
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates?offset=${offset}&timeout=30`);
    const data = await res.json();

    if (data.ok && Array.isArray(data.result)) {
      for (const update of data.result) {
        offset = update.update_id + 1;

        // Handle /start message
        if (update.message && update.message.text && update.message.text.startsWith("/start")) {
          const chatId = String(update.message.chat.id);
          const firstName = update.message.from?.first_name || "Admin";

          await supabase.from("telegram_settings").upsert({
            id: "default",
            bot_token: botToken,
            bot_username: "Swarvijay_bot",
            admin_chat_id: chatId,
            updated_at: new Date().toISOString(),
          }, { onConflict: "id" });

          await sendTelegram("sendMessage", {
            chat_id: chatId,
            text: `✅ <b>Namaskar ${firstName} Ji!</b>\n\nAapka Telegram account Swar Vijay Academy Bot se successfully <b>LINK</b> ho gaya hai. Ab sabhi approval requests yahan aayengi! 🚀`,
            parse_mode: "HTML",
          });
        }

        // Handle button clicks (APPROVE / REJECT)
        if (update.callback_query) {
          const cb = update.callback_query;
          const [action, userId] = (cb.data || "").split(":");
          const chatId = cb.message?.chat?.id;
          const msgId = cb.message?.message_id;

          if (action === "approve" && userId) {
            await supabase.from("profiles").update({ status: "approved" }).eq("id", userId);
            
            await sendTelegram("editMessageText", {
              chat_id: chatId,
              message_id: msgId,
              text: `${cb.message?.text}\n\n✅ <b>ACCOUNT APPROVED! (User can now access dashboard)</b>`,
              parse_mode: "HTML",
            });
            await sendTelegram("answerCallbackQuery", {
              callback_query_id: cb.id,
              text: "✅ Account approved successfully!",
            });
          } else if (action === "reject" && userId) {
            await supabase.from("profiles").update({ status: "rejected" }).eq("id", userId);

            await sendTelegram("editMessageText", {
              chat_id: chatId,
              message_id: msgId,
              text: `${cb.message?.text}\n\n❌ <b>ACCOUNT REJECTED</b>`,
              parse_mode: "HTML",
            });
            await sendTelegram("answerCallbackQuery", {
              callback_query_id: cb.id,
              text: "❌ Account rejected.",
            });
          }
        }
      }
    }
  } catch (e) {
    console.error("Polling loop error:", e);
  }

  setTimeout(poll, 1000);
}

console.log("Starting Swar Vijay Telegram Poller...");
poll();
