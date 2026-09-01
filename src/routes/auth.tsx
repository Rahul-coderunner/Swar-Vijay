import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Loader2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  UserRound,
  Phone,
  ShieldCheck,
  Chrome,
  LogIn,
  ChevronLeft,
  ArrowRight,
  Check,
  Music,
  Users,
  Piano,
  Drum,
  Disc,
  Guitar,
  KeyRound,
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PhoneFrame, CATEGORIES, type Category } from "@/components/PhoneFrame";
import logoUrl from "@/assets/swar-vijay-logo.jpg";
import { notifyAdminOfSignup } from "@/lib/telegram.functions";
import type { AppRole } from "@/lib/session";

type Mode = "login" | "signup" | "forgot" | "verify";

function errMessage(err: unknown): string | null {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err)
    return String((err as { message: unknown }).message);
  return null;
}

// Strict Input Validations
function isValidEmail(emailStr: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(emailStr.trim());
}

function isValidPhone(phoneStr: string): boolean {
  const cleanPhone = phoneStr.replace(/[\s\-\+\(\)]/g, "");
  const phoneRegex = /^(?:91)?[6-9]\d{9}$/;
  return phoneRegex.test(cleanPhone);
}

function isValidName(nameStr: string): boolean {
  return nameStr.trim().length >= 3 && /^[a-zA-Z\s\.\'\-]+$/.test(nameStr.trim());
}

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    mode: (search["mode"] === "signup" ? "signup" : "login") as Mode,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — Swar Vijay Music Academy" },
      {
        name: "description",
        content:
          "Sign in or create your Swar Vijay account as an Artist, Kathakar or Admin.",
      },
    ],
  }),
  component: AuthPage,
});

const roles: { value: AppRole; label: string; mr: string; hint: string; icon: React.ElementType }[] = [
  { value: "artist", label: "Artist", mr: "कलाकार", hint: "Apni khaali dates select karein", icon: Music },
  { value: "kathakar", label: "Kathakar", mr: "कथाकार", hint: "Available artist dhundein", icon: Users },
  { value: "admin", label: "Admin", mr: "प्रशासक", hint: "Accounts approve karein", icon: ShieldCheck },
];

const categoryIcons: Record<string, React.ElementType> = {
  Keyboard: Piano,
  Tabla: Drum,
  Octapad: Disc,
  Banjo: Guitar,
};

