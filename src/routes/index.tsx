import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Sparkles } from "lucide-react";
import { PhoneFrame } from "@/components/PhoneFrame";
import logoUrl from "@/assets/swar-vijay-logo.jpg";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Swar Vijay Music Academy — Welcome" },
      {
        name: "description",
        content:
          "Swar Vijay Music Academy app: Keyboard, Tabla, Octopad — Learn from stage-tested gurus at your own pace.",
      },
      { property: "og:title", content: "Swar Vijay Music Academy — Welcome" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { session, loading } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) navigate({ to: "/dashboard", replace: true });
  }, [loading, session, navigate]);

  return (
    <PhoneFrame>
      <div className="bg-darkgrad relative flex flex-1 flex-col justify-between overflow-hidden min-h-screen">
        {/* Radial Gold Glow Background */}
        <div className="absolute inset-0 bg-[radial-gradient(520px_380px_at_50%_22%,rgba(212,175,55,0.20),transparent_65%)] pointer-events-none" />

        {/* Content */}
        <div className="relative flex flex-1 flex-col items-center justify-center px-7 text-center pt-8">
          {/* Logo with gold glow and circular white background */}
          <div className="relative mb-6">
            <img
              src={logoUrl}
              alt="Swar Vijay Music Academy logo"
              className="h-48 w-48 rounded-full bg-white p-3.5 object-contain shadow-glow ring-2 ring-gold/40"
            />
          </div>

          <div className="mr text-2xl font-semibold text-gold2 tracking-wide">
            ताल · स्वर · रंग
          </div>

          <h1 className="font-display font-black text-3xl leading-tight text-warm mt-3">
            Swar Vijay<br />Music Academy
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-[#D9BAC3]">
            Keyboard · Tabla · Octopad<br />
            Learn from stage-tested gurus, at your own pace.
          </p>
        </div>

        {/* CTA Buttons & Footer */}
        <div className="relative px-6 pb-8 pt-4">
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="bg-goldgrad flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[#3A2508] font-bold text-base shadow-[0_12px_26px_-12px_rgba(212,175,55,0.9)] transition hover:opacity-95"
          >
            <Sparkles className="h-5 w-5" />
            Create Account
          </Link>

          <Link
            to="/auth"
            search={{ mode: "login" }}
            className="mt-3 block w-full rounded-2xl border border-white/15 bg-white/10 py-3.5 text-center font-bold text-warm text-base transition hover:bg-white/15"
          >
            I already have an account
          </Link>

          <p className="mt-4 text-center text-xs text-[#8F7078]">
            One account · one active device
          </p>
        </div>
      </div>
    </PhoneFrame>
  );
}
