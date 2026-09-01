# 🎵 Swar Vijay Music Academy — Complete Project Architecture & AI Handoff Guide

This document is specifically crafted for any AI assistant or human developer taking over the development, design, and deployment of the **Swar Vijay Music Academy** web application and ecosystem.

---

## 📌 1. Project Overview & Core Business Logic

**Swar Vijay Music Academy** is a full-stack platform designed for classical musicians, Kathakars (narrators/organizers), and administrators to manage artist bookings, calendar availability, and automated Telegram-based verification workflows.

### 🎭 User Roles & Lifecycles:
1. **Artist (कलाकार)**:
   - Registers with Category: `Keyboard`, `Tabla`, `Octapad`, `Banjo`.
   - After email verification & admin approval, accesses a calendar dashboard to select/deselect dates when they are free for events.
2. **Kathakar (कथाकार)**:
   - Accesses an AI/Search interface to find available artists on specific dates by category or natural language query.
3. **Admin (प्रशासक)**:
   - Approves/rejects new registrations in real time via **Telegram Bot Inline Keyboard** or Admin web dashboard.
   - Can also unlock accounts via license keys (`SWAR-VIJAY-ADMIN-2026`, `SWARVIJAY2026`, `ADMIN2026`).

---

## 🛠️ 2. Tech Stack & Architecture

- **Frontend Framework**: [TanStack Start](https://tanstack.com/start) (Full-stack React with Vite SSR/SSG & file-based routing)
- **UI & Styling**: Tailwind CSS, Lucide React Icons, Sonner (Toasts)
- **Database & Auth**: Supabase (PostgreSQL + Supabase Auth GoTrue)
- **Email Delivery (SMTP)**: Resend API & SMTP (`smtp.resend.com:587`), sending from verified custom domain `otp@vijaybodkhe.tech`
- **Telegram Bot Engine**: Custom Node.js poller & TanStack Start Server Functions (`callTelegram` via Telegram Bot API)
- **Hosting & Infrastructure**: 
  - Hostinger Ubuntu 24.04 VPS (`200.234.41.249`)
  - Nginx Reverse Proxy with Let's Encrypt SSL (`https://vijaybodkhe.tech`)
  - Node.js & PM2 process manager running 2 services: `swar-vijay` (web app) and `telegram-bot` (long-polling worker)

---

## 🗄️ 3. Database Schema (Supabase PostgreSQL)

### 1. `profiles` Table
- `id` (UUID, PK, references `auth.users.id`)
- `full_name` (Text)
- `email` (Text)
- `phone` (Text)
- `bio` (Text, optional)
- `category` (Text: `Keyboard` | `Tabla` | `Octapad` | `Banjo`)
- `status` (Text: `'pending'` | `'approved'` | `'rejected'`)
- `license_key` (Text, optional)
- `created_at`, `updated_at` (Timestamps)

### 2. `user_roles` Table
- `id` (UUID, PK)
- `user_id` (UUID, references `auth.users.id`)
- `role` (Text: `'artist'` | `'kathakar'` | `'admin'`)

### 3. `artist_availability` Table
- `id` (UUID, PK)
- `artist_id` (UUID, references `profiles.id`)
- `available_date` (Date string `YYYY-MM-DD`)
- `notes` (Text, optional)
- `created_at` (Timestamp)

### 4. `telegram_settings` Table
- `id` (Text, PK = `'default'`)
- `bot_token` (Text)
- `bot_username` (Text, e.g. `'Swarvijay_bot'`)
- `admin_chat_id` (Text, e.g. `'6800916173'`)
- `updated_at` (Timestamp)

---

## 🔄 4. Complete End-to-End Workflow

### Flow A: Multi-Step Signup & OTP
1. User enters Role & Category -> fills Name, Email, Phone, Password.
2. `supabase.auth.signUp()` is triggered with metadata.
3. Supabase SMTP sends an **8-digit OTP** to the user's email via Resend (`otp@vijaybodkhe.tech`).
4. User enters OTP code -> `supabase.auth.verifyOtp({ email, token, type: 'signup' })` validates it.
5. User is redirected to `/dashboard`.

### Flow B: Admin Approval Gate (`GateScreen`)
1. User sees "Admin ki approval baaki hai" (`status: 'pending'`).
2. Client sends an instant notification to Admin's Telegram bot via `notifyAdminOfSignup`.
3. Admin receives interactive Telegram card with `[🟢 APPROVE ACCOUNT]` and `[🔴 REJECT]` inline buttons.
4. When Admin taps `🟢 APPROVE`:
   - Poller script updates `profiles.status = 'approved'`.
   - Dashboard frontend runs a 4-second React Query refetch interval (`qc.invalidateQueries({ queryKey: ["me", userId] })`).
   - The user's screen automatically unlocks and opens their Artist/Kathakar Dashboard **without requiring re-login**.

---

## 📂 5. Key File Directory

```
swar-vijay/
├── src/
│   ├── routes/
│   │   ├── __root.tsx                 # Root layout & providers
│   │   ├── auth.tsx                   # Multi-step signup wizard & 8-digit OTP verification
│   │   ├── _authenticated/
│   │   │   ├── dashboard.tsx          # Role-based dashboard + GateScreen pending handler
│   │   │   └── admin.tsx              # Admin management panel
│   │   └── api/public/telegram/       # Webhook endpoint fallback
│   ├── components/
│   │   ├── PhoneFrame.tsx             # Mobile container frame + CATEGORIES definitions
│   │   ├── ArtistDashboard.tsx        # Modern calendar date selector for artists
│   │   ├── AvailabilitySearch.tsx     # Kathakar search by date & category
│   │   └── ArtistBot.tsx              # AI query interface for free artists
│   ├── lib/
│   │   ├── calendar.ts                # Date formatting & month grid generation
│   │   ├── free-artists.ts            # NLP keyword parser for category & date matching
│   │   ├── session.ts                 # Session and role typing
│   │   ├── telegram.functions.ts      # TanStack Start server functions for Telegram
│   │   └── telegram.server.ts         # Direct Telegram Bot API caller
│   └── integrations/supabase/
│       ├── client.ts                  # Public Supabase browser client
│       ├── client.server.ts           # Service-role admin client
│       └── types.ts                   # Database TypeScript schema
├── scripts/
│   ├── telegram-bot.mjs               # Node.js background poller for inline Telegram buttons
│   ├── reset_all_accounts.mjs         # Utility script to clean/reset test accounts
│   └── send_pending_approvals.mjs     # Manual approval trigger utility
├── app.config.ts                      # TanStack Start config
├── vite.config.ts                     # Vite build configuration (allowedHosts, cors)
└── package.json                       # Dependencies and run scripts
```

---

## 🚀 6. How to Run & Deploy

### Local Development:
```bash
npm install
npm run dev
```

### Production Build & VPS Run (PM2):
```bash
npm run build
pm2 start node_modules/@tanstack/start/bin/start.js --name "swar-vijay" -- --port 3000
pm2 start scripts/telegram-bot.mjs --name "telegram-bot"
pm2 save
```

---

## 🎯 7. Roadmap / Tasks for the Next AI / Developer

1. **UI/UX Refinements**: Further enhance the mobile-first aesthetics of the Artist calendar and Kathakar booking requests.
2. **Push / WhatsApp Notifications**: Add WhatsApp/SMS alerts alongside Telegram bot.
3. **Multi-Admin Support**: Allow multiple admin chat IDs in `telegram_settings` array rather than a single `admin_chat_id`.
4. **Booking Conflicts Prevention**: Ensure artists cannot be double-booked on the same confirmed date.
