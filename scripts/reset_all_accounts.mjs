import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://xryusvsxrjivmsfdoaax.supabase.co";
const serviceKey = "sb_secret__YB6tpj4ciF5CGF50uzd8Q_G6JZD6zT";
const adminClient = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

async function resetAllAccounts() {
  console.log("=== STARTING FULL ACCOUNTS RESET ===");

  // 1. Get all users from Supabase Auth
  const { data: usersData, error: usersErr } = await adminClient.auth.admin.listUsers();
  if (usersErr) {
    console.error("Error listing users:", usersErr);
    return;
  }

  const users = usersData.users || [];
  console.log(`Found ${users.length} user(s) to clean up.`);

  for (const u of users) {
    console.log(`Deleting user: ${u.email} (${u.id})...`);
    // Delete profile, roles, availability
    await adminClient.from("artist_availability").delete().eq("artist_id", u.id);
    await adminClient.from("user_roles").delete().eq("user_id", u.id);
    await adminClient.from("profiles").delete().eq("id", u.id);
    // Delete from auth.users
    const { error: delErr } = await adminClient.auth.admin.deleteUser(u.id);
    if (delErr) console.error(`Failed to delete ${u.email}:`, delErr);
    else console.log(`Deleted ${u.email} successfully!`);
  }

  // 2. Clean any orphaned profiles or availability
  await adminClient.from("artist_availability").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await adminClient.from("profiles").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await adminClient.from("user_roles").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  console.log("\n=== RESET COMPLETE ===");
  console.log("Database is completely clean. All accounts reset!");
  
  // Verify telegram_settings is still preserved
  const { data: tg } = await adminClient.from("telegram_settings").select("*");
  console.log("Telegram Settings Preserved:", tg);
}

resetAllAccounts();
