import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://xryusvsxrjivmsfdoaax.supabase.co";
const serviceKey = "sb_secret__YB6tpj4ciF5CGF50uzd8Q_G6JZD6zT";
const publishableKey = "sb_publishable_FjBKtHYOrIeVomlqS4cwYQ_lG4845jy";

const adminClient = createClient(supabaseUrl, serviceKey);
const client = createClient(supabaseUrl, publishableKey);

async function run() {
  console.log("Checking existing users...");
  const { data: { users }, error: listErr } = await adminClient.auth.admin.listUsers();
  if (listErr) {
    console.error("List users error:", listErr);
    return;
  }
  console.log("Found users:", users.length);
  for (const u of users) {
    console.log(`- ${u.email} (id: ${u.id}, confirmed: ${u.email_confirmed_at})`);
  }

  const testEmail = "writesmindcontent@gmail.com";
  // Delete user if exists to do clean test
  const existing = users.find(u => u.email === testEmail);
  if (existing) {
    console.log("Deleting existing user:", existing.id);
    await adminClient.auth.admin.deleteUser(existing.id);
  }

  console.log("Testing client.auth.signUp with:", testEmail);
  const { data, error } = await client.auth.signUp({
    email: testEmail,
    password: "Password123!",
    options: {
      data: {
        full_name: "Test User",
        phone: "9876543210",
        role: "artist",
        category: "Keyboard"
      }
    }
  });

  if (error) {
    console.error("SignUp Error:", error);
  } else {
    console.log("SignUp Success:", data.user ? { id: data.user.id, email: data.user.email, identities: data.user.identities } : data);
  }
}

run();
