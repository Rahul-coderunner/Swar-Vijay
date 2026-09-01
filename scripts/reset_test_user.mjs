import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://xryusvsxrjivmsfdoaax.supabase.co";
const serviceKey = "sb_secret__YB6tpj4ciF5CGF50uzd8Q_G6JZD6zT";
const adminClient = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

async function resetTestUser() {
  console.log("1. Finding writesmindcontent@gmail.com user in Auth...");
  const { data: users } = await adminClient.auth.admin.listUsers();
  const target = users?.users?.find(u => u.email?.toLowerCase() === "writesmindcontent@gmail.com");

  if (target) {
    console.log(`Deleting existing user ${target.email} (${target.id}) so a fresh signup with OTP works...`);
    await adminClient.auth.admin.deleteUser(target.id);
    await adminClient.from("profiles").delete().eq("id", target.id);
    console.log("Deleted old test user successfully!");
  } else {
    console.log("User not found or already clean.");
  }
}

resetTestUser();
