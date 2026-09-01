import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Check, ShieldX, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SectionCard, StatusPill } from "@/components/AppShell";
import type { AccountStatus, AppRole, Profile } from "@/lib/session";

interface Row extends Profile {
  role: AppRole | null;
}

async function loadUsers(): Promise<Row[]> {
  const [{ data: profiles, error }, { data: roles, error: rErr }] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    supabase.from("user_roles").select("user_id, role"),
  ]);
  if (error) throw error;
  if (rErr) throw rErr;
  const roleMap = new Map((roles ?? []).map((r) => [r.user_id, r.role as AppRole]));
  return (profiles ?? []).map((p) => ({ ...(p as Profile), role: roleMap.get(p.id) ?? null }));
}

const FILTERS: { key: AccountStatus | "all"; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
];

export function AdminDashboard({ meId }: { meId: string }) {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<AccountStatus | "all">("pending");
  const { data = [], isLoading } = useQuery({ queryKey: ["admin-users"], queryFn: loadUsers });

  const update = useMutation({
    mutationFn: async (patch: { id: string; status: AccountStatus }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ status: patch.status })
        .eq("id", patch.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Account updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = data.filter((r) => r.id !== meId && (filter === "all" || r.status === filter));
  const pendingCount = data.filter((r) => r.id !== meId && r.status === "pending").length;

  return (
    <SectionCard
      title="Approvals"
      subtitle={`${pendingCount} request${pendingCount === 1 ? "" : "s"} pending`}
    >
      <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-semibold transition ${
              filter === f.key
                ? "border-gold bg-surf3 text-maroon"
                : "border-border bg-surface text-ink2"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-ink3">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-surf2 p-6 text-center text-sm text-ink3">
          Koi account nahi hai.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="rounded-xl border border-border bg-surf2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-maroon">{r.full_name || r.email}</p>
                  <p className="truncate text-xs text-ink3">{r.email}</p>
                  <p className="mt-1 text-xs text-ink2">
                    {r.role ?? "—"}
                    {r.category ? ` · ${r.category}` : ""}
                    {r.phone ? ` · ${r.phone}` : ""}
                  </p>
                </div>
                <StatusPill status={r.status} />
              </div>

              <div className="mt-3 flex gap-2">
                {r.status !== "approved" && (
                  <button
                    onClick={() => update.mutate({ id: r.id, status: "approved" })}
                    className="bg-greengrad flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-warm"
                  >
                    <Check className="h-4 w-4" /> Accept
                  </button>
                )}
                {r.status === "pending" && (
                  <button
                    onClick={() => update.mutate({ id: r.id, status: "rejected" })}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-crimson/40 px-3 py-2.5 text-sm font-semibold text-crimson"
                  >
                    <X className="h-4 w-4" /> Reject
                  </button>
                )}
                {r.status === "approved" && (
                  <button
                    onClick={() => update.mutate({ id: r.id, status: "revoked" })}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2.5 text-sm font-semibold text-ink2"
                  >
                    <ShieldX className="h-4 w-4" /> Revoke
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
