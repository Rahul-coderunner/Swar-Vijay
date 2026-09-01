import { useEffect, useRef, useState } from "react";
import { Bot, Phone, Send, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES } from "@/components/PhoneFrame";
import { prettyDate } from "@/lib/calendar";
import {
  findFreeArtists,
  parseFreeQuery,
  rangeLabel,
  type FreeArtist,
  type FreeQuery,
} from "@/lib/free-artists";

interface Msg {
  id: number;
  from: "bot" | "me";
  text: string;
  query?: FreeQuery;
  results?: FreeArtist[];
}

const SUGGESTIONS = [
  "1 Sep se 5 Sep tak Tabla free artist",
  "Kal kon free hai?",
  "Octapad 12/09/2026",
  "Banjo free artist aaj",
];

let uid = 0;

export function ArtistBot() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: uid++,
      from: "bot",
      text: "नमस्कार! Mujhe dates aur category likhiye — main us duration me free artists aur unke contact number bata dunga.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  async function ask(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setInput("");
    setMessages((m) => [...m, { id: uid++, from: "me", text: q }]);
    setBusy(true);
    try {
      const parsed = parseFreeQuery(q);
      const results = await findFreeArtists(supabase, parsed);
      setMessages((m) => [
        ...m,
        {
          id: uid++,
          from: "bot",
          text:
            results.length === 0
              ? `${rangeLabel(parsed)}${parsed.category ? ` · ${parsed.category}` : ""} me koi artist free nahi hai.`
              : `${rangeLabel(parsed)}${parsed.category ? ` · ${parsed.category}` : ""} — ${results.length} artist free hain:`,
          query: parsed,
          results,
        },
      ]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { id: uid++, from: "bot", text: e instanceof Error ? e.message : "Kuch galat ho gaya." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[60vh] flex-col gap-3">
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-surf2 p-4">
        <span className="bg-goldgrad flex h-10 w-10 items-center justify-center rounded-xl text-deep">
          <Bot className="h-5 w-5" />
        </span>
        <div>
          <p className="font-display text-lg leading-tight text-maroon">Swar Vijay Bot</p>
          <p className="text-xs text-ink3">Free artists + contact details</p>
        </div>
      </div>

      <div className="flex-1 space-y-3">
        {messages.map((m) => (
          <div key={m.id} className={m.from === "me" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                m.from === "me"
                  ? "bg-hero text-warm"
                  : "border border-border bg-surface text-ink"
              }`}
            >
              <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide opacity-70">
                {m.from === "me" ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                {m.from === "me" ? "Aap" : "Bot"}
              </span>
              <p className="mt-1 whitespace-pre-line">{m.text}</p>

              {m.results && m.results.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {m.results.map((a) => (
                    <li key={a.id} className="rounded-xl border border-border bg-surf2 p-3">
                      <p className="font-semibold text-maroon">{a.full_name || "Artist"}</p>
                      {a.category && <p className="text-[11px] text-ink3">{a.category}</p>}
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {a.dates.slice(0, 6).map((d) => (
                          <span key={d} className="chip-sv text-[11px]">
                            {prettyDate(d)}
                          </span>
                        ))}
                        {a.dates.length > 6 && (
                          <span className="text-[11px] text-ink3">+{a.dates.length - 6}</span>
                        )}
                      </div>
                      {a.phone ? (
                        <a
                          href={`tel:${a.phone}`}
                          className="bg-hero mt-2 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-warm"
                        >
                          <Phone className="h-3.5 w-3.5" /> {a.phone}
                        </a>
                      ) : (
                        <p className="mt-2 text-[11px] text-ink3">Number available nahi hai.</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
        {busy && <p className="text-xs text-ink3">Bot dekh raha hai…</p>}
        <div ref={endRef} />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => ask(s)}
            className="chip-sv text-[11px]"
            disabled={busy}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setInput((v) => `${v} ${c}`.trim())}
            className="rounded-lg border border-border px-2.5 py-1 text-[11px] text-ink2"
          >
            + {c}
          </button>
        ))}
      </div>

      <form
        className="sticky bottom-0 flex gap-2 bg-background pb-1 pt-2"
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="जैसे: 1 Sep se 5 Sep Tabla"
          className="flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-ink outline-none placeholder:text-ink3 focus:border-gold"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="bg-hero flex items-center justify-center rounded-xl px-4 text-warm disabled:opacity-60"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