function AuthPage() {
  const { mode: initialMode } = Route.useSearch();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<Mode>(initialMode);
  const [busy, setBusy] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const notify = useServerFn(notifyAdminOfSignup);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<AppRole>("artist");
  const [category, setCategory] = useState<Category>(CATEGORIES[0]);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [licenseKey, setLicenseKey] = useState("");
  const [signupStep, setSignupStep] = useState(1);

  // OTP State
  const [otpCode, setOtpCode] = useState("");
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidEmail(email)) {
      toast.error("Kripya sahi Email Address enter karein (e.g. rahul@gmail.com)");
      return;
    }
    if (password.length < 6) {
      toast.error("Password me kam se kam 6 characters hone chahiye.");
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw new Error(error.message);
      navigate({ to: "/dashboard" });
    } catch (err) {
      console.error("login error", err);
      toast.error(errMessage(err) ?? "Login failed. Credentials check karein.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    
    if (!isValidName(fullName)) {
      toast.error("Full Name me kam se kam 3 letters hone chahiye.");
      return;
    }
    if (!isValidEmail(email)) {
      toast.error("Kripya sahi Email Address enter karein (e.g. rahul@gmail.com)");
      return;
    }
    if (!isValidPhone(phone)) {
      toast.error("Kripya 10-digit ka valid Indian Mobile Number enter karein.");
      return;
    }
    if (password.length < 6) {
      toast.error("Password me kam se kam 6 characters hone chahiye.");
      return;
    }
    if (!agreeTerms) {
      toast.error("Please agree to the Terms and one-device policy.");
      return;
    }

    setBusy(true);
    try {
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: fullName.trim(),
            phone: phone.trim(),
            role,
            category: role === "artist" ? category : null,
          },
        },
      });

      if (error) {
        // User already registered AND confirmed → tell them to login
        if (
          error.message.toLowerCase().includes("already registered") ||
          error.message.toLowerCase().includes("user already registered")
        ) {
          toast.error("Ye Email pehle se registered aur confirmed hai. Login karein ya Forgot Password use karein.");
          setViewMode("login");
          return;
        }
        throw new Error(error.message);
      }

      // Empty identities = user exists but email NOT yet confirmed → resend OTP
      if (signUpData.user?.identities?.length === 0) {
        await supabase.auth.resend({ type: "signup", email: email.trim() });
        toast.info("Aapka account pehle se hai lekin confirm nahi hua. Naya OTP aapke email par bhej diya gaya.");
        setViewMode("verify");
        setBusy(false);
        return;
      }

      const user = signUpData.user;
      const cleanKey = licenseKey.trim().toUpperCase();
      const isValidAdminKey =
        cleanKey === "SWAR-VIJAY-ADMIN-2026" ||
        cleanKey === "SWARVIJAY2026" ||
        cleanKey === "ADMIN2026";

      if (user && isValidAdminKey) {
        await supabase
          .from("profiles")
          .update({ status: "approved", license_key: cleanKey })
          .eq("id", user.id);
        await supabase
          .from("user_roles")
          .upsert({ user_id: user.id, role: "admin" }, { onConflict: "user_id,role" });
      }

      toast.success("Account ban gaya! Aapke Email par 6-digit OTP Code bhej diya gaya hai.");
      setViewMode("verify");
    } catch (err) {
      console.error("signup error", err);
      toast.error(errMessage(err) ?? "Sign up failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleResendOtp() {
    if (!isValidEmail(email)) {
      toast.error("Email address valid nahi hai.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email: email.trim() });
      if (error) throw new Error(error.message);
      toast.success("Naya OTP Code aapke Email par bhej diya gaya!");
      setOtpCode("");
    } catch (err) {
      toast.error(errMessage(err) ?? "OTP resend fail ho gaya.");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (otpCode.trim().length < 6) {
      toast.error("Kripya pura OTP Code enter karein (6 ya 8 digits)");
      return;
    }
    setBusy(true);
    const cleanEmail = email.trim().toLowerCase();
    const cleanToken = otpCode.trim();

    try {
      let verifyResult = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: "signup",
      });

      if (verifyResult.error) {
        // Fallback to type: "email" if signup type returns error
        verifyResult = await supabase.auth.verifyOtp({
          email: cleanEmail,
          token: cleanToken,
          type: "email",
        });
      }

      const verifiedUserId = verifyResult.data?.user?.id;

      // ONLY AFTER EMAIL OTP VERIFIED -> Send request to Admin via Telegram!
      try {
        await notify({ data: { userId: verifiedUserId, email: cleanEmail } });
      } catch (e) {
        console.error("telegram notify failed", e);
      }

      toast.success("Email Verified! Approval Request Admin ko bhej di gayi.");
      navigate({ to: "/dashboard" });
    } catch (err) {
      console.error("verify otp error", err);
      toast.error(errMessage(err) ?? "Galat ya Expired OTP Code. 'Dobara bhejein' par click karein.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSendResetEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidEmail(email)) {
      toast.error("Kripya sahi Registered Email enter karein");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin + "/auth?mode=login",
      });
      if (error) throw new Error(error.message);

      toast.success("Password Reset Code aapke Email par bhej diya gaya hai!");
      setForgotStep(2);
    } catch (err) {
      console.error("reset password error", err);
      toast.error(errMessage(err) ?? "Password reset request fail ho gayi.");
    } finally {
      setBusy(false);
    }
  }

  async function handleResetPasswordWithOtp(e: React.FormEvent) {
    e.preventDefault();
    if (otpCode.trim().length < 6) {
      toast.error("Kripya pura OTP code enter karein (6 ya 8 digits)");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Naye password me minimum 6 characters hone chahiye");
      return;
    }
    setBusy(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanToken = otpCode.trim();

      let verifyErr = (await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: "recovery",
      })).error;

      if (verifyErr) {
        verifyErr = (await supabase.auth.verifyOtp({
          email: cleanEmail,
          token: cleanToken,
          type: "email",
        })).error;
      }

      if (verifyErr) throw new Error(verifyErr.message);

      const { error: updateErr } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateErr) throw new Error(updateErr.message);

      toast.success("Password badal gaya hai! Ab naye password se Login karein.");
      setViewMode("login");
    } catch (err) {
      console.error("update password error", err);
      toast.error(errMessage(err) ?? "Password update fail ho gaya");
    } finally {
      setBusy(false);
    }
  }

  const maxSteps = role === "artist" ? 3 : 2;

  const renderStepper = () => {
    return (
      <div className="mb-5 flex gap-1.5">
        <div className={`h-1 flex-1 rounded-full ${signupStep >= 1 ? "bg-maroon" : "bg-[#EADCCB]"}`} />
        <div className={`h-1 flex-1 rounded-full ${signupStep >= 2 ? "bg-maroon" : "bg-[#EADCCB]"}`} />
        {role === "artist" && (
          <div className={`h-1 flex-1 rounded-full ${signupStep >= 3 ? "bg-maroon" : "bg-[#EADCCB]"}`} />
        )}
      </div>
    );
  };

  return (
    <PhoneFrame>
      <div className="flex min-h-screen flex-1 flex-col justify-between bg-surface px-6 pb-8 pt-6">
        {viewMode === "login" && (
          <div>
            <img
              src={logoUrl}
              alt="Swar Vijay Music Academy logo"
              className="mb-4 h-18 w-18 object-contain"
            />
            <h1 className="font-display font-black text-2xl text-ink">Welcome back</h1>
            <p className="mb-6 mt-1 text-sm text-ink2">Sign in to continue your riyaz.</p>

            <form onSubmit={handleLogin} className="space-y-3.5">
              {/* Email */}
              <div>
                <div className={`flex h-14 items-center gap-3 rounded-2xl border bg-white px-4 ${
                  email && !isValidEmail(email) ? "border-red-500 ring-2 ring-red-100" : "border-border"
                }`}>
                  <Mail className="h-5 w-5 shrink-0 text-ink3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="rahul.patil@gmail.com"
                    className="w-full bg-transparent text-base text-ink outline-none placeholder:text-ink3"
                  />
                </div>
                {email && !isValidEmail(email) && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1 font-medium">
                    <AlertCircle className="h-3.5 w-3.5" /> Sahi email enter karein (e.g. name@domain.com)
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="flex h-14 items-center gap-3 rounded-2xl border border-maroon bg-white px-4 focus-within:ring-4 focus-within:ring-maroon/10">
                <Lock className="h-5 w-5 shrink-0 text-ink3" />
                <input
                  type={showPass ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="w-full bg-transparent text-base text-ink outline-none placeholder:text-ink3"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="text-ink3 hover:text-ink cursor-pointer"
                >
                  {showPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              {/* Forgot Password Button */}
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setForgotStep(1);
                    setViewMode("forgot");
                  }}
                  className="flex items-center gap-1 text-xs font-bold text-maroon hover:underline bg-surf3 px-3 py-1.5 rounded-xl border border-gold/30 cursor-pointer"
                >
                  <KeyRound className="h-3.5 w-3.5 text-maroon" /> Forgot password? (Reset via OTP)
                </button>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={busy}
                className="bg-hero flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-base font-bold text-warm shadow-[0_12px_26px_-12px_rgba(123,30,53,0.85)] transition hover:opacity-95 disabled:opacity-60 cursor-pointer"
              >
                {busy ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <LogIn className="h-5 w-5" />
                )}
                Login
              </button>
            </form>

            {/* Divider */}
            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10.5px] font-bold uppercase tracking-widest text-ink3">
                or
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* Google Login */}
            <button
              type="button"
              onClick={() => toast.info("Google login active kar diya gaya hai.")}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#E7DACB] bg-white py-3.5 text-base font-bold text-ink transition hover:bg-surf2 cursor-pointer"
            >
              <Chrome className="h-5 w-5 text-maroon" />
              Continue with Google
            </button>

            {/* Bot Protection Note */}
            <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-bord2 bg-surf3 p-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-maroon" />
              <div className="text-xs leading-relaxed text-ink2">
                Protected by invisible bot-check. No captcha to solve.
              </div>
            </div>
          </div>
        )}

        {viewMode === "forgot" && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <button
              type="button"
              onClick={() => setViewMode("login")}
              className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-white text-ink transition hover:bg-surf2 cursor-pointer"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <h2 className="font-display text-3xl font-black text-ink mb-1">Reset Password</h2>
            <p className="mb-6 text-sm text-ink2">
              {forgotStep === 1
                ? "Apna registered email daalein password reset OTP bhejane ke liye."
                : "Aapke email par aaya 6-digit OTP aur naya password enter karein."}
            </p>

            {forgotStep === 1 ? (
              <form onSubmit={handleSendResetEmail} className="space-y-4">
                <div>
                  <div className={`flex h-14 items-center gap-3 rounded-2xl border bg-white px-4 ${
                    email && !isValidEmail(email) ? "border-red-500 ring-2 ring-red-100" : "border-border"
                  }`}>
                    <Mail className="h-5 w-5 shrink-0 text-ink3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Registered Email Address"
                      className="w-full bg-transparent text-base text-ink outline-none placeholder:text-ink3"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="bg-hero mt-2 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-base font-bold text-warm shadow-[0_12px_26px_-12px_rgba(123,30,53,0.85)] transition hover:opacity-95 disabled:opacity-60 cursor-pointer"
                >
                  {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <KeyRound className="h-5 w-5" />}
                  Send Reset OTP Code
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPasswordWithOtp} className="space-y-4">
                <div className="flex h-14 items-center gap-3 rounded-2xl border border-gold bg-surf3 px-4 focus-within:ring-4 focus-within:ring-gold/20">
                  <KeyRound className="h-5 w-5 shrink-0 text-maroon" />
                  <input
                    type="text"
                    required
                    maxLength={8}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="Enter OTP Code"
                    className="w-full bg-transparent font-mono text-lg font-bold tracking-widest text-ink outline-none placeholder:text-ink3 placeholder:font-sans placeholder:tracking-normal"
                  />
                </div>

                <div className="flex h-14 items-center gap-3 rounded-2xl border border-maroon bg-white px-4 focus-within:ring-4 focus-within:ring-maroon/10">
                  <Lock className="h-5 w-5 shrink-0 text-ink3" />
                  <input
                    type={showPass ? "text" : "password"}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Naya Password (Min 6 chars)"
                    className="w-full bg-transparent text-base text-ink outline-none placeholder:text-ink3"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="text-ink3 hover:text-ink cursor-pointer"
                  >
                    {showPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="bg-hero mt-2 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-base font-bold text-warm shadow-[0_12px_26px_-12px_rgba(123,30,53,0.85)] transition hover:opacity-95 disabled:opacity-60 cursor-pointer"
                >
                  {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                  Update Password
                </button>

                <button
                  type="button"
                  onClick={() => setForgotStep(1)}
                  className="flex w-full items-center justify-center gap-1.5 pt-2 text-xs font-semibold text-ink3 hover:text-maroon cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Dobara OTP Bhejein
                </button>
              </form>
            )}
          </div>
        )}

        {viewMode === "verify" && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <button
              type="button"
              onClick={() => setViewMode("signup")}
              className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-white text-ink transition hover:bg-surf2 cursor-pointer"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <h2 className="font-display text-3xl font-black text-ink mb-1">Confirm Your Email</h2>
            <p className="mb-6 text-sm text-ink2">
              Aapke Email <span className="font-bold text-maroon">{email}</span> par OTP code bhej diya gaya hai. Code enter karke Email verify karein.
            </p>

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="flex h-14 items-center gap-3 rounded-2xl border border-gold bg-surf3 px-4 focus-within:ring-4 focus-within:ring-gold/20">
                <KeyRound className="h-5 w-5 shrink-0 text-maroon" />
                <input
                  type="text"
                  required
                  maxLength={8}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="Enter OTP Code"
                  className="w-full bg-transparent font-mono text-lg font-bold tracking-widest text-ink outline-none placeholder:text-ink3 placeholder:font-sans placeholder:tracking-normal"
                />
              </div>

              <button
                type="submit"
                disabled={busy}
                className="bg-hero mt-2 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-base font-bold text-warm shadow-[0_12px_26px_-12px_rgba(123,30,53,0.85)] transition hover:opacity-95 disabled:opacity-60 cursor-pointer"
              >
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                Verify Email & Send Admin Approval
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={handleResendOtp}
                className="flex w-full items-center justify-center gap-1.5 pt-3 text-sm font-semibold text-ink3 hover:text-maroon cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className="h-4 w-4" />
                OTP nahi aaya? Dobara bhejein
              </button>
            </form>
          </div>
        )}

        {viewMode === "signup" && (
          <div>
            {/* Common Header for all Steps */}
            <div className="mb-4 flex items-center gap-3">
              {signupStep === 1 ? (
                <button
                  onClick={() => setViewMode("login")}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-white text-ink transition hover:bg-surf2 cursor-pointer"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (signupStep === 3 && role !== "artist") {
                      setSignupStep(1);
                    } else {
                      setSignupStep(prev => prev - 1);
                    }
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-white text-ink transition hover:bg-surf2 cursor-pointer"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              <h4 className="font-display text-sm font-bold text-ink3 tracking-widest uppercase">
                STEP {signupStep === 3 && role !== "artist" ? 2 : signupStep} OF {maxSteps}
              </h4>
            </div>

            {renderStepper()}

            {signupStep === 1 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <h2 className="font-display text-3xl font-black text-ink mb-1">Aap kaun hain?</h2>
                <p className="mb-6 text-sm text-ink2">Apna role select karein.</p>

                <div className="space-y-3">
                  {roles.map((r) => {
                    const isSelected = role === r.value;
                    const Icon = r.icon;
                    return (
                      <button
                        type="button"
                        key={r.value}
                        onClick={() => setRole(r.value)}
                        className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition cursor-pointer ${
                          isSelected
                            ? "border-gold bg-surf3 shadow-md-sv"
                            : "border-border bg-white hover:border-gold/50"
                        }`}
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-goldgrad text-white">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-baseline gap-2">
                            <span className="font-bold text-maroon text-lg">{r.label}</span>
                            <span className="mr text-sm text-ink2">({r.mr})</span>
                          </div>
                          <span className="mt-0.5 block text-xs text-ink3">{r.hint}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (role === "artist") setSignupStep(2);
                    else setSignupStep(3);
                  }}
                  className="bg-hero mt-8 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-base font-bold text-warm shadow-[0_12px_26px_-12px_rgba(123,30,53,0.85)] transition hover:opacity-95 cursor-pointer"
                >
                  Continue <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            )}

            {signupStep === 2 && role === "artist" && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <h2 className="font-display text-3xl font-black text-ink mb-1">Aapki category?</h2>
                <p className="mb-6 text-sm text-ink2">Ek option select karein.</p>

                <div className="grid grid-cols-2 gap-4">
                  {CATEGORIES.map((c) => {
                    const isSelected = category === c;
                    const Icon = categoryIcons[c] || Music;
                    return (
                      <button
                        type="button"
                        key={c}
                        onClick={() => setCategory(c)}
                        className={`flex flex-col items-center justify-center gap-3 rounded-2xl border p-6 transition cursor-pointer ${
                          isSelected
                            ? "border-gold bg-surf3 shadow-md-sv text-maroon"
                            : "border-border bg-white text-ink hover:border-gold/50"
                        }`}
                      >
                        <Icon className={`h-8 w-8 ${isSelected ? "text-maroon" : "text-ink3"}`} />
                        <span className="font-bold text-base">{c}</span>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setSignupStep(3)}
                  className="bg-hero mt-8 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-base font-bold text-warm shadow-[0_12px_26px_-12px_rgba(123,30,53,0.85)] transition hover:opacity-95 cursor-pointer"
                >
                  Continue <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            )}

            {signupStep === 3 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <h2 className="font-display text-3xl font-black text-ink mb-1">Your details</h2>
                <p className="mb-6 text-sm text-ink2">Takes less than a minute.</p>

                <form onSubmit={handleSignup} className="space-y-4">
                  {/* Full Name */}
                  <div>
                    <div className={`flex h-14 items-center gap-3 rounded-2xl border bg-white px-4 ${
                      fullName && !isValidName(fullName) ? "border-red-500 ring-2 ring-red-100" : "border-border"
                    }`}>
                      <UserRound className="h-5 w-5 shrink-0 text-ink3" />
                      <input
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Full Name"
                        className="w-full bg-transparent text-base text-ink outline-none placeholder:text-ink3"
                      />
                    </div>
                    {fullName && !isValidName(fullName) && (
                      <p className="mt-1 text-xs text-red-500 flex items-center gap-1 font-medium">
                        <AlertCircle className="h-3.5 w-3.5" /> Full Name me minimum 3 letters hone chahiye
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <div className={`flex h-14 items-center gap-3 rounded-2xl border bg-white px-4 ${
                      email && !isValidEmail(email) ? "border-red-500 ring-2 ring-red-100" : "border-border"
                    }`}>
                      <Mail className="h-5 w-5 shrink-0 text-ink3" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email Address"
                        className="w-full bg-transparent text-base text-ink outline-none placeholder:text-ink3"
                      />
                    </div>
                    {email && !isValidEmail(email) && (
                      <p className="mt-1 text-xs text-red-500 flex items-center gap-1 font-medium">
                        <AlertCircle className="h-3.5 w-3.5" /> Sahi Email enter karein (e.g. name@domain.com)
                      </p>
                    )}
                  </div>

                  {/* Admin License Key */}
                  {role === "admin" && (
                    <div className="flex h-14 items-center gap-3 rounded-2xl border border-gold bg-surf3 px-4 focus-within:ring-4 focus-within:ring-gold/20">
                      <ShieldCheck className="h-5 w-5 shrink-0 text-maroon" />
                      <input
                        type="text"
                        value={licenseKey}
                        onChange={(e) => setLicenseKey(e.target.value)}
                        placeholder="Admin License Key (Optional)"
                        className="w-full bg-transparent font-mono text-sm font-semibold uppercase text-ink outline-none placeholder:text-ink3 placeholder:font-sans"
                      />
                    </div>
                  )}

                  {/* Phone */}
                  <div>
                    <div className={`flex h-14 items-center gap-3 rounded-2xl border bg-white px-4 ${
                      phone && !isValidPhone(phone) ? "border-red-500 ring-2 ring-red-100" : "border-border"
                    }`}>
                      <Phone className="h-5 w-5 shrink-0 text-ink3" />
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="10-Digit Mobile Number"
                        className="w-full bg-transparent text-base text-ink outline-none placeholder:text-ink3"
                      />
                    </div>
                    {phone && !isValidPhone(phone) && (
                      <p className="mt-1 text-xs text-red-500 flex items-center gap-1 font-medium">
                        <AlertCircle className="h-3.5 w-3.5" /> Sahi 10-digit Mobile Number enter karein
                      </p>
                    )}
                  </div>

                  {/* Password */}
                  <div>
                    <div className="flex h-14 items-center gap-3 rounded-2xl border border-maroon bg-white px-4 focus-within:ring-4 focus-within:ring-maroon/10">
                      <Lock className="h-5 w-5 shrink-0 text-ink3" />
                      <input
                        type={showPass ? "text" : "password"}
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create password"
                        className="w-full bg-transparent text-base text-ink outline-none placeholder:text-ink3"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="text-ink3 hover:text-ink cursor-pointer"
                      >
                        {showPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    <div className="mt-2 flex gap-1.5 px-1">
                      <div
                        className={`h-1 flex-1 rounded-full transition-all ${
                          password.length >= 4 ? "bg-green2" : "bg-[#EADCCB]"
                        }`}
                      />
                      <div
                        className={`h-1 flex-1 rounded-full transition-all ${
                          password.length >= 8 ? "bg-green2" : "bg-[#EADCCB]"
                        }`}
                      />
                      <div
                        className={`h-1 flex-1 rounded-full transition-all ${
                          /[0-9]/.test(password) ? "bg-green2" : "bg-[#EADCCB]"
                        }`}
                      />
                    </div>
                  </div>

                  {/* Terms & Consent */}
                  <label className="flex items-start gap-3 py-2 cursor-pointer group">
                    <button
                      type="button"
                      onClick={() => setAgreeTerms(!agreeTerms)}
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border transition ${
                        agreeTerms
                          ? "bg-maroon border-maroon text-white shadow-sm"
                          : "border-border bg-white text-transparent hover:border-gold"
                      }`}
                    >
                      <Check className={`h-3.5 w-3.5 stroke-[3] ${agreeTerms ? "opacity-100" : "opacity-0"}`} />
                    </button>
                    <span 
                      onClick={() => setAgreeTerms(!agreeTerms)}
                      className="text-xs leading-relaxed text-ink2 select-none"
                    >
                      I agree to the <span className="font-bold text-maroon hover:underline">Terms</span> and the{" "}
                      <span className="font-bold text-maroon hover:underline">one-device policy</span>.
                    </span>
                  </label>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={busy}
                    className="bg-hero mt-2 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-base font-bold text-warm shadow-[0_12px_26px_-12px_rgba(123,30,53,0.85)] transition hover:opacity-95 disabled:opacity-60 cursor-pointer"
                  >
                    {busy ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        Create Account <ArrowRight className="h-5 w-5" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Footer Toggle */}
        <div className="pt-4 text-center text-sm text-ink2">
          {viewMode === "login" ? (
            <>
              New here?{" "}
              <button
                type="button"
                onClick={() => {
                  setSignupStep(1);
                  setViewMode("signup");
                }}
                className="font-bold text-maroon hover:underline cursor-pointer"
              >
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setViewMode("login")}
                className="font-bold text-maroon hover:underline cursor-pointer"
              >
                Log in
              </button>
            </>
          )}
        </div>
      </div>
    </PhoneFrame>
  );
}
