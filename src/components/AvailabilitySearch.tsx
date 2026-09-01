import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Phone, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SectionCard } from "@/components/AppShell";
import { CATEGORIES, type Category } from "@/components/PhoneFrame";
import { prettyDate, toISODate } from "@/lib/calendar";

interface ArtistRow {
  id: string;
  full_name: string;
  phone: string | null;
  category: string | null;
}

async function loadArtists(): Promise<ArtistRow[]> {
  const { data: roles, error: rErr } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "artist");
  if (rErr) throw rErr;
  const ids = (roles ?? []).map((r) => r.user_id);
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone, category")
    .in("id", ids)
    .eq("status", "approved")
    .order("full_name");
  if (error) throw error;
  return (data ?? []) as ArtistRow[];
}

export function AvailabilitySearch() {
  const [category, setCategory] = useState<Category>(CATEGORIES[0]);
  const [date, setDate] = useState("");

  const { data: artists = [], isLoading } = useQuery({
    queryKey: ["search-artists"],
    queryFn: loadArtists,
  });

  const { data: availability = [] } = useQuery({
    queryKey: ["search-availability"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artist_availability")
        .select("artist_id, available_date")
        .gte("available_date", toISODate(new Date()))
        .order("available_date");
      if (error) throw error;
      return data;
    },
  });

  const inCategory = artists.filter((a) => a.category === category);
  const results = inCategory
    .map((a) => {
      const dates = availability
        .filter((av) => av.artist_id === a.id && (!date || av.available_date === date))
        .map((av) => av.available_date);
      return { artist: a, dates };
    })
    .filter((r) => r.dates.length > 0);

  return (
    <>
      <SectionCard title="Kya koi available hai?" subtitle="Category chunein aur available artist dekhein">
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                category === c
                  ? "border-gold bg-surf3 text-maroon shadow-md-sv"
                  : "border-border bg-surface text-ink2"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <label className="mt-4 block space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink2">
            Date (optional)
          </span>
          <input
            type="date"
            value={date}
            min={toISODate(new Date())}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-ink outline-none focus:border-gold"
          />
        </label>
        {date && (
          <button onClick={() => setDate("")} className="mt-2 text-xs font-semibold text-maroon">
            Clear date
          </button>
        )}
      </SectionCard>

      <SectionCard title={`${category} — available`} subtitle="Contact number par tap karke call karein">
        {isLoading ? (
          <p className="text-sm text-ink3">Loading…</p>
        ) : results.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surf2 p-6 text-center">
            <Search className="mx-auto mb-2 h-5 w-5 text-ink3" />
            <p className="text-sm text-ink2">
              Iss category me {date ? `${prettyDate(date)} ko ` : ""}koi available nahi hai.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {results.map(({ artist, dates }) => (
              <li key={artist.id} className="rounded-xl border border-border bg-surf2 p-4">
                <p className="font-semibold text-maroon">{artist.full_name || "Artist"}</p>
                <p className="mt-0.5 text-xs text-ink3">{artist.category}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {dates.slice(0, 6).map((d) => (
                    <span key={d} className="chip-sv text-[11px]">
                      {prettyDate(d)}
                    </span>
                  ))}
                  {dates.length > 6 && (
                    <span className="text-[11px] text-ink3">+{dates.length - 6} more</span>
                  )}
                </div>
                {artist.phone ? (
                  <a
                    href={`tel:${artist.phone}`}
                    className="bg-hero mt-3 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-warm"
                  >
                    <Phone className="h-4 w-4" /> {artist.phone}
                  </a>
                ) : (
                  <p className="mt-3 text-xs text-ink3">Contact number available nahi hai.</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </>
  );
}
