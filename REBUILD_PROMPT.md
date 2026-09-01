# Swar Vijay — Lovable Rebuild Prompt (isko copy karke naye Lovable project me paste karein)

Ye zip ek **TanStack Start + React 19 + Tailwind v4 + Lovable Cloud (Supabase)** app hai.
Naye Lovable project me zip paste karne ke baad, neeche wala prompt bhejein.

---

## PROMPT (copy from here)

Is zip ka poora code use karke app ko waise ka waisa chalao. Kuch bhi redesign mat karo.

**App kya hai:** "Swar Vijay Music Academy" ka artist-booking app (mobile-first phone layout).
Teen role hain — `artist`, `kathakar`, `admin`.

**Steps jo tumhe karne hain:**

1. **Lovable Cloud enable karo.** `supabase/migrations/` me jo SQL files hain, unhe waise hi apply karo
   (tables: `profiles`, `user_roles`, `artist_availability`, `bookings`, `telegram_settings`;
   functions: `has_role`, `is_approved`, `handle_new_user`, `guard_profile_privileges`, `set_updated_at`;
   trigger `on_auth_user_created` on `auth.users`). RLS + GRANTs migration me already hain — badalna mat.
2. **Auth settings:** email/password sign-up on, `auto_confirm_email = true` (OTP / email verification nahi chahiye),
   site URL + redirect URLs project ke preview aur published URL par set karo.
3. **Secret add karo:** `TELEGRAM_BOT_TOKEN` (BotFather se mila token).
4. **Telegram webhook register karo** — published/stable URL par:
   `POST https://api.telegram.org/bot<TOKEN>/setWebhook`
   body: `{ "url": "<APP_URL>/api/public/telegram/webhook",
   "secret_token": "<sha256('telegram-webhook:'+TOKEN) base64url>",
   "allowed_updates": ["message","callback_query"], "drop_pending_updates": true }`
   Wahi secret derive karne ka logic `src/lib/telegram.server.ts` → `deriveSecret()` me hai.
   Phir `telegram_settings` row (`id='default'`) me `webhook_url`, `webhook_secret`, `bot_username` save karo.
   Bot commands: `/free`, `/pending`, `/help` (`setMyCommands`).
5. **Admin banane ke liye:** signup karo, phir `user_roles` me us user ka role `admin` karo aur
   `profiles.status = 'approved'` set karo.

**Behaviour jo bilkul same rehna chahiye:**

- **Signup** → profile `status = 'pending'`, role signup form se (`artist` / `kathakar`).
  Pending user login kare to message: "Aapka account admin approval ke baad hi chalu hoga" + auto sign-out.
- **Approval** Telegram admin chat me ✅ Approve / ❌ Reject inline buttons se hoti hai
  (`/api/public/telegram/webhook`), aur admin dashboard se bhi.
  Bot ko `/start` bhejne wali chat hi admin chat ban jaati hai.
- **Artist dashboard:** calendar me apni free dates select/deselect (`artist_availability`).
- **Kathakar dashboard:** "Bot" + "Free artists" tabs — date range + category se free artist + contact number.
- **Admin dashboard:** Approvals queue, Users list, Free artists search, Bot tab, Telegram settings.
- **ArtistBot** (app ke andar chat) aur Telegram dono ek hi logic use karte hain:
  `src/lib/free-artists.ts` → natural language parse ("1 Sep se 5 Sep Tabla", "kal kon free hai") →
  approved artists jinki availability range me hai aur jo booked (non-cancelled `bookings`) nahi hain.
  Bot sirf **admin aur kathakar** ko dikhta hai, artist ko nahi.
- **Theme:** maroon / gold / cream. Sirf `src/styles.css` ke semantic tokens use karo, hardcoded colors nahi.
  Logo `src/assets/swar-vijay-logo.jpg` + `public/favicon.png`.

**Technical rules:** server logic `createServerFn` (`src/lib/telegram.functions.ts`) se;
public HTTP endpoints `src/routes/api/public/*` me; `src/start.ts` ka
`attachSupabaseAuth` function middleware mat hatao; `src/routeTree.gen.ts` generated hai, edit mat karo.

## PROMPT (end)

---

## Zip me kya hai

```
src/routes/            __root, index (landing), auth, _authenticated/{route,dashboard}
src/routes/api/public/telegram/{webhook,setup}.ts   Telegram webhook + setup endpoint
src/components/        AppShell, PhoneFrame, Logo, ArtistDashboard, AdminDashboard,
                       AvailabilitySearch, ArtistBot, TelegramSettings, ui/*
src/lib/               free-artists.ts (shared bot logic), telegram.server.ts,
                       telegram.functions.ts, calendar.ts, session.ts
supabase/migrations/   poora database schema + RLS + grants
src/assets/            logo
.env.example           env var naam (values Lovable Cloud khud bharta hai)
```

Note: `.env` jaan-bujh kar hataya gaya hai — naya project apna Cloud backend banata hai.
`TELEGRAM_BOT_TOKEN` naye project me dobara add karna padega.
