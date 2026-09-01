import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://xryusvsxrjivmsfdoaax.supabase.co";
const serviceKey = "sb_secret__YB6tpj4ciF5CGF50uzd8Q_G6JZD6zT";
const adminClient = createClient(supabaseUrl, serviceKey);

async function checkStatus() {
  const { data: { users } } = await adminClient.auth.admin.listUsers();
  console.log("Users in Auth:");
  for (const u of users) {
    console.log(`- ${u.email} (id: ${u.id}, confirmed: ${u.email_confirmed_at})`);
  }

  const { data: profiles, error: pErr } = await adminClient.from("profiles").select("*");
  console.log("Profiles:", profiles);

  const { data: botSettings, error: bErr } = await adminClient.from("telegram_settings").select("*");
  console.log("Telegram Settings:", botSettings);
}

checkStatus();
