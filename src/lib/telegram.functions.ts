import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export interface TelegramStatus {
  connected: boolean;
  botUsername: string | null;
  chatLinked: boolean;
  webhookUrl: string | null;
}

export const getTelegramStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TelegramStatus> => {
    await assertAdmin(context);
    const { ensureWebhook } = await import("./telegram.server");
    const bot = await ensureWebhook(getRequestHeader("host"));
    return {
      connected: !!bot,
      botUsername: bot?.botUsername ?? null,
      chatLinked: !!bot?.adminChatId,
      webhookUrl: bot?.webhookUrl ?? null,
    };
  });

export const connectTelegramBot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { token: string }) => {
    const token = input.token.trim();
    if (!/^\d{5,}:[A-Za-z0-9_-]{20,}$/.test(token)) throw new Error("Bot token ka format galat hai");
    return { token };
  })
  .handler(async ({ data, context }): Promise<TelegramStatus> => {
    await assertAdmin(context);
    const { callTelegram, webhookUrlFor } = await import("./telegram.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { randomBytes } = await import("node:crypto");

    const me = await callTelegram<{ username?: string }>(data.token, "getMe");
    const secret = randomBytes(24).toString("base64url");
    const url = webhookUrlFor(getRequestHeader("host"));

    await callTelegram(data.token, "setWebhook", {
      url,
      secret_token: secret,
      allowed_updates: ["message", "callback_query"],
      drop_pending_updates: true,
    });

    const { error } = await supabaseAdmin.from("telegram_settings").upsert(
      {
        id: "default",
        bot_token: data.token,
        bot_username: me.username ?? null,
        admin_chat_id: null,
        webhook_url: url,
        webhook_secret: secret,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
    if (error) throw new Error(error.message);

    return { connected: true, botUsername: me.username ?? null, chatLinked: false, webhookUrl: url };
  });

export const disconnectTelegramBot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Sirf admin chat unlink hoti hai — bot project secret se chalta rehta hai.
    const { error } = await supabaseAdmin
      .from("telegram_settings")
      .update({ admin_chat_id: null, updated_at: new Date().toISOString() })
      .eq("id", "default");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Called by a freshly signed-up (pending) user: pings the admin on Telegram. */
export const notifyAdminOfSignup = createServerFn({ method: "POST" })
  .validator((input?: { userId?: string; email?: string }) => input)
  .handler(async ({ data: inputData }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Load bot settings directly from DB (no env dependency)
    const { data: settings, error: settingsErr } = await supabaseAdmin
      .from("telegram_settings")
      .select("bot_token, admin_chat_id")
      .eq("id", "default")
      .maybeSingle();

    if (settingsErr) {
      console.error("[notifyAdmin] DB settings load error:", settingsErr);
      return { sent: false, reason: "DB error: " + settingsErr.message };
    }

    const botToken = settings?.bot_token ?? process.env["TELEGRAM_BOT_TOKEN"]?.trim();
    const adminChatId = settings?.admin_chat_id;

    console.log("[notifyAdmin] botToken present:", !!botToken, "| adminChatId:", adminChatId);

    if (!botToken) return { sent: false, reason: "No bot token configured" };
    if (!adminChatId) return { sent: false, reason: "No admin chat linked. Admin must send /start to the bot first." };

    // 2. Fetch user profile
    let query = supabaseAdmin.from("profiles").select("id, full_name, email, phone, category, status");
    if (inputData?.userId) {
      query = query.eq("id", inputData.userId);
    } else if (inputData?.email) {
      query = query.eq("email", inputData.email);
    } else {
      console.error("[notifyAdmin] No userId or email provided in input");
      return { sent: false, reason: "No userId or email provided" };
    }

    const { data: profile, error: profileErr } = await query.maybeSingle();
    if (profileErr) {
      console.error("[notifyAdmin] Profile fetch error:", profileErr);
      return { sent: false, reason: "Profile fetch error" };
    }
    if (!profile) {
      console.error("[notifyAdmin] Profile not found for input:", inputData);
      return { sent: false, reason: "Profile not found" };
    }

    console.log("[notifyAdmin] Sending approval card for:", profile.email, "to chat:", adminChatId);

    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", profile.id);
    const role = roles?.[0]?.role ?? "artist";

    const lines = [
      "🔔 <b>NEW APPROVAL REQUEST</b>",
      "─────────────",
      `👤 <b>Name:</b> ${profile.full_name || "—"}`,
      `📧 <b>Email:</b> <code>${profile.email}</code>`,
      `🎭 <b>Role:</b> <b>${role.toUpperCase()}</b>${profile.category ? ` · ${profile.category}` : ""}`,
      `📱 <b>Phone:</b> ${profile.phone ?? "—"}`,
      "─────────────",
      "<i>Approve karne par user bina re-login ke turant app me open ho jayega.</i>"
    ];

    // 3. Send Telegram message directly via fetch (no intermediary)
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

    const result = await res.json() as { ok: boolean; description?: string };
    console.log("[notifyAdmin] Telegram sendMessage result:", result);

    if (!result.ok) {
      console.error("[notifyAdmin] Telegram error:", result.description);
      return { sent: false, reason: result.description };
    }

    return { sent: true };
  });
