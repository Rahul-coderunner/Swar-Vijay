// Server-only Telegram helpers. Never import this from browser code.

export const TELEGRAM_API = "https://api.telegram.org";

export interface TelegramSettingsRow {
  bot_token: string | null;
  bot_username: string | null;
  admin_chat_id: string | null;
  webhook_url: string | null;
  webhook_secret: string | null;
}

export async function callTelegram<T = unknown>(
  token: string,
  method: string,
  body: Record<string, unknown> = {},
): Promise<T> {
  const res = await fetch(`${TELEGRAM_API}/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: { ok?: boolean; result?: T; description?: string } = {};
  try {
    json = JSON.parse(text) as typeof json;
  } catch {
    throw new Error(`Telegram ${method} failed [${res.status}]: ${text.slice(0, 300)}`);
  }
  if (!res.ok || json.ok === false) {
    throw new Error(`Telegram ${method} failed [${res.status}]: ${json.description ?? text}`);
  }
  return json.result as T;
}

/** Public https base URL that Telegram can reach for this project. */
export function publicBaseUrl(host: string | undefined): string {
  const projectId = "cbee9288-9a98-4acf-bcee-06932ad5f059";
  const fallback = `https://project--${projectId}-dev.lovable.app`;
  if (!host) return fallback;
  if (host.startsWith("localhost") || host.startsWith("127.0.0.1")) return fallback;
  // id-preview--<uuid>.lovable.app is auth-bridged; use the stable public dev host.
  const m = host.match(/^id-preview(?:-[a-z0-9]+)?--([0-9a-f-]{36})(?:-dev)?\./i);
  if (m) return `https://project--${m[1]}-dev.lovable.app`;
  return `https://${host}`;
}

export function webhookUrlFor(host: string | undefined): string {
  return `${publicBaseUrl(host)}/api/public/telegram/webhook`;
}

export async function loadSettings(): Promise<TelegramSettingsRow | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("telegram_settings")
    .select("bot_token, bot_username, admin_chat_id, webhook_url, webhook_secret")
    .eq("id", "default")
    .maybeSingle();
  if (error) throw error;
  return (data as TelegramSettingsRow | null) ?? null;
}

/** Bot token: pehle DB me saved token, warna project secret TELEGRAM_BOT_TOKEN. */
export function envBotToken(): string | null {
  return process.env["TELEGRAM_BOT_TOKEN"]?.trim() || null;
}

export async function deriveSecret(token: string): Promise<string> {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(`telegram-webhook:${token}`).digest("base64url");
}

export interface ResolvedBot {
  token: string;
  secret: string;
  adminChatId: string | null;
  botUsername: string | null;
  webhookUrl: string | null;
  fromEnv: boolean;
}

/** Saved settings + env secret ko milakar active bot nikalta hai. */
export async function resolveBot(): Promise<ResolvedBot | null> {
  const row = await loadSettings();
  const token = row?.bot_token ?? envBotToken();
  if (!token) return null;
  const secret = row?.webhook_secret ?? (await deriveSecret(token));
  return {
    token,
    secret,
    adminChatId: row?.admin_chat_id ?? null,
    botUsername: row?.bot_username ?? null,
    webhookUrl: row?.webhook_url ?? null,
    fromEnv: !row?.bot_token,
  };
}

/**
 * Env-wale bot ke liye webhook register karta hai (idempotent) aur
 * telegram_settings row bana deta hai taki admin chat link ho sake.
 */
export async function ensureWebhook(host: string | undefined): Promise<ResolvedBot | null> {
  const bot = await resolveBot();
  if (!bot) return null;
  const url = webhookUrlFor(host);
  if (bot.webhookUrl === url && bot.botUsername) return bot;

  const me = await callTelegram<{ username?: string }>(bot.token, "getMe");
  await callTelegram(bot.token, "setWebhook", {
    url,
    secret_token: bot.secret,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: true,
  });

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("telegram_settings").upsert(
    {
      id: "default",
      bot_token: bot.fromEnv ? null : bot.token,
      bot_username: me.username ?? null,
      webhook_url: url,
      webhook_secret: bot.secret,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  return { ...bot, botUsername: me.username ?? null, webhookUrl: url };
}
