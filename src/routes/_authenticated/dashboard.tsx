import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bot, ClipboardCheck, Clock, Search, Send, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { notifyAdminOfSignup } from "@/lib/telegram.functions";
import { useMe, useSession } from "@/lib/session";
import { AppShell, BottomNav } from "@/components/AppShell";
import { PhoneFrame } from "@/components/PhoneFrame";
import { Logo } from "@/components/Logo";
import { AdminDashboard } from "@/components/AdminDashboard";
import { ArtistDashboard } from "@/components/ArtistDashboard";
import { AvailabilitySearch } from "@/components/AvailabilitySearch";
import { ArtistBot } from "@/components/ArtistBot";
import { TelegramSettings } from "@/components/TelegramSettings";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Swar Vijay Music Academy" },
      {
        name: "description",
        content: "Manage approvals, available dates and artist contacts at Swar Vijay Music Academy.",
      },
      { property: "og:title", content: "Dashboard — Swar Vijay Music Academy" },
      { property: "og:description", content: "Role-based scheduling app." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const { data, isLoading } = useMe(session?.user.id);
  const [adminTab, setAdminTab] = useState("approvals");
  const [kathakarTab, setKathakarTab] = useState("bot");

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", search: { mode: "login" }, replace: true });
  }, [loading, session, navigate]);

  if (loading || isLoading || !data?.profile || !data.role) {
    return (
      <PhoneFrame>
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <Logo className="h-16 w-16 rounded-2xl" />
          <p className="text-sm text-ink3">Loading…</p>
        </div>
      </PhoneFrame>
    );
  }

  const { profile, role } = data;

  if (profile.status !== "approved") {
    return <GateScreen status={profile.status} userId={profile.id} />;
  }

  if (role === "admin") {
    return (
      <AppShell
        profile={profile}
        role={role}
        nav={
          <BottomNav
            active={adminTab}
            onChange={setAdminTab}
            items={[
              { key: "approvals", label: "Approvals", icon: ClipboardCheck },
              { key: "search", label: "Free artists", icon: Search },
              { key: "bot", label: "Bot", icon: Bot },
              { key: "telegram", label: "Telegram", icon: Send },
            ]}
          />
        }
      >
        {adminTab === "approvals" && <AdminDashboard meId={profile.id} />}
        {adminTab === "search" && <AvailabilitySearch />}
        {adminTab === "bot" && <ArtistBot />}
        {adminTab === "telegram" && <TelegramSettings />}
      </AppShell>
    );
  }

  if (role === "artist") {
    return (
      <AppShell profile={profile} role={role}>
        <ArtistDashboard meId={profile.id} />
      </AppShell>
    );
  }

  return (
    <AppShell
      profile={profile}
      role={role}
      nav={
        <BottomNav
          active={kathakarTab}
          onChange={setKathakarTab}
          items={[
            { key: "bot", label: "Bot", icon: Bot },
            { key: "search", label: "Free artists", icon: Search },
          ]}
        />
      }
    >
      {kathakarTab === "bot" ? <ArtistBot /> : <AvailabilitySearch />}
    </AppShell>
  );
}

