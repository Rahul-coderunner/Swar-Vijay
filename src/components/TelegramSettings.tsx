import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Send, Trash2 } from "lucide-react";
import {
  connectTelegramBot,
  disconnectTelegramBot,
  getTelegramStatus,
} from "@/lib/telegram.functions";
import { SectionCard } from "@/components/AppShell";

export function TelegramSettings() {
  const qc = useQueryClient();
  const status = useServerFn(getTelegramStatus);
  const connect = useServerFn(connectTelegramBot);
  const disconnect = useServerFn(disconnectTelegramBot);
  const [token, setToken] = useState("");

  const q = useQuery({ queryKey: ["telegram-status"], queryFn: () => status(), refetchInterval: 6000 });

  const save = useMutation({
    mutationFn: (t: string) => connect({ data: { token: t } }),
    onSuccess: () => {
      setToken("");
      toast.success("Bot connect ho gaya — ab Telegram par /start bhejein");
      qc.invalidateQueries({ queryKey: ["telegram-status"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Connect fail ho gaya"),
  });

  const remove = useMutation({
    mutationFn: () => disconnect(),
    onSuccess: () => {
      toast.success("Chat unlink ho gayi");
      qc.invalidateQueries({ queryKey: ["telegram-status"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Remove fail ho gaya"),
  });

  const s = q.data;

  return (
    <div className="space-y-4">
      <SectionCard
        title="Telegram approval bot"
        subtitle="Naya account bante hi Telegram par Approve / Reject ka message aayega"
      >
        {q.isLoading ? (
          <p className="text-sm text-ink3">Loading…</p>
        ) : s?.connected ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-xl border border-border bg-surf3 p-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-maroon" />
              <div className="text-sm">
                <p className="font-semibold text-maroon">
                  {s.botUsername ? `@${s.botUsername}` : "Bot"} connected
                </p>
                <p className="mt-0.5 text-xs text-ink2">
                  {s.chatLinked
                    ? "Aapki chat linked hai — approval requests wahi aayengi."
                    : "Ab Telegram par bot ko /start bhejein, tabhi ye chat link hogi."}
                </p>
              </div>
            </div>

            {!s.chatLinked && s.botUsername && (
              <a
                href={`https://t.me/${s.botUsername}?start=link`}
                target="_blank"
                rel="noreferrer"
                className="bg-hero flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-warm"
              >
                <Send className="h-4 w-4" /> Telegram par /start bhejein
              </a>
            )}

            <ol className="space-y-1.5 text-xs text-ink2">
              <li>1. Naya user signup karega → aapko Telegram par message aayega.</li>
              <li>2. Approve dabaenge → user apne aap app me login ho jayega.</li>
              <li>3. /pending likhkar pending list bhi dekh sakte hain.</li>
            </ol>

            <button
              onClick={() => remove.mutate()}
              disabled={remove.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-crimson/50 px-4 py-3 text-sm font-semibold text-crimson disabled:opacity-60"
            >
              {remove.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Chat unlink karein
            </button>
          </div>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate(token);
            }}
          >
            <p className="text-xs leading-relaxed text-ink2">
              Bot token project secrets me save hai. Agar dusra bot use karna ho to naya token
              niche paste karein.
            </p>
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
              placeholder="123456789:AA..."
              className="w-full rounded-xl border border-border bg-surface px-4 py-3 font-mono text-sm text-ink outline-none placeholder:text-ink3 focus:border-gold focus:ring-2 focus:ring-gold/30"
            />
            <button
              type="submit"
              disabled={save.isPending || !token.trim()}
              className="bg-hero flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-semibold text-warm disabled:opacity-60"
            >
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Bot connect karein
            </button>
          </form>
        )}
      </SectionCard>
    </div>
  );
}
