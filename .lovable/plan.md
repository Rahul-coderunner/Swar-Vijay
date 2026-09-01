# Swar Vijay — Professional UI + OTP Signup + Approval Flow

## 1. Logo aur branding
- Aapka bheja hua naya logo app me lagega (header, landing, auth screens) aur favicon bhi wahi banega.
- Purana generated logo hata diya jayega.
- Theme colors wahi rahenge (maroon, gold, cream) — theme guide ke tokens already app me set hain, unhi ko consistently use karenge.

## 2. Poore app ka professional redesign
Same theme, better craft — har screen polish hogi:

- **Landing** — gold-on-maroon hero, logo prominent, teen roles (Artist / Kathakar / Admin) ka short intro, clean CTAs, neeche footer.
- **Auth (login / signup)** — cards, better spacing, clear role selection tiles Marathi labels ke saath, inline validation, password show/hide, loading states.
- **Artist dashboard** — calendar-first layout: khaali dates select karna, selected dates ki clean list, upcoming bookings section.
- **Kathakar dashboard** — search panel (date + category), result cards with artist name, category, contact button (call / WhatsApp), empty aur loading states.
- **Admin dashboard** — pending approvals ka clear queue with approve/reject actions, users list with status badges, bot settings section.
- Common: shared page header, status badges, empty states, skeleton loaders, toasts, mobile-first phone-width layout jo bada screen par bhi acha lage.

## 3. Email OTP signup
- Aapke domain ke liye email setup complete hoga (ek dialog aayega jisme aap domain daalenge).
- Signup par 6-digit OTP email jayega — branded template, Swar Vijay logo aur theme colors ke saath.
- Signup ke baad turant OTP screen khulegi (6-box input, resend timer, wrong-code error).
- OTP verify hone ke baad hi account active — verify na hone tak login block.

## 4. Admin approval flow
- Signup ke baad account `pending` rahega.
- OTP verify hone ke baad user ko "Admin approval baaki hai" wali waiting screen dikhegi.
- Agar pending user login kare — clear message: **"Aapka account admin approval ke baad hi chalu hoga."** aur session sign-out ho jayega (dashboard nahi khulega).
- Rejected / revoked accounts ko alag message milega.
- Admin approve kare to user next login par seedha apne dashboard me chala jayega.

## 5. Roles
Teen roles pehle se database me hain (artist, kathakar, admin) — inhe UI me clearly reflect karenge:
- Artist → dates select karta hai
- Kathakar → date + category se free artist dhundta hai, contact details milti hain
- Admin → approvals + settings

Bot (Telegram) se date + category ke hisab se artist puchhne wala flow already project me hai; usko approval/status ke saath align kar denge.

## Technical notes
- Email: `email_domain` setup dialog → `scaffold_auth_email_templates` → templates ko brand karna → OTP token (`{{ .Token }}`) template me.
- Client side: `supabase.auth.signUp` ke baad `supabase.auth.verifyOtp({ type: 'email' })` wali dedicated `/verify` route.
- Approval gate: `_authenticated` layout ke andar profile `status` check; pending/rejected par dedicated status screen, login handler me sign-out + message.
- Styling: sirf `src/styles.css` ke semantic tokens (`--maroon`, `--gold`, `--g-hero`, `--fd`/`--fb`/`--fdev`) — koi hardcoded color class nahi.
- Logo: `public/favicon.png` + `src/components/Logo.tsx` update.
