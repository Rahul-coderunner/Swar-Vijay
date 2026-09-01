import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://xryusvsxrjivmsfdoaax.supabase.co";
const serviceKey = "sb_secret__YB6tpj4ciF5CGF50uzd8Q_G6JZD6zT";
const adminClient = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

async function diagnose() {
  // 1. Check all auth users
  console.log("=== 1. ALL AUTH USERS ===");
  const { data: users, error: usersErr } = await adminClient.auth.admin.listUsers();
  if (usersErr) console.error("listUsers error:", usersErr);
  else {
    for (const u of users.users) {
      console.log(`  ${u.email} | confirmed: ${u.email_confirmed_at ? 'YES' : 'NO'} | created: ${u.created_at} | id: ${u.id}`);
    }
  }

  // 2. Check profiles table
  console.log("\n=== 2. ALL PROFILES ===");
  const { data: profiles } = await adminClient.from("profiles").select("*");
  for (const p of profiles || []) {
    console.log(`  ${p.email} | status: ${p.status} | role/cat: ${p.category} | id: ${p.id}`);
  }

  // 3. Check telegram_settings
  console.log("\n=== 3. TELEGRAM SETTINGS ===");
  const { data: tg } = await adminClient.from("telegram_settings").select("*");
  console.log(tg);

  // 4. Try to sign up a FRESH test user via Supabase to see the error
  console.log("\n=== 4. TEST SIGNUP (fresh email) ===");
  const testEmail = `test${Date.now()}@vijaybodkhe.tech`;
  const { data: signupData, error: signupErr } = await adminClient.auth.admin.generateLink({
    type: "signup",
    email: testEmail,
    password: "TestPass123!",
  });
  if (signupErr) console.error("generateLink error:", signupErr);
  else console.log("generateLink OK:", signupData?.properties?.email_otp);

  // 5. Try signup via normal client (not admin) to test SMTP sending
  console.log("\n=== 5. TEST CLIENT SIGNUP (triggers SMTP) ===");
  const publicClient = createClient(supabaseUrl, "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyeXVzdnN4cmppdm1zZmRvYWF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQ4NjUxNDcsImV4cCI6MjA0MDQ0MTE0N30.sb_publishable_FjBKtHYOrIeVomlqS4cwYQ_lG4845jy");
  const freshEmail = `testsmtp${Date.now()}@gmail.com`;
  console.log(`  Signing up: ${freshEmail}`);
  const { data: su, error: suErr } = await publicClient.auth.signUp({
    email: freshEmail,
    password: "TestSMTP123!",
  });
  if (suErr) console.error("  signUp error:", suErr);
  else console.log("  signUp result:", { id: su.user?.id, confirmationSentAt: su.user?.confirmation_sent_at, identities: su.user?.identities?.length });

  // 6. Check the writesmindcontent user specifically
  console.log("\n=== 6. writesmindcontent@gmail.com STATUS ===");
  const wmc = users?.users?.find(u => u.email === "writesmindcontent@gmail.com");
  if (wmc) {
    console.log("  ID:", wmc.id);
    console.log("  Email confirmed:", wmc.email_confirmed_at);
    console.log("  Created:", wmc.created_at);
    console.log("  Last sign in:", wmc.last_sign_in_at);
    console.log("  Raw metadata:", wmc.user_metadata);
  }
}

diagnose();
