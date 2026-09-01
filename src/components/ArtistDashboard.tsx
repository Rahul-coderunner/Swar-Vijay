import { useMemo, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, X, ArrowLeft, Edit2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SectionCard } from "@/components/AppShell";
import { WEEKDAYS, isPast, monthGrid, monthLabel, prettyDate, toISODate } from "@/lib/calendar";

export function ArtistDashboard({ meId }: { meId: string }) {
  const qc = useQueryClient();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [editMode, setEditMode] = useState(false);

  // Fetch artist profile for category
  const { data: profile } = useQuery({
    queryKey: ["profile", meId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("category")
        .eq("id", meId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: availability = [] } = useQuery({
    queryKey: ["availability", meId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artist_availability")
        .select("id, available_date")
        .eq("artist_id", meId)
        .order("available_date");
      if (error) throw error;
      return data;
    },
  });

  // Local state for dirty edits
  const originalSet = useMemo(() => new Set(availability.map((a) => a.available_date)), [availability]);
  const [localSet, setLocalSet] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    setLocalSet(new Set(originalSet));
  }, [originalSet]);

  const isDirty = useMemo(() => {
    if (localSet.size !== originalSet.size) return true;
    for (const d of localSet) {
      if (!originalSet.has(d)) return true;
    }
    return false;
  }, [localSet, originalSet]);

  // Bulk save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const toAdd = Array.from(localSet).filter(d => !originalSet.has(d));
      const toRemove = Array.from(originalSet).filter(d => !localSet.has(d));

      if (toRemove.length > 0) {
        const { error } = await supabase
          .from("artist_availability")
          .delete()
          .eq("artist_id", meId)
          .in("available_date", toRemove);
        if (error) throw error;
      }

      if (toAdd.length > 0) {
        const { error } = await supabase
          .from("artist_availability")
          .insert(toAdd.map(d => ({ artist_id: meId, available_date: d })));
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Dates saved successfully! / तारखा जतन केल्या!");
      qc.invalidateQueries({ queryKey: ["availability", meId] });
      setEditMode(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cells = monthGrid(year, month);
  const upcoming = Array.from(localSet)
    .filter((iso) => !isPast(new Date(`${iso}T00:00:00`)))
    .sort();

  function shift(delta: number) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  function handleDateClick(iso: string) {
    if (!editMode) return;
    setLocalSet(prev => {
      const next = new Set(prev);
      if (next.has(iso)) next.delete(iso);
      else next.add(iso);
      return next;
    });
  }

  function removeDate(iso: string) {
    setLocalSet(prev => {
      const next = new Set(prev);
      next.delete(iso);
      return next;
    });
  }

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6 px-4 pt-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => window.history.back()}
            className="p-2 -ml-2 rounded-full hover:bg-surf2 text-ink2 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-display font-semibold text-ink">My Calendar</h1>
            {profile?.category && (
              <span className="chip-sv mt-1 text-xs inline-block">{profile.category}</span>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 space-y-6">
        <div className="card-sv p-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-ink">Availability</h2>
            <button
              onClick={() => setEditMode(!editMode)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                editMode ? "bg-maroon text-white" : "bg-surf2 text-ink2 hover:bg-surface border border-border"
              }`}
            >
              <Edit2 className="w-4 h-4" />
              {editMode ? "Done Editing" : "Edit Dates"}
            </button>
          </div>

          <div className="mb-4 flex items-center justify-between">
            <span className="text-base font-semibold text-ink">{monthLabel(year, month)}</span>
            <div className="flex gap-2">
              <button
                onClick={() => shift(-1)}
                className="rounded-full p-2 hover:bg-surf2 text-ink2 transition-colors"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => shift(1)}
                className="rounded-full p-2 hover:bg-surf2 text-ink2 transition-colors"
                aria-label="Next month"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-ink3 mb-2">
            {WEEKDAYS.map((w) => (
              <span key={w} className="py-2">
                {w.slice(0, 3)}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-2 gap-x-1">
            {cells.map((d, i) => {
              if (!d) return <div key={i} />;
              const iso = toISODate(d);
              const isSelected = localSet.has(iso);
              const past = isPast(d);
              const isToday = toISODate(today) === iso;

              let cellClass = "flex items-center justify-center w-full aspect-square text-sm transition-all ";
              if (past) {
                cellClass += "text-ink3 opacity-40 cursor-not-allowed";
              } else if (isSelected) {
                cellClass += "bg-maroon text-white rounded-full shadow-md-sv font-semibold";
              } else {
                cellClass += "text-ink2 hover:bg-surf2 rounded-full cursor-pointer";
              }

              if (isToday && !isSelected) {
                cellClass += " ring-2 ring-gold text-ink font-semibold";
              } else if (isToday && isSelected) {
                cellClass += " ring-2 ring-gold ring-offset-1";
              }

              return (
                <button
                  key={iso}
                  disabled={past || (!editMode && !isSelected)}
                  onClick={() => handleDateClick(iso)}
                  className={cellClass}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
          
          <div className="mt-6 flex flex-wrap gap-4 text-xs text-ink3 justify-center">
            <span className="flex items-center gap-1.5">
              <i className="bg-maroon h-2.5 w-2.5 rounded-full" /> Selected
            </span>
            <span className="flex items-center gap-1.5">
              <i className="h-2.5 w-2.5 rounded-full ring-2 ring-gold" /> Today
            </span>
          </div>
        </div>

        <SectionCard title="Your selected dates" subtitle="तुमच्या निवडलेल्या तारखा">
          {upcoming.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-surf2 p-6 text-center text-sm text-ink3">
              No dates selected for the future.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {upcoming.map((iso) => (
                <div key={iso} className="chip-sv flex items-center gap-1 bg-surface border-border border">
                  <span>{prettyDate(iso)}</span>
                  <button
                    onClick={() => {
                      removeDate(iso);
                      toast.info("Date removed. Save changes to update. / तारीख काढली.");
                    }}
                    className="ml-1 p-0.5 rounded-full hover:bg-surf2 text-ink3 hover:text-maroon transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {isDirty && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-surface border-t border-border shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] z-50">
          <div className="max-w-md mx-auto">
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="w-full bg-hero text-white py-3.5 px-4 rounded-xl font-semibold shadow-md-sv hover:opacity-90 transition flex items-center justify-center gap-2"
            >
              {saveMutation.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
