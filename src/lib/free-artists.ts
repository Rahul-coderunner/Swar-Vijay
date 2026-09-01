// Shared "free artists" lookup + natural-language parsing.
// Browser-safe: takes any supabase-like client (browser client or admin client).

import { CATEGORIES } from "@/components/PhoneFrame";
import { prettyDate, toISODate } from "@/lib/calendar";

export interface FreeArtist {
  id: string;
  full_name: string;
  phone: string | null;
  category: string | null;
  dates: string[];
}

export interface FreeQuery {
  from: string;
  to: string;
  category: string | null;
}

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9,
  september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};

function iso(y: number, m: number, d: number) {
  return `${y}-${`${m}`.padStart(2, "0")}-${`${d}`.padStart(2, "0")}`;
}

/** Pulls every date-ish token out of free text, in order. */
function extractDates(text: string, today: Date): string[] {
  const out: string[] = [];
  const year = today.getFullYear();
  const re =
    /(\d{4}-\d{2}-\d{2})|(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?|(\d{1,2})\s*([a-z]{3,9})/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m[1]) {
      out.push(m[1]);
    } else if (m[2] && m[3]) {
      let y = m[4] ? Number(m[4]) : year;
      if (y < 100) y += 2000;
      out.push(iso(y, Number(m[3]), Number(m[2])));
    } else if (m[5] && m[6]) {
      const mo = MONTHS[m[6].toLowerCase()];
      if (mo) out.push(iso(year, mo, Number(m[5])));
    }
  }
  return out;
}

export const CATEGORY_KEYWORDS: { category: (typeof CATEGORIES)[number]; keywords: string[] }[] = [
  { category: "Octapad", keywords: ["octapad", "octopad", "octa", "pad"] },
  { category: "Banjo", keywords: ["banjo"] },
  { category: "Keyboard", keywords: ["keyboard"] },
  { category: "Tabla", keywords: ["tabla"] },
];

export function parseFreeQuery(text: string, today = new Date()): FreeQuery {
  const lower = text.toLowerCase();
  let category: (typeof CATEGORIES)[number] | null = null;
  for (const item of CATEGORY_KEYWORDS) {
    for (const kw of item.keywords) {
      if (kw.length <= 4 ? new RegExp(`\\b${kw}\\b`, "i").test(lower) : lower.includes(kw)) {
        category = item.category;
        break;
      }
    }
    if (category) break;
  }
  if (!category) {
    category = CATEGORIES.find((c) => lower.includes(c.toLowerCase())) ?? null;
  }

  const dates = extractDates(lower, today).sort();
  const todayIso = toISODate(today);

  if (dates.length >= 2) return { from: dates[0]!, to: dates[dates.length - 1]!, category };
  if (dates.length === 1) return { from: dates[0]!, to: dates[0]!, category };

  if (/(kal|tomorrow)/.test(lower)) {
    const t = new Date(today);
    t.setDate(t.getDate() + 1);
    return { from: toISODate(t), to: toISODate(t), category };
  }
  if (/(aaj|today)/.test(lower)) return { from: todayIso, to: todayIso, category };

  const t = new Date(today);
  t.setDate(t.getDate() + 30);
  return { from: todayIso, to: toISODate(t), category };
}

type DbLike = {
  from: (table: string) => any;
};

/** Artists free (available & not booked) on at least one date in the range. */
export async function findFreeArtists(db: DbLike, q: FreeQuery): Promise<FreeArtist[]> {
  const { data: roles, error: rErr } = await db.from("user_roles").select("user_id").eq("role", "artist");
  if (rErr) throw rErr;
  const ids = (roles ?? []).map((r: { user_id: string }) => r.user_id);
  if (ids.length === 0) return [];

  let pq = db
    .from("profiles")
    .select("id, full_name, phone, category")
    .in("id", ids)
    .eq("status", "approved")
    .order("full_name");
  if (q.category) pq = pq.eq("category", q.category);
  const { data: profiles, error: pErr } = await pq;
  if (pErr) throw pErr;
  if (!profiles || profiles.length === 0) return [];

  const artistIds = profiles.map((p: { id: string }) => p.id);

  const [{ data: avail, error: aErr }, { data: booked, error: bErr }] = await Promise.all([
    db
      .from("artist_availability")
      .select("artist_id, available_date")
      .in("artist_id", artistIds)
      .gte("available_date", q.from)
      .lte("available_date", q.to)
      .order("available_date"),
    db
      .from("bookings")
      .select("artist_id, booking_date, status")
      .in("artist_id", artistIds)
      .gte("booking_date", q.from)
      .lte("booking_date", q.to),
  ]);
  if (aErr) throw aErr;
  if (bErr) throw bErr;

  const busy = new Set(
    (booked ?? [])
      .filter((b: { status?: string }) => b.status !== "cancelled")
      .map((b: { artist_id: string; booking_date: string }) => `${b.artist_id}|${b.booking_date}`),
  );

  return profiles
    .map((p: { id: string; full_name: string; phone: string | null; category: string | null }) => ({
      ...p,
      dates: (avail ?? [])
        .filter(
          (a: { artist_id: string; available_date: string }) =>
            a.artist_id === p.id && !busy.has(`${a.artist_id}|${a.available_date}`),
        )
        .map((a: { available_date: string }) => a.available_date),
    }))
    .filter((a: FreeArtist) => a.dates.length > 0);
}

export function rangeLabel(q: FreeQuery) {
  return q.from === q.to ? prettyDate(q.from) : `${prettyDate(q.from)} – ${prettyDate(q.to)}`;
}

/** Plain-text (HTML) reply used by the Telegram bot. */
export function formatFreeReplyHtml(q: FreeQuery, artists: FreeArtist[]) {
  const head = `🎼 <b>${q.category ?? "Sabhi categories"}</b> · ${rangeLabel(q)}`;
  if (artists.length === 0) return `${head}\n\nIss duration me koi artist free nahi hai.`;
  const body = artists
    .map((a) => {
      const dates = a.dates.slice(0, 8).map(prettyDate).join(", ");
      const more = a.dates.length > 8 ? ` +${a.dates.length - 8} aur` : "";
      return `• <b>${a.full_name || "Artist"}</b>${a.category ? ` (${a.category})` : ""}\n  📞 ${
        a.phone ?? "number nahi hai"
      }\n  🗓 ${dates}${more}`;
    })
    .join("\n\n");
  return `${head}\n\n${body}`;
}