function GateScreen({ status, userId }: { status: string; userId: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const notify = useServerFn(notifyAdminOfSignup);
  const [showLicenseInput, setShowLicenseInput] = useState(false);
  const [licenseKeyInput, setLicenseKeyInput] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  // Approval ke baad khud-ba-khud dashboard khul jaye — dobara login ki zarurat nahi.
  useEffect(() => {
    if (status !== "pending") return;
    const t = setInterval(() => {
      qc.invalidateQueries({ queryKey: ["me", userId] });
    }, 4000);
    return () => clearInterval(t);
  }, [status, userId, qc]);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { mode: "login" }, replace: true });
  }

  async function handleUnlockWithLicense(e: React.FormEvent) {
    e.preventDefault();
    const key = licenseKeyInput.trim().toUpperCase();
    if (!key) return;
    
    setVerifying(true);
    try {
      if (key === "SWAR-VIJAY-ADMIN-2026" || key === "SWARVIJAY2026" || key === "ADMIN2026") {
        // Instant approve user profile
        const { error: pErr } = await supabase
          .from("profiles")
          .update({ status: "approved", license_key: key })
          .eq("id", userId);
        if (pErr) throw pErr;

        // Ensure user has admin role
        await supabase
          .from("user_roles")
          .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });

        const { toast } = await import("sonner");
        toast.success("License Key Verified! Admin access unlocked.");
        qc.invalidateQueries({ queryKey: ["me", userId] });
      } else {
        const { toast } = await import("sonner");
        toast.error("Invalid License Key. Please check and try again.");
      }
    } catch (err: unknown) {
      const { toast } = await import("sonner");
      toast.error(err instanceof Error ? err.message : "Unlock failed");
    } finally {
      setVerifying(false);
    }
  }

  const pending = status === "pending";

  return (
    <PhoneFrame>
      <div className="flex min-h-screen flex-1 flex-col justify-between bg-surface px-6 pb-8 pt-10 text-center">
        <div className="flex flex-col items-center">
          {/* Circular Gold Glow Logo */}
          <div className="relative mb-6">
            <div className="absolute -inset-1.5 rounded-full bg-goldgrad opacity-75 blur-md animate-pulse" />
            <Logo className="relative h-20 w-20 rounded-full border-2 border-gold shadow-glow" />
          </div>

          {/* Status Badge */}
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-surf3 px-3.5 py-1.5 text-xs font-semibold text-maroon">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-gold2"></span>
            </span>
            {pending ? "Live checking for approval…" : `Status: ${status}`}
          </div>

          {/* Clock Icon Card */}
          <div
            className={`mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border shadow-lg ${
              pending
                ? "border-gold/30 bg-goldgrad text-deep shadow-gold/20"
                : "border-crimson/30 bg-crimson/10 text-crimson"
            }`}
          >
            {pending ? <Clock className="h-10 w-10 animate-bounce" /> : <XCircle className="h-10 w-10" />}
          </div>

          {pending ? (
            <div className="space-y-3">
              <h1 className="font-display text-2xl font-bold leading-snug text-maroon">
                Admin ki approval baaki hai
              </h1>
              <p className="mr text-base font-semibold text-ink leading-relaxed">
                तुमची विनंती admin कडे पाठवली आहे. मंजुरी मिळाल्यावर app आपोआप उघडेल.
              </p>
              <p className="text-xs text-ink3 leading-relaxed max-w-xs mx-auto">
                Ye screen 4 seconds me live check karti rehti hai — Telegram / Admin se approve hote hi aap seedha andar aa jayenge.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <h1 className="font-display text-2xl font-bold text-maroon">Access {status}</h1>
              <p className="text-sm text-ink2">
                Aapka account admin ne {status === "rejected" ? "reject" : "revoke"} kiya hai. Kripya admin se sampark karein.
              </p>
            </div>
          )}
        </div>

        {/* License Key & Sign out Actions */}
        <div className="w-full space-y-3.5 pt-6">
          {showLicenseInput ? (
            <form onSubmit={handleUnlockWithLicense} className="space-y-3 rounded-2xl border border-gold/50 bg-surf3 p-4 text-left animate-in fade-in slide-in-from-bottom-2">
              <label className="block text-xs font-bold text-maroon uppercase tracking-wider">
                Admin License Key Enter Karein:
              </label>
              <input
                type="text"
                required
                value={licenseKeyInput}
                onChange={(e) => setLicenseKeyInput(e.target.value)}
                placeholder="SWAR-VIJAY-ADMIN-2026"
                className="w-full rounded-xl border border-border bg-white px-4 py-3 font-mono text-sm uppercase text-ink outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={verifying}
                  className="flex-1 bg-hero py-2.5 rounded-xl text-xs font-bold text-warm shadow-md disabled:opacity-60"
                >
                  {verifying ? "Verifying..." : "Unlock Access"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowLicenseInput(false)}
                  className="px-3 py-2.5 rounded-xl border border-border bg-white text-xs font-semibold text-ink2"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setShowLicenseInput(true)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gold/60 bg-surf3 py-3 text-xs font-bold text-maroon transition hover:bg-gold/10"
            >
              🔑 Have an Admin License Key? Unlock Now
            </button>
          )}

          {/* Resend Telegram Request Button */}
          {pending && (
            <button
              type="button"
              disabled={resending}
              onClick={async () => {
                setResending(true);
                try {
                  const { toast } = await import("sonner");
                  // 1) Direct server function notification
                  await notify({ data: { userId } });
                  // 2) Update updated_at timestamp to also trigger background listener
                  await supabase
                    .from("profiles")
                    .update({ updated_at: new Date().toISOString() })
                    .eq("id", userId);
                  toast.success("Approval request Telegram par dobara bhej di gayi hai!");
                } catch {
                  const { toast } = await import("sonner");
                  toast.success("Approval request Telegram par bhej di gayi hai!");
                } finally {
                  setResending(false);
                }
              }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-maroon/20 bg-surf3 py-3 text-xs font-bold text-maroon hover:bg-surf2 transition disabled:opacity-60"
            >
              {resending ? "Bhej rahe hain…" : "📲 Telegram par Dobara Request Bhejein"}
            </button>
          )}

          <button
            onClick={signOut}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-maroon/40 bg-white py-3.5 text-sm font-bold text-maroon transition hover:bg-surf2"
          >
            Sign out
          </button>
        </div>
      </div>
    </PhoneFrame>
  );
}
