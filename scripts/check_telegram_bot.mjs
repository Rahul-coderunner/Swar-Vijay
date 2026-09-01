import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://xryusvsxrjivmsfdoaax.supabase.co";
const serviceKey = "sb_secret__YB6tpj4ciF5CGF50uzd8Q_G6JZD6zT";
const botToken = "8603250040:AAFwrpW6Xrpst7Onc5t94TPB_GABBtRfzTo";

const adminClient = createClient(supabaseUrl, serviceKey);

async function checkTelegramAndUsers() {
  console.log("1. Checking Telegram Bot Info...");
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const data = await res.json();
    console.log("Telegram Bot getMe:", data);
  } catch (e) {
    console.error("Telegram fetch error:", e);
  }

  console.log("2. Checking Admin Chat IDs or updates from Bot...");
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates`);
    const data = await res.json();
    console.log("Telegram Updates (recent messages):", JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Telegram updates error:", e);
  }

  console.log("3. Checking current users in Supabase...");
  const { data: { users } } = await adminClient.auth.admin.listUsers();
  for (const u of users) {
    console.log(`- ${u.email} (id: ${u.id}, confirmed: ${u.email_confirmed_at}, created_at: ${u.created_at})`);
  }
}

checkTelegramAndUsers();
