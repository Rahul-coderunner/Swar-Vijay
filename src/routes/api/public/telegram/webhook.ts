import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "node:crypto";
import { callTelegram, resolveBot } from "@/lib/telegram.server";
import { findFreeArtists, formatFreeReplyHtml, parseFreeQuery } from "@/lib/free-artists";

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  artist: "Artist",
  kathakar: "Kathakar",
};

export const Route = createFileRoute("/api/public/telegram/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const bot = await resolveBot();
        if (!bot) {
          return new Response("Not configured", { status: 404 });
        }
        const header = request.headers.get("X-Telegram-Bot-Api-Secret-Token") ?? "";
        if (!safeEqual(header, bot.secret)) {
          return new Response("Unauthorized", { status: 401 });
        }

        const token = bot.token;
        const settings = { admin_chat_id: bot.adminChatId };
        const update = (await request.json()) as {
          message?: { chat?: { id?: number }; text?: string };
          callback_query?: {
            id: string;
            data?: string;
            message?: { chat?: { id?: number }; message_id?: number; text?: string };
          };
        };

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // 1) /start — is chat ko admin chat ke roop me link karo
        const msg = update.message;
        if (msg?.chat?.id) {
          const chatId = String(msg.chat.id);
          const text = (msg.text ?? "").trim();
          if (text.startsWith("/start")) {
            await supabaseAdmin
              .from("telegram_settings")
              .upsert(
                { id: "default", admin_chat_id: chatId, updated_at: new Date().toISOString() },
                { onConflict: "id" },
              );
            await callTelegram(token, "sendMessage", {
              chat_id: chatId,
              text: "✅ Swar Vijay Admin Chat linked successfully!\n\nAb jab bhi koi artist, kathakar ya admin signup karega, aapko yahan Approve / Reject ka message aayega.",
            });
            return Response.json({ ok: true });
          }
          if (settings.admin_chat_id === chatId && (text.startsWith("/free") || text.startsWith("/help"))) {
            if (text.startsWith("/help")) {
              await callTelegram(token, "sendMessage", {
                chat_id: chatId,
                parse_mode: "HTML",
                text:
                  "<b>Commands</b>\n" +
                  "/free 2026-09-01 2026-09-05 Tabla — in dates me free artists + contact\n" +
                  "/free kal Harmonium\n" +
                  "/pending — approval waale accounts",
              });
              return Response.json({ ok: true });
            }
            const q = parseFreeQuery(text.replace("/free", " "));
            try {
              const artists = await findFreeArtists(supabaseAdmin, q);
              await callTelegram(token, "sendMessage", {
                chat_id: chatId,
                parse_mode: "HTML",
                text: formatFreeReplyHtml(q, artists),
              });
            } catch (e) {
              await callTelegram(token, "sendMessage", {
                chat_id: chatId,
                text: e instanceof Error ? e.message : "Search fail ho gaya.",
              });
            }
            return Response.json({ ok: true });
          }
          if (settings.admin_chat_id === chatId && text && !text.startsWith("/")) {
            // Plain text bhi query ki tarah samjho: "1 Sep se 5 Sep Tabla"
            const q = parseFreeQuery(text);
            try {
              const artists = await findFreeArtists(supabaseAdmin, q);
              await callTelegram(token, "sendMessage", {
                chat_id: chatId,
                parse_mode: "HTML",
                text: formatFreeReplyHtml(q, artists),
              });
            } catch {
              await callTelegram(token, "sendMessage", {
                chat_id: chatId,
                text: "Samajh nahi aaya. /help bhejein.",
              });
            }
            return Response.json({ ok: true });
          }
          if (settings.admin_chat_id === chatId && text.startsWith("/pending")) {
            const { data: rows } = await supabaseAdmin
              .from("profiles")
              .select("full_name, email, status")
              .eq("status", "pending");
            const list = (rows ?? []).map((r) => `• ${r.full_name || r.email}`).join("\n");
            await callTelegram(token, "sendMessage", {
              chat_id: chatId,
              text: list ? `Pending accounts:\n${list}` : "Koi pending account nahi hai.",
            });
          }
          return Response.json({ ok: true });
        }

        // 2) Approve / Reject buttons
        const cq = update.callback_query;
        if (cq?.data) {
          const chatId = cq.message?.chat?.id ? String(cq.message.chat.id) : null;
          if (chatId !== settings.admin_chat_id) {
            await callTelegram(token, "answerCallbackQuery", {
              callback_query_id: cq.id,
              text: "Sirf admin approve kar sakta hai.",
            });
            return Response.json({ ok: true });
          }

          const [action, userId] = cq.data.split(":");
          if ((action === "approve" || action === "reject") && userId) {
            const status = action === "approve" ? "approved" : "rejected";
            const { data: updated, error } = await supabaseAdmin
              .from("profiles")
              .update({ status, updated_at: new Date().toISOString() })
              .eq("id", userId)
              .select("full_name, email, category")
              .maybeSingle();

            if (error || !updated) {
              await callTelegram(token, "answerCallbackQuery", {
                callback_query_id: cq.id,
                text: "Update fail ho gaya.",
              });
              return Response.json({ ok: true });
            }

            const { data: roles } = await supabaseAdmin
              .from("user_roles")
              .select("role")
              .eq("user_id", userId);
            const role = ROLE_LABEL[roles?.[0]?.role ?? ""] ?? "User";

            await callTelegram(token, "answerCallbackQuery", {
              callback_query_id: cq.id,
              text: status === "approved" ? "Approved ✅" : "Rejected ❌",
            });
            if (cq.message?.message_id) {
              await callTelegram(token, "editMessageText", {
                chat_id: chatId,
                message_id: cq.message.message_id,
                parse_mode: "HTML",
                text:
                  `${status === "approved" ? "✅" : "❌"} <b>${role}</b> ${updated.full_name || updated.email}` +
                  `\n${updated.email}\n\nStatus: <b>${status}</b>` +
                  (status === "approved"
                    ? "\n\nUser ab app me apne aap login ho jayega."
                    : ""),
              });
            }
          }
          return Response.json({ ok: true });
        }

        return Response.json({ ok: true, ignored: true });
      },
    },
  },
});
