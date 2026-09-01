import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PhoneFrame } from "@/components/PhoneFrame";
import { Logo } from "@/components/Logo";
import type { AppRole, Profile } from "@/lib/session";
import { roleLabel } from "@/lib/session";

export function AppShell({
  profile,
  role,
  nav,
  children,
}: {
  profile: Profile;
  role: AppRole;
  nav?: React.ReactNode;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { mode: "login" }, replace: true });
  }

  return (
    <PhoneFrame>
      <header className="bg-darkgrad sticky top-0 z-10">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <Logo className="h-9 w-9" />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-semibold text-warm">
                {profile.full_name || profile.email}
              </p>
              <p className="text-[11px] text-gold2">{roleLabel[role]}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            aria-label="Sign out"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold/50 text-gold2"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 space-y-4 px-4 pb-6 pt-4">{children}</main>

      {nav}
    </PhoneFrame>
  );
}

export function BottomNav({
  items,
  active,
  onChange,
}: {
  items: { key: string; label: string; icon: React.ComponentType<{ className?: string }> }[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <nav className="sticky bottom-0 border-t border-border bg-surface">
      <div className="flex">
        {items.map((it) => {
          const Icon = it.icon;
          const on = active === it.key;
          return (
            <button
              key={it.key}
              onClick={() => onChange(it.key)}
              className={`flex flex-1 flex-col items-center gap-1 py-3 text-[11px] font-semibold transition ${
                on ? "text-maroon" : "text-ink3"
              }`}
            >
              <Icon className={`h-5 w-5 ${on ? "text-maroon" : "text-ink3"}`} />
              {it.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    approved: "bg-green/10 text-green border-green/30",
    pending: "bg-saffron/10 text-saffron border-saffron/30",
    rejected: "bg-crimson/10 text-crimson border-crimson/30",
    revoked: "bg-ink3/10 text-ink3 border-ink3/30",
    confirmed: "bg-green/10 text-green border-green/30",
  };
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${
        styles[status] ?? "bg-surf3 text-ink2 border-border"
      }`}
    >
      {status}
    </span>
  );
}

export function SectionCard({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="card-sv p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-ink3">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
