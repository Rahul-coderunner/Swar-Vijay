import { createFileRoute } from "@tanstack/react-router";

/**
 * Bot ka webhook register karta hai (idempotent) aur Telegram link deta hai.
 * Koi private data return nahi hota — sirf public bot username / link.
 */
export const Route = createFileRoute("/api/public/telegram/setup")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { ensureWebhook } = await import("@/lib/telegram.server");
        const host = new URL(request.url).host;
        try {
          const bot = await ensureWebhook(host);
          if (!bot) return Response.json({ ok: false, reason: "no_bot_token" }, { status: 503 });
          return Response.json({
            ok: true,
            botUsername: bot.botUsername,
            startUrl: bot.botUsername ? `https://t.me/${bot.botUsername}?start=link` : null,
            webhookUrl: bot.webhookUrl,
            chatLinked: !!bot.adminChatId,
          });
        } catch (e) {
          return Response.json(
            { ok: false, reason: e instanceof Error ? e.message : "failed" },
            { status: 500 },
          );
        }
      },
    },
  },
});
